// Game state: whose turn it is, the position, the pieces each side has lost, whether the Coast
// is open, the Tail's repeat limit, what may be captured in passing, the counts behind the
// fifty-move and repetition draws, the moves played, and how the game ended. It supplies what
// legalMoves/gameStatus take as inputs (docs/RULES-FRAMEWORK.md, "Game state"). Immutable and
// deterministic: playMove returns a new state. Two players only; 3-player game end is not built.
import { applyMove, gameStatus, type GameStatus, type TurnOptions } from '../moves/check';
import {
  givesCheck,
  placedKey,
  squareTypes,
  toNotation,
  type GeneratedMove,
  type Lost,
  type MoveRules,
  type Passing,
  type Position,
  startPosition,
} from '../moves/generate';
import { NEUTRAL } from '../rules/formats';
import { RulesError, type ParamValue } from '../rules/loader';
import { nextSide, turnOrder } from './turns';

/** Square-type ids the Coast and Tail rules are written against (rules/boards/standard-9x9.json). */
const COAST = 'coast';
const CENTER = 'center';
const TING_YANG = 'ting-yang';

export type DrawReason = 'stalemate' | 'insufficient-material' | 'repetition' | 'fifty-move';

export type GameResult =
  | { status: 'ongoing' }
  | { status: 'win'; winner: string; loser: string; reason: 'checkmate' | 'stalemate' }
  | { status: 'draw'; reason: DrawReason };

/**
 * The positions since the last capture or irreversible move, newest first, as a chain each
 * state shares with the one before. Earlier positions can't come back, so the chain restarts.
 */
export interface Seen {
  key: string;
  prev: Seen | null;
}

/** A move as played: the side whose turn it was and the move's notation. */
export interface PlayedMove extends GeneratedMove {
  side: string;
  notation: string;
}

export interface GameState {
  /** The ruleset the game is played under, kept with the game. */
  ruleset: { id: string; version: string };
  rules: MoveRules;
  /** The seats in order of play, starting with the first mover. */
  order: string[];
  /** The side to move. */
  turn: string;
  position: Position;
  /** Side id to the piece types that side has lost. */
  lost: Lost;
  coastOpen: boolean;
  /** Side id to how many of its own latest turns in a row were Tail moves. */
  tailRun: Record<string, number>;
  /** The side that opened the Coast and has not yet had its next turn (the repeat-limit exception). */
  tailBonus: string | null;
  /** What the last move left open to capture in passing (en passant), if anything. */
  passing: Passing | null;
  /** Moves (plies) since the last capture or irreversible (pawn) move, for the fifty-move rule. */
  quiet: number;
  /** This position and the earlier ones that could repeat, for threefold repetition. */
  seen: Seen | null;
  moves: PlayedMove[];
  /** The side to move is in check. */
  inCheck: boolean;
  /** Squares of the pieces giving check. */
  checkers: string[];
  /** Legal moves of the side to move, including the Tail's when it may move; none once it is over. */
  legal: GeneratedMove[];
  result: GameResult;
}

/** Where a game starts when it is not the board's start position (tests, saved games). */
export interface GameInit {
  position?: Position;
  turn?: string;
  coastOpen?: boolean;
  lost?: Lost;
}

export interface GameRecord {
  ruleset: { id: string; version: string };
  players: number;
  turnOrder: string[];
  moves: string[];
  result: GameResult;
}

function param(rules: MoveRules, id: string): Exclude<ParamValue, null> {
  const v = rules.values[id];
  if (v === null || v === undefined) {
    throw new RulesError(`Parameter ${id} is missing or still undecided (null)`);
  }
  return v;
}

/** The pieces of one move that open the Coast: the Tail landing on the center square. */
function opensCoast(rules: MoveRules, coastOpen: boolean, move: GeneratedMove, mover: string) {
  if (coastOpen || mover !== NEUTRAL) return false;
  return (squareTypes(rules.board).get(move.to) ?? []).includes(CENTER);
}

type Dynamic = Pick<
  GameState,
  'position' | 'lost' | 'coastOpen' | 'tailRun' | 'tailBonus' | 'passing'
>;

/** What the engine's legalMoves needs to know about this game on `turn`. */
function turnOptions(rules: MoveRules, s: Dynamic, turn: string): TurnOptions {
  const types = squareTypes(rules.board);
  const has = (at: string, type: string) => (types.get(at) ?? []).includes(type);
  const hasTail = Object.values(s.position).some((p) => p.side === NEUTRAL);
  const limit = Number(param(rules, 'tail.repeatLimit'));
  const run = s.tailRun[turn] ?? 0;
  return {
    lost: s.lost,
    ...(s.passing && { passing: s.passing }),
    alsoMove: hasTail ? [NEUTRAL] : [],
    allow: (m, mover) => {
      if (mover !== NEUTRAL) return s.coastOpen || (!has(m.from, COAST) && !has(m.to, COAST));
      // A closed Coast is opened by the Tail landing on the center square, and by nothing else.
      if (!s.coastOpen && !has(m.to, CENTER)) return false;
      if (limit === 0 || run < limit) return true;
      // The repeat-limit exception: the opener's next Tail move, E5 to I5 (docs/RULES.md).
      return s.tailBonus === turn && has(m.from, CENTER) && has(m.to, TING_YANG);
    },
    ...(!s.coastOpen && {
      inert: (at: string) => has(at, COAST),
      lifts: (m: GeneratedMove, mover: string) => opensCoast(rules, s.coastOpen, m, mover),
    }),
  };
}

/** The options legalMoves takes for the side to move in this game (the Coast, the Tail). */
export const turnOptionsOf = (state: GameState): TurnOptions =>
  turnOptions(state.rules, state, state.turn);

function resultOf(status: GameStatus, order: readonly string[]): GameResult {
  if (status.result === 'ongoing') return { status: 'ongoing' };
  const loser = status.side;
  const other = order.find((s) => s !== loser)!;
  if (status.result === 'checkmate') {
    return { status: 'win', winner: other, loser, reason: 'checkmate' };
  }
  switch (status.stalemate) {
    case 'draw':
      return { status: 'draw', reason: 'stalemate' };
    case 'loss-for-stalemated':
      return { status: 'win', winner: other, loser, reason: 'stalemate' };
    case 'win-for-stalemated':
      return { status: 'win', winner: loser, loser: other, reason: 'stalemate' };
    default:
      throw new RulesError(`draw.stalemate = ${JSON.stringify(status.stalemate)} is not an option`);
  }
}

/**
 * Neither side can ever checkmate: no piece but a royal one could give check (the neutral Tail
 * never does by default). Provisional reading of "insufficient material, as in chess" (S22a):
 * chess's lone minor piece is not counted, because nobody has shown it can't mate on this board.
 */
function insufficientMaterial(rules: MoveRules, position: Position): boolean {
  return !Object.entries(position).some(
    ([at, p]) => rules.pieces[p.piece]?.royal !== true && givesCheck(rules, at, p),
  );
}

/**
 * What makes two positions the same for repetition: the pieces on their squares (with the
 * rights they carry), the side to move, the Coast, and the moves that side has, so a lost
 * capture in passing or a Tail that may no longer move makes a different position.
 */
function positionKey(rules: MoveRules, s: Dynamic & { turn: string }, legal: GeneratedMove[]) {
  const pieces = Object.keys(s.position)
    .sort()
    .map((at) => `${at}=${placedKey(rules, s.position[at]!)}`);
  return `${s.turn}|${s.coastOpen ? 'open' : 'closed'}|${pieces.join(',')}|${legal.map(toNotation).join(',')}`;
}

function occurrences(seen: Seen): number {
  let n = 0;
  for (let s: Seen | null = seen; s; s = s.prev) if (s.key === seen.key) n++;
  return n;
}

/** The draw rules, in order: insufficient material, threefold repetition, the fifty-move rule. */
function drawnBy(rules: MoveRules, base: Settled, seen: Seen | null): DrawReason | null {
  if (
    param(rules, 'draw.insufficientMaterial') === true &&
    insufficientMaterial(rules, base.position)
  ) {
    return 'insufficient-material';
  }
  if (seen && occurrences(seen) >= 3) return 'repetition';
  // "50 moves by each side": 50 turns of every seat (docs/RULES.md). Draws are automatic (S22a).
  if (param(rules, 'draw.fiftyMove') === true && base.quiet >= 50 * base.order.length) {
    return 'fifty-move';
  }
  return null;
}

type Settled = Omit<GameState, 'inCheck' | 'checkers' | 'legal' | 'result' | 'seen'>;

/**
 * Fill in what follows from the position and whose turn it is: check, legal moves, the
 * repetition record (continuing `prev`) and the result. Checkmate and stalemate come first.
 */
function settle(rules: MoveRules, base: Settled, prev: Seen | null): GameState {
  const status = gameStatus(rules, base.position, base.turn, turnOptions(rules, base, base.turn));
  const seen =
    param(rules, 'draw.threefoldRepetition') === true
      ? { key: positionKey(rules, base, status.legal), prev }
      : null;
  let result = resultOf(status, base.order);
  const drawn = result.status === 'ongoing' ? drawnBy(rules, base, seen) : null;
  if (drawn) result = { status: 'draw', reason: drawn };
  return {
    ...base,
    seen,
    inCheck: status.inCheck,
    checkers: status.checkers,
    legal: result.status === 'ongoing' ? status.legal : [],
    result,
  };
}

/**
 * Start a game. Refuses a ruleset with an undecided value and any player count but 2. The Coast
 * starts open only under `coast.2p.initiation = open-at-start`.
 */
export function newGame(
  rules: MoveRules,
  ruleset: { id: string; version: string },
  init: GameInit = {},
): GameState {
  if (rules.players !== 2) {
    throw new RulesError('Only 2-player games can be played yet (3-player game end is not built)');
  }
  const nulls = Object.keys(rules.values).filter((id) => rules.values[id] === null);
  if (nulls.length > 0) {
    throw new RulesError(`Ruleset ${ruleset.id} cannot start: undecided parameters`, nulls);
  }
  const order = turnOrder(rules);
  const turn = init.turn ?? order[0]!;
  if (!order.includes(turn)) throw new RulesError(`${turn} has no seat in this game`);
  const coastOpen = init.coastOpen ?? param(rules, 'coast.2p.initiation') === 'open-at-start';
  return settle(
    rules,
    {
      ruleset: { ...ruleset },
      rules,
      order,
      turn,
      position: init.position ?? startPosition(rules.board, 2),
      lost: init.lost ?? {},
      coastOpen,
      tailRun: {},
      tailBonus: null,
      passing: null,
      quiet: 0,
      moves: [],
    },
    null,
  );
}

const same = (a: GeneratedMove, b: GeneratedMove) =>
  a.piece === b.piece && toNotation(a) === toNotation(b);

/**
 * The legal move between two squares (with its promotion, if it has one), or none. Castling is
 * found by the partner's square instead of `to`, so it never hides the plain move to `to`.
 */
export function findMove(
  state: GameState,
  from: string,
  to: string,
  promotion?: string,
): GeneratedMove | undefined {
  return state.legal.find(
    (m) => m.from === from && (m.castle ? m.castle.from : m.to) === to && m.promotion === promotion,
  );
}

/** The state after a legal move. Refuses an illegal move and any move once the game is over. */
export function playMove(state: GameState, move: GeneratedMove): GameState {
  if (state.result.status !== 'ongoing') throw new RulesError('The game is over');
  const legal = state.legal.find((m) => same(m, move));
  if (!legal) throw new RulesError(`${toNotation(move)} is not a legal move for ${state.turn}`);

  const { rules, turn } = state;
  const placed = state.position[legal.from]!;
  const target = state.position[legal.captureAt ?? legal.to];
  const lost: Lost = Object.fromEntries(Object.entries(state.lost).map(([s, l]) => [s, [...l]]));
  if (target) (lost[target.side] ??= []).push(target.piece);
  if (legal.promotion !== undefined) {
    // A promotion gives back one lost piece of that type; nothing else changes (owner, S16 notes).
    const list = lost[turn];
    const at = list?.indexOf(legal.promotion) ?? -1;
    if (list && at >= 0) list.splice(at, 1);
    if (list && list.length === 0) delete lost[turn];
  }

  const opens = opensCoast(rules, state.coastOpen, legal, placed.side);
  const tailRun = {
    ...state.tailRun,
    [turn]: placed.side === NEUTRAL ? (state.tailRun[turn] ?? 0) + 1 : 0,
  };
  const played: PlayedMove = { ...legal, side: turn, notation: toNotation(legal) };
  // A capture or a move that can't be taken back: no earlier position can come back.
  const fresh = target !== undefined || rules.pieces[legal.piece]?.irreversible === true;
  return settle(
    rules,
    {
      ruleset: state.ruleset,
      rules,
      order: state.order,
      turn: nextSide(state.order, turn),
      position: applyMove(state.position, legal),
      lost,
      coastOpen: state.coastOpen || opens,
      tailRun,
      tailBonus: opens ? turn : state.tailBonus === turn ? null : state.tailBonus,
      passing: legal.passes ? { squares: legal.passes, at: legal.to } : null,
      quiet: fresh ? 0 : state.quiet + 1,
      moves: [...state.moves, played],
    },
    fresh ? null : state.seen,
  );
}

/** What is kept with a game: the ruleset id and version, the moves and the result. */
export function gameRecord(state: GameState): GameRecord {
  return {
    ruleset: { ...state.ruleset },
    players: state.rules.players,
    turnOrder: [...state.order],
    moves: state.moves.map((m) => m.notation),
    result: state.result,
  };
}

export interface UnbuiltFeature {
  id: string;
  label: string;
}

/**
 * Rules the ruleset has switched on that the game does not play yet, so a screen can say so
 * instead of silently playing without them. Each is an engine feature still to build.
 */
export function unbuiltFeatures(rules: MoveRules): UnbuiltFeature[] {
  const v = rules.values;
  const all: [UnbuiltFeature, boolean][] = [
    [{ id: 'queen.pawnSwap', label: 'Queen and pawn swap' }, v['queen.pawnSwap'] === true],
    [
      { id: 'setup.swapKingQueen', label: 'King and Queen swapped at the start' },
      v['setup.swapKingQueen'] === true,
    ],
  ];
  return all.filter(([, on]) => on).map(([f]) => f);
}
