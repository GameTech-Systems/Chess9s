// Game state: whose turn it is, the position, the pieces each side has lost, whether the Coast
// is open, the Tail's repeat limit, the moves played, and how the game ended. It supplies what
// legalMoves/gameStatus take as inputs (docs/RULES-FRAMEWORK.md, "Game state"). Immutable and
// deterministic: playMove returns a new state. Two players only; 3-player game end is not built.
import { applyMove, gameStatus, type GameStatus, type TurnOptions } from '../moves/check';
import {
  squareTypes,
  toNotation,
  type GeneratedMove,
  type Lost,
  type MoveRules,
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

export type GameResult =
  | { status: 'ongoing' }
  | { status: 'win'; winner: string; loser: string; reason: 'checkmate' | 'stalemate' }
  | { status: 'draw'; reason: 'stalemate' };

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
  moves: PlayedMove[];
  /** The side to move is in check. */
  inCheck: boolean;
  /** Squares of the pieces giving check. */
  checkers: string[];
  /** Legal moves of the side to move, including the Tail's when it may move. */
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

type Dynamic = Pick<GameState, 'position' | 'lost' | 'coastOpen' | 'tailRun' | 'tailBonus'>;

/** What the engine's legalMoves needs to know about this game on `turn`. */
function turnOptions(rules: MoveRules, s: Dynamic, turn: string): TurnOptions {
  const types = squareTypes(rules.board);
  const has = (at: string, type: string) => (types.get(at) ?? []).includes(type);
  const hasTail = Object.values(s.position).some((p) => p.side === NEUTRAL);
  const limit = Number(param(rules, 'tail.repeatLimit'));
  const run = s.tailRun[turn] ?? 0;
  return {
    lost: s.lost,
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

/** Fill in what follows from the position and whose turn it is: check, legal moves, result. */
function settle(
  rules: MoveRules,
  base: Omit<GameState, 'inCheck' | 'checkers' | 'legal' | 'result'>,
): GameState {
  const status = gameStatus(rules, base.position, base.turn, turnOptions(rules, base, base.turn));
  return {
    ...base,
    inCheck: status.inCheck,
    checkers: status.checkers,
    legal: status.legal,
    result: resultOf(status, base.order),
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
  return settle(rules, {
    ruleset: { ...ruleset },
    rules,
    order,
    turn,
    position: init.position ?? startPosition(rules.board, 2),
    lost: init.lost ?? {},
    coastOpen,
    tailRun: {},
    tailBonus: null,
    moves: [],
  });
}

const same = (a: GeneratedMove, b: GeneratedMove) =>
  a.from === b.from && a.to === b.to && a.piece === b.piece && a.promotion === b.promotion;

/** The legal move between two squares (with its promotion, if it has one), or none. */
export function findMove(
  state: GameState,
  from: string,
  to: string,
  promotion?: string,
): GeneratedMove | undefined {
  return state.legal.find((m) => m.from === from && m.to === to && m.promotion === promotion);
}

/** The state after a legal move. Refuses an illegal move and any move once the game is over. */
export function playMove(state: GameState, move: GeneratedMove): GameState {
  if (state.result.status !== 'ongoing') throw new RulesError('The game is over');
  const legal = state.legal.find((m) => same(m, move));
  if (!legal) throw new RulesError(`${toNotation(move)} is not a legal move for ${state.turn}`);

  const { rules, turn } = state;
  const placed = state.position[legal.from]!;
  const target = state.position[legal.to];
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
  return settle(rules, {
    ruleset: state.ruleset,
    rules,
    order: state.order,
    turn: nextSide(state.order, turn),
    position: applyMove(state.position, legal),
    lost,
    coastOpen: state.coastOpen || opens,
    tailRun,
    tailBonus: opens ? turn : state.tailBonus === turn ? null : state.tailBonus,
    moves: [...state.moves, played],
  });
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
    [{ id: 'en-passant', label: 'En passant' }, true],
    [{ id: 'castling.enabled', label: 'Castling' }, v['castling.enabled'] === true],
    [{ id: 'queen.pawnSwap', label: 'Queen and pawn swap' }, v['queen.pawnSwap'] === true],
    [
      { id: 'pawn.safeZones', label: 'Pawn-safe zones' },
      v['pawn.safeZones'] !== undefined && v['pawn.safeZones'] !== 'off',
    ],
    [
      { id: 'coast.2p.exit', label: 'Leaving the Coast by A5 only' },
      v['coast.2p.exit'] === 'a5-only',
    ],
    [
      { id: 'coast.2p.capturable', label: 'No capture on the Coast' },
      v['coast.2p.capturable'] === false,
    ],
    [
      { id: 'setup.swapKingQueen', label: 'King and Queen swapped at the start' },
      v['setup.swapKingQueen'] === true,
    ],
    [
      { id: 'draw.threefoldRepetition', label: 'Draw by threefold repetition' },
      v['draw.threefoldRepetition'] === true,
    ],
    [{ id: 'draw.fiftyMove', label: 'Draw by the fifty-move rule' }, v['draw.fiftyMove'] === true],
    [
      { id: 'draw.insufficientMaterial', label: 'Draw by insufficient material' },
      v['draw.insufficientMaterial'] === true,
    ],
  ];
  return all.filter(([, on]) => on).map(([f]) => f);
}
