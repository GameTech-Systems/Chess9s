// What a click does in a hot-seat game: select a piece, show its legal moves, play one, ask
// for a promotion piece. Pure functions over a model; React only draws it. The engine decides
// every rule (legal moves, check, game end); nothing here knows how a piece moves.
import {
  TAIL,
  attackMap,
  checkersOn,
  newGame,
  playMove,
  flagFall,
  resign,
  resumeClock,
  three,
  timeLeft,
  timeOut,
  type GameState,
  type GeneratedMove,
  type MoveRules,
  type TimeControl,
} from '@chess9s/engine';
import type { Highlights } from '../board/view';
import { createRules, ruleset, type RulesetInfo } from './rules';
import {
  beginTimed,
  timedAfterLeave,
  timedAfterMove,
  timedFlag,
  timedPause,
  type Timed,
} from './timed';

export interface Promoting {
  from: string;
  to: string;
  /** The pieces the pawn may become. */
  choices: string[];
}

/** One answer to a question a move asks. */
export interface Choice {
  value: string;
  /** What the player reads on the button. */
  label: string;
}

/**
 * A 3-player move that asks more than the promotion (decision 0016): which of two or more
 * pieces checkmating the Tail is the one that swaps with it (rule 8), and what a pawn swapped
 * onto its last rank becomes (rule 9). Chosen like a promotion piece, as part of the move.
 */
export interface Choosing {
  from: string;
  to: string;
  kind: 'mate' | 'swap';
  choices: Choice[];
  /** What was already chosen for this move. */
  picked: Picked;
}

interface Picked {
  promotion?: string;
  mateBy?: string;
  swapPromotion?: string;
}

export interface Model {
  game: GameState;
  /** The square of the piece whose moves are shown. */
  selected: string | null;
  /** A promotion waiting for the player to pick a piece. */
  promoting: Promoting | null;
  /** A 3-player checkmate choice waiting for an answer, after any promotion. */
  choosing: Choosing | null;
  /** Earlier states of this game, oldest first; undo pops the last. */
  history: GameState[];
  /** Play aid: show the selected piece's legal moves (on by default). */
  showMoves: boolean;
  /** Play aid: mark the side to move's pieces that the other side attacks (off by default, provisional). */
  showDanger: boolean;
  /** The clock, when a time control was chosen (S65); null for an untimed game. */
  timed: Timed | null;
}

export const fromGame = (game: GameState, timed: Timed | null = null): Model => ({
  game,
  selected: null,
  promoting: null,
  choosing: null,
  history: [],
  showMoves: true,
  showDanger: false,
  timed,
});

export function newModel(
  rules: MoveRules = createRules(),
  info: Pick<RulesetInfo, 'id' | 'version' | 'overrides'> = ruleset,
): Model {
  const { id, version, overrides } = info;
  return fromGame(newGame(rules, { id, version, ...(overrides && { overrides }) }));
}

const movesFrom = (game: GameState, from: string): GeneratedMove[] =>
  game.legal.filter((m) => m.from === from);

/** The square a move is chosen by: its to-square, or for castling the partner's (King onto Rook). */
const pickedAt = (m: GeneratedMove): string => m.castle?.from ?? m.to;

const cleared = { selected: null, promoting: null, choosing: null } as const;

/** The game after `side` ran out of time (D66), with the clock told. */
function timeOutFor(model: Model, side: string, now: number): Model {
  const game = timeOut(model.game, side);
  return {
    ...model,
    ...cleared,
    game,
    history: [...model.history, model.game],
    ...(model.timed && { timed: timedAfterLeave(model.timed, side, game, now) }),
  };
}

/**
 * A move played at `now`. Against a running clock a move that comes after the time ran out is a
 * flag fall instead, as at a board; while the clock is paused no move is played.
 */
const played = (model: Model, move: GeneratedMove, now = Date.now()): Model => {
  const { timed } = model;
  const mover = model.game.turn;
  if (timed && !timed.showOnly && flagFall(timed.clock, now) === mover) {
    return timeOutFor(model, mover, now);
  }
  if (isPaused(model)) return model;
  const game = playMove(model.game, move);
  return {
    ...model,
    ...cleared,
    game,
    history: [...model.history, model.game],
    ...(timed && { timed: timedAfterMove(timed, mover, game, now) }),
  };
};

/** A move chosen outside the board (the computer's), recorded like a click-made one. */
export const playFor = played;

/** A seat resigns a 3-player game (decision 0018); undo takes it back like a move. */
export const resignFor = (model: Model, side: string, now = Date.now()): Model => {
  const game = resign(model.game, side);
  return {
    ...model,
    ...cleared,
    game,
    history: [...model.history, model.game],
    ...(model.timed && { timed: timedAfterLeave(model.timed, side, game, now) }),
  };
};

/** Undo is off while a clock is on (decision 0017). */
export const canUndo = (model: Model): boolean => model.history.length > 0 && !model.timed;

/** Take back the last move (hot-seat only; online play will not offer it). */
export function undo(model: Model): Model {
  const game = model.history.at(-1);
  if (!game || model.timed) return model;
  return {
    ...model,
    ...cleared,
    game,
    history: model.history.slice(0, -1),
  };
}

/** The clock is stopped by the Pause button (and a saved game comes back that way). */
export const isPaused = ({ timed, game }: Model): boolean =>
  timed !== null && timed.clock.since === null && game.result.status === 'ongoing';

/**
 * Choose a time control for a game that has not begun: its clock starts running the seat to move
 * from `now` (decision 0017). An untimed control, or a game with a move in it, changes nothing
 * but removing the clock of a game that has not begun.
 */
export function startTimed(
  model: Model,
  control: TimeControl,
  showOnly: boolean,
  now = Date.now(),
): Model {
  const { game } = model;
  if (game.moves.length > 0 || game.resignations.length > 0 || game.result.status !== 'ongoing') {
    return model;
  }
  return { ...model, timed: beginTimed(control, showOnly, game, now) };
}

export const pauseTimed = (model: Model, now = Date.now()): Model =>
  model.timed && !isPaused(model) && model.game.result.status === 'ongoing'
    ? { ...model, timed: timedPause(model.timed, now) }
    : model;

export const resumeTimed = (model: Model, now = Date.now()): Model =>
  model.timed && isPaused(model)
    ? { ...model, timed: { ...model.timed, clock: resumeClock(model.timed.clock, now) } }
    : model;

/**
 * Time passes: the seat whose time is up runs out (D66), or with Show only is shown as out of
 * time and play goes on. The same model comes back when nothing changed.
 */
export function tick(model: Model, now = Date.now()): Model {
  let m = model;
  for (let i = 0; i < m.game.order.length; i++) {
    const { timed } = m;
    const side = timed && m.game.result.status === 'ongoing' ? flagFall(timed.clock, now) : null;
    if (!timed || !side) break;
    m = timed.showOnly ? { ...m, timed: timedFlag(timed, side) } : timeOutFor(m, side, now);
  }
  return m;
}

export interface ClockLine {
  side: string;
  /** Time left in milliseconds. */
  ms: number;
  /** The seat's clock is running. */
  running: boolean;
  /** Out of time, and play goes on (Show only). */
  flagged: boolean;
  /** Out of the game: its clock stopped. */
  out: boolean;
}

/** Each seat's clock at `now`, in turn order; none for an untimed game. */
export function clockLines({ timed, game }: Model, now = Date.now()): ClockLine[] {
  if (!timed) return [];
  const { clock } = timed;
  return game.order.map((side) => {
    const flagged = clock.flagged.includes(side);
    const out = clock.out.includes(side);
    return {
      side,
      ms: timeLeft(clock, side, now),
      running: clock.since !== null && clock.turn === side && !flagged && !out,
      flagged,
      out,
    };
  });
}

export const toggleMoves = (model: Model): Model => ({ ...model, showMoves: !model.showMoves });
export const toggleDanger = (model: Model): Model => ({ ...model, showDanger: !model.showDanger });

const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

/**
 * Play the move from `from` to `to` once everything it asks is answered, else ask the next
 * question: the promotion piece, then the checkmating piece, then the swap promotion.
 */
function ask(model: Model, from: string, to: string, picked: Picked, now: number): Model {
  const { game } = model;
  const moves = movesFrom(game, from).filter(
    (m) =>
      pickedAt(m) === to &&
      (picked.promotion === undefined || m.promotion === picked.promotion) &&
      (picked.mateBy === undefined || m.mateBy === picked.mateBy) &&
      (picked.swapPromotion === undefined || m.swapPromotion === picked.swapPromotion),
  );
  if (moves.length === 0) return { ...model, selected: null, promoting: null, choosing: null };
  if (picked.promotion === undefined && moves.some((m) => m.promotion !== undefined)) {
    const choices = unique(moves.flatMap((m) => m.promotion ?? []));
    return { ...model, promoting: { from, to, choices }, choosing: null };
  }
  const pieceAt = (at: string) => game.position[at]?.piece.replace(/-/g, ' ') ?? 'piece';
  if (picked.mateBy === undefined && moves.some((m) => m.mateBy !== undefined)) {
    const choices = unique(moves.flatMap((m) => m.mateBy ?? [])).map((at) => ({
      value: at,
      label: `${at} ${pieceAt(at)}`,
    }));
    return { ...model, promoting: null, choosing: { from, to, kind: 'mate', choices, picked } };
  }
  if (picked.swapPromotion === undefined && moves.some((m) => m.swapPromotion !== undefined)) {
    const choices = unique(moves.flatMap((m) => m.swapPromotion ?? [])).map((piece) => ({
      value: piece,
      label: piece,
    }));
    return { ...model, promoting: null, choosing: { from, to, kind: 'swap', choices, picked } };
  }
  return played(model, moves[0]!, now);
}

/** A click on a square: play a shown move, or select the piece standing there, or clear. */
export function click(model: Model, at: string, now = Date.now()): Model {
  const { game, selected } = model;
  if (game.result.status !== 'ongoing' || model.promoting || model.choosing) return model;
  if (isPaused(model)) return model;

  if (selected && at !== selected) {
    if (movesFrom(game, selected).some((m) => pickedAt(m) === at)) {
      return ask(model, selected, at, {}, now);
    }
  }
  if (at !== selected && movesFrom(game, at).length > 0) return { ...model, selected: at };
  return { ...model, selected: null };
}

/** The player picked a promotion piece. A piece that is not a choice changes nothing. */
export function promote(model: Model, piece: string, now = Date.now()): Model {
  const { promoting } = model;
  if (!promoting?.choices.includes(piece)) return model;
  return ask(model, promoting.from, promoting.to, { promotion: piece }, now);
}

/** The player answered a 3-player checkmate question. An answer that is not a choice changes nothing. */
export function choose(model: Model, value: string, now = Date.now()): Model {
  const { choosing } = model;
  if (!choosing?.choices.some((c) => c.value === value)) return model;
  const { from, to, kind, picked } = choosing;
  return ask(
    model,
    from,
    to,
    kind === 'mate' ? { ...picked, mateBy: value } : { ...picked, swapPromotion: value },
    now,
  );
}

/** Drop the move that is waiting for a promotion piece or a checkmate choice. */
export const cancelPromotion = (model: Model): Model =>
  model.promoting || model.choosing
    ? { ...model, selected: null, promoting: null, choosing: null }
    : model;

/** Squares of the side to move's pieces that any other side attacks. */
function endangered(game: GameState): string[] {
  const threatened = new Set(
    [...new Set(Object.values(game.position).map((p) => p.side))]
      .filter((side) => side !== game.turn)
      .flatMap((side) => attackMap(game.rules, game.position, side)),
  );
  return Object.entries(game.position)
    .filter(([at, p]) => p.side === game.turn && threatened.has(at))
    .map(([at]) => at)
    .sort();
}

/**
 * Squares of a side's royal pieces: its King, or in a 3-player game the Dragon's Tail while it
 * is not stone (the Tail plays the role of the Dragon's King, rule 4). A stone is never royal.
 */
export function royalSquares(game: GameState, side: string): string[] {
  const tailSide = game.rules.players === 3 ? three(game.rules, game.order).dragon : undefined;
  return Object.entries(game.position)
    .filter(
      ([, p]) =>
        p.side === side &&
        p.stone !== true &&
        (game.rules.pieces[p.piece]?.royal === true || (side === tailSide && p.piece === TAIL)),
    )
    .map(([at]) => at);
}

/**
 * 3-player danger aid: the Kings of the Kinged players that a Dragon piece attacks without it
 * being check (decision 0016 rule 2): the Dragon may capture one on its turn. Any active
 * Kinged player's King is shown, not only that of the side to move.
 */
function exposedKings(game: GameState): string[] {
  if (game.rules.players !== 3) return [];
  const g = three(game.rules, game.order);
  const attacked = new Set(attackMap(game.rules, game.position, g.dragon));
  return g.kinged
    .filter(
      (side) =>
        game.seats[side] === 'active' &&
        checkersOn(g, game.position, game.seats, side, [g.dragon]).length === 0,
    )
    .flatMap((side) => royalSquares(game, side))
    .filter((at) => attacked.has(at))
    .sort();
}

/** What the board shows besides the pieces. */
export function highlights(model: Model): Highlights {
  const { game, selected, showMoves, showDanger } = model;
  const ongoing = game.result.status === 'ongoing';
  const last = game.moves.at(-1);
  return {
    ...(selected && { selected }),
    targets:
      selected && showMoves
        ? [...new Map(movesFrom(game, selected).map((m) => [pickedAt(m), m])).values()].map(
            (m) => ({ at: pickedAt(m), capture: m.capture !== undefined }),
          )
        : [],
    ...(last && { lastMove: [last.from, last.to] as [string, string] }),
    check: game.inCheck ? royalSquares(game, game.turn) : [],
    danger: showDanger && ongoing ? endangered(game) : [],
    exposed: showDanger && ongoing ? exposedKings(game) : [],
    movable: ongoing ? [...new Set(game.legal.map((m) => m.from))].sort() : [],
  };
}

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

const REASONS: Record<string, string> = {
  'insufficient-material': 'Insufficient material',
  'fifty-move': 'Fifty-move rule',
  repetition: 'Threefold repetition',
  agreement: 'By agreement',
  'timeout-insufficient-material': 'Out of time, the other side cannot checkmate',
};

/** Win reasons that title() would not read well (3-player games, decision 0016). */
const WINS: Record<string, string> = {
  'king-capture': 'King captured',
  'dragon-captured': 'Dragon pieces captured',
  'exposed-king': 'King left in check',
  timeout: 'Out of time',
};

/** "Dark and Light", "Dark, Light and Dragon". */
const names = (sides: string[]) =>
  sides.length < 2
    ? sides.map(title).join('')
    : `${sides.slice(0, -1).map(title).join(', ')} and ${title(sides.at(-1)!)}`;

/** One line on the state of the game: whose move, check, or how it ended. */
export function statusLine({ result, turn, inCheck }: GameState): string {
  switch (result.status) {
    case 'ongoing':
      return `${title(turn)} to move${inCheck ? ' · in check' : ''}`;
    case 'draw':
      return `${REASONS[result.reason] ?? title(result.reason)} · draw${result.between ? ` between ${names(result.between)}` : ''}`;
    case 'win':
      return `${WINS[result.reason] ?? title(result.reason)} · ${title(result.winner)} wins`;
  }
}

export interface Round {
  number: number;
  first: string;
  second?: string;
  /** 3-player games: the third seat's move. */
  third?: string;
}

/**
 * The moves played, one round of the seats to a row (two in 2-player games, three in 3-player
 * games), as notation (`e2-e4`, `e5xd6`, `d8-d9=queen`).
 */
export function rounds({ moves, order }: GameState): Round[] {
  const per = order.length;
  const out: Round[] = [];
  for (let i = 0; i < moves.length; i += per) {
    const second = moves[i + 1]?.notation;
    const third = per > 2 ? moves[i + 2]?.notation : undefined;
    out.push({
      number: i / per + 1,
      first: moves[i]!.notation,
      ...(second && { second }),
      ...(third && { third }),
    });
  }
  return out;
}
