// Game state: whose turn it is, the position, the pieces each side has lost, whether the Coast
// is open, the Tail's repeat limit, what may be captured in passing, the counts behind the
// fifty-move and repetition draws, the moves played, and how the game ended. It supplies what
// legalMoves/gameStatus take as inputs (docs/RULES-FRAMEWORK.md, "Game state"). Immutable and
// deterministic: playMove returns a new state. 3-player games (S56, decision 0016) also keep each
// seat's status; their check, checkmate, stones and game end are in three.ts.
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
import {
  activeKinged,
  checkersOn,
  drawSeats,
  outSeats,
  outcomeOf,
  outcomes,
  three,
  type GameEvent,
  type Seats,
} from './three';
import { nextSide, turnOrder } from './turns';

/** Square-type ids the Coast and Tail rules are written against (rules/boards/standard-9x9.json). */
const COAST = 'coast';
const CENTER = 'center';
const TING_YANG = 'ting-yang';

export type DrawReason = 'stalemate' | 'insufficient-material' | 'repetition' | 'fifty-move';

/**
 * How a game is won: on the board, or by the loser's resignation (S51, D51). 3-player games
 * (decision 0016) add the Dragon capturing the last King, a Kinged player capturing both Dragon
 * Heads, the Sun and the Moon in the duel, and a King left in check for an earlier seat under
 * `check.3p.exposedKing` = counts-as-checkmate. A checkmated Tail is a checkmate of the Dragon.
 */
export type WinReason =
  'checkmate' | 'stalemate' | 'resignation' | 'king-capture' | 'dragon-captured' | 'exposed-king';

/**
 * The end of a game. In a 3-player win, `loser` is the seat the deciding move beat (the King or
 * Tail checkmated or captured, or the Dragon); a 3-player draw names the seats that share it.
 */
export type GameResult =
  | { status: 'ongoing' }
  | { status: 'win'; winner: string; loser: string; reason: WinReason }
  | { status: 'draw'; reason: DrawReason | 'agreement'; between?: string[] };

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
  /** 3-player games: what the move did besides moving (a King captured, the Tail in stone). */
  events?: GameEvent[];
}

/**
 * The ruleset a game is played under. A custom ruleset (one that is not in rules/rulesets/) also
 * carries its full overrides, so the game can be replayed without the ruleset being on file.
 */
export interface RulesetRef {
  id: string;
  version: string;
  overrides?: Readonly<Record<string, ParamValue>>;
}

export interface GameState {
  /** The ruleset the game is played under, kept with the game. */
  ruleset: RulesetRef;
  rules: MoveRules;
  /** The seats in order of play, starting with the first mover. */
  order: string[];
  /** The side to move. */
  turn: string;
  /** Each seat's status: all active in 2-player games (3-player: three.ts, SeatStatus). */
  seats: Seats;
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
  /** 3-player games: the seats' statuses (all active by default). */
  seats?: Seats;
  coastOpen?: boolean;
  lost?: Lost;
}

export interface GameRecord {
  ruleset: RulesetRef;
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
    ([at, p]) =>
      p.stone !== true && rules.pieces[p.piece]?.royal !== true && givesCheck(rules, at, p),
  );
}

/**
 * What makes two positions the same for repetition: the pieces on their squares (with the
 * rights they carry), the side to move, the Coast, and the moves that side has, so a lost
 * capture in passing or a Tail that may no longer move makes a different position.
 */
function positionKey(
  rules: MoveRules,
  s: Dynamic & { turn: string; seats: Seats },
  legal: GeneratedMove[],
) {
  const pieces = Object.keys(s.position)
    .sort()
    .map((at) => `${at}=${placedKey(rules, s.position[at]!)}`);
  // 3-player games: the seats' statuses too (decision 0016, rule 13). Stones are in placedKey.
  const seats = rules.players === 3 ? `|${seatsKey(s.seats)}` : '';
  return `${s.turn}|${s.coastOpen ? 'open' : 'closed'}${seats}|${pieces.join(',')}|${legal.map(toNotation).join(',')}`;
}

const seatsKey = (seats: Seats) =>
  Object.keys(seats)
    .sort()
    .map((side) => `${side}:${seats[side]}`)
    .join(',');

/**
 * Everything the rest of the game depends on apart from the moves that led here: the facts of
 * positionKey plus the pieces each side has lost (promotions), the Tail's runs and the Coast
 * opener's bonus, and what may be captured in passing. Two states with the same key, no earlier
 * position that could repeat and no quiet moves counted play out the same (the search's
 * transposition table, S35).
 */
export function stateKey(state: GameState): string {
  const position = state.seen?.key ?? positionKey(state.rules, state, state.legal);
  const lost = Object.keys(state.lost)
    .sort()
    .map((side) => `${side}:${[...state.lost[side]!].sort().join('+')}`);
  const runs = Object.keys(state.tailRun)
    .sort()
    .map((side) => `${side}:${state.tailRun[side]}`);
  const passing = state.passing ? `${state.passing.squares.join('+')}>${state.passing.at}` : '';
  const seats = state.rules.players === 3 ? `|${seatsKey(state.seats)}` : '';
  return `${position}|${lost.join(',')}|${runs.join(',')}|${state.tailBonus ?? ''}|${passing}${seats}`;
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
 * The 3-player draws (decision 0016, rules 12 to 17), in order: insufficient material once the
 * Dragon is out, threefold repetition, and the fifty-move rule: 50 turns of every seat still in
 * the game. A skipped turn (rule 15) counts as a turn (provisional reading, S56).
 */
function drawnThree(rules: MoveRules, base: Settled, seen: Seen | null): DrawReason | null {
  const g = three(rules, base.order);
  if (base.seats[g.dragon] === 'out' && insufficientMaterial(rules, base.position)) {
    return 'insufficient-material';
  }
  if (seen && occurrences(seen) >= 3) return 'repetition';
  const seats = base.order.length - outSeats(base.seats).length;
  if (param(rules, 'draw.3p.fiftyMove') === true && base.quiet >= 50 * seats) return 'fifty-move';
  return null;
}

/**
 * settle for 3-player games: the side to move's legal moves (three.ts), its turn skipped when the
 * Dragon has no legal move with both Kings on the board (rule 15), and the result. Checkmates are
 * judged right after the move that gives them (rule 7), so `ended` carries a move's own result; no
 * legal move at the start of a turn is a stalemate, a draw between the seats of rules 12, 16, 17.
 */
function settleThree(
  rules: MoveRules,
  base: Settled,
  prev: Seen | null,
  ended: GameResult | null = null,
): GameState {
  const g = three(rules, base.order);
  let b = base;
  for (;;) {
    const table = { position: b.position, seats: b.seats, lost: b.lost, passing: b.passing };
    const checkers = checkersOn(g, b.position, b.seats, b.turn);
    const found = ended ? [] : outcomes(g, table, b.turn);
    const skip =
      !ended &&
      found.length === 0 &&
      checkers.length === 0 &&
      b.turn === g.dragon &&
      !g.mode.firstMate &&
      activeKinged(g, b.seats).length === 2;
    if (skip) {
      const last = b.moves.at(-1);
      const event: GameEvent = { kind: 'turn-skipped', side: b.turn };
      const moves = last
        ? [...b.moves.slice(0, -1), { ...last, events: [...(last.events ?? []), event] }]
        : b.moves;
      const turn = nextSide(b.order, b.turn, outSeats(b.seats));
      b = { ...b, moves, turn, passing: null, quiet: b.quiet + 1 };
      continue;
    }
    const legal = found.map((o) => o.move);
    const seen =
      param(rules, 'draw.3p.threefoldRepetition') === true
        ? { key: positionKey(rules, b, legal), prev }
        : null;
    let result: GameResult = ended ?? { status: 'ongoing' };
    if (!ended && legal.length === 0) {
      if (param(rules, 'draw.3p.stalemate') !== 'draw-between-kinged') {
        throw new RulesError(
          `draw.3p.stalemate = ${JSON.stringify(rules.values['draw.3p.stalemate'])} is not an option`,
        );
      }
      result = { status: 'draw', reason: 'stalemate', between: drawSeats(g, b.seats) };
    }
    const drawn = result.status === 'ongoing' ? drawnThree(rules, b, seen) : null;
    if (drawn) result = { status: 'draw', reason: drawn, between: drawSeats(g, b.seats) };
    return {
      ...b,
      seen,
      inCheck: checkers.length > 0,
      checkers,
      legal: result.status === 'ongoing' ? legal : [],
      result,
    };
  }
}

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

const copyRef = (r: RulesetRef): RulesetRef => ({
  ...r,
  ...(r.overrides && { overrides: { ...r.overrides } }),
});

/**
 * Start a game. Refuses a ruleset with an undecided value. In 2-player games the Coast starts open
 * only under `coast.2p.initiation = open-at-start` or `coast.openToAll` (D44); 3-player games have
 * no closed Coast.
 */
export function newGame(rules: MoveRules, ruleset: RulesetRef, init: GameInit = {}): GameState {
  const nulls = Object.keys(rules.values).filter((id) => rules.values[id] === null);
  if (nulls.length > 0) {
    throw new RulesError(`Ruleset ${ruleset.id} cannot start: undecided parameters`, nulls);
  }
  const order = turnOrder(rules);
  const turn = init.turn ?? order[0]!;
  if (!order.includes(turn)) throw new RulesError(`${turn} has no seat in this game`);
  const seats: Seats = init.seats ?? Object.fromEntries(order.map((s) => [s, 'active']));
  if (rules.players === 3) {
    three(rules, order);
    return settleThree(
      rules,
      {
        ruleset: copyRef(ruleset),
        rules,
        order,
        turn,
        seats,
        position: init.position ?? startPosition(rules.board, 3),
        lost: init.lost ?? {},
        coastOpen: true,
        tailRun: {},
        tailBonus: null,
        passing: null,
        quiet: 0,
        moves: [],
      },
      null,
    );
  }
  const coastOpen =
    init.coastOpen ??
    (param(rules, 'coast.2p.initiation') === 'open-at-start' ||
      param(rules, 'coast.openToAll') === true);
  return settle(
    rules,
    {
      ruleset: copyRef(ruleset),
      rules,
      order,
      turn,
      seats,
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
  if (state.rules.players === 3) return playThree(state, legal);

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
      seats: state.seats,
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

/** playMove in a 3-player game: the move's outcome (three.ts), then the next turn. */
function playThree(state: GameState, legal: GeneratedMove): GameState {
  const { rules, turn } = state;
  const g = three(rules, state.order);
  const table = {
    position: state.position,
    seats: state.seats,
    lost: state.lost,
    passing: state.passing,
  };
  const o = outcomeOf(g, table, turn, legal);
  if (!o) throw new RulesError(`${toNotation(legal)} is not a legal move for ${turn}`);
  const target = state.position[legal.captureAt ?? legal.to];
  const played: PlayedMove = {
    ...o.move,
    side: turn,
    notation: toNotation(o.move),
    ...(o.events.length > 0 && { events: o.events }),
  };
  // A capture, a pawn move, a King captured or a piece turned to stone: nothing earlier comes back.
  const fresh =
    target !== undefined || rules.pieces[legal.piece]?.irreversible === true || o.events.length > 0;
  return settleThree(
    rules,
    {
      ruleset: state.ruleset,
      rules,
      order: state.order,
      turn: nextSide(state.order, turn, outSeats(o.seats)),
      seats: o.seats,
      position: o.position,
      lost: o.lost,
      coastOpen: state.coastOpen,
      tailRun: state.tailRun,
      tailBonus: null,
      passing: legal.passes ? { squares: legal.passes, at: legal.to } : null,
      quiet: fresh ? 0 : state.quiet + 1,
      moves: [...state.moves, played],
    },
    fresh ? null : state.seen,
    o.result,
  );
}

/** The game ended without a move: the position stays, nothing more may be played. */
function ended(state: GameState, result: GameResult): GameState {
  if (state.result.status !== 'ongoing') throw new RulesError('The game is over');
  // Decision 0016 gives no rule for resigning or agreeing a draw with three seats.
  if (state.rules.players !== 2) {
    throw new RulesError('Resigning and agreed draws are 2-player only so far');
  }
  return { ...state, legal: [], result };
}

/**
 * The game after `side` resigns: the other seat wins. A seat may resign on either seat's turn.
 * Two players only, like the rest of game end.
 */
export function resign(state: GameState, side: string): GameState {
  if (!state.order.includes(side)) throw new RulesError(`${side} has no seat in this game`);
  const winner = state.order.find((s) => s !== side)!;
  return ended(state, { status: 'win', winner, loser: side, reason: 'resignation' });
}

/** The game after both seats agree to a draw. */
export const agreeDraw = (state: GameState): GameState =>
  ended(state, { status: 'draw', reason: 'agreement' });

/**
 * A replayed game with a recorded result that no move gives: a resignation by one of its seats,
 * or a draw by agreement. Null when the game is already over or the result is not one of those,
 * so a record cannot claim either for a game that ended on the board.
 */
export function endedBy(state: GameState, result: GameResult): GameState | null {
  if (state.result.status !== 'ongoing' || state.rules.players !== 2) return null;
  if (result.status === 'win' && result.reason === 'resignation') {
    if (!state.order.includes(result.loser)) return null;
    const ended = resign(state, result.loser);
    return ended.result.status === 'win' && ended.result.winner === result.winner ? ended : null;
  }
  if (result.status === 'draw' && result.reason === 'agreement') return agreeDraw(state);
  return null;
}

/** What is kept with a game: the ruleset id and version, the moves and the result. */
export function gameRecord(state: GameState): GameRecord {
  return {
    ruleset: copyRef(state.ruleset),
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
    [{ id: 'coast.3p.exit', label: "Coast pieces' first way out through A5" }, rules.players === 3],
  ];
  return all.filter(([, on]) => on).map(([f]) => f);
}
