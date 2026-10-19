// Move generator: pseudo-legal moves from piece movement data, board data and
// resolved parameter values. No piece-specific code paths: a piece moves only
// as its moves and square rules say. Pure and deterministic; results are
// sorted by notation. Attack maps come from the same walk; legality (check)
// is in check.ts.
// Semantics: docs/RULES-FRAMEWORK.md, "Move generation".
import {
  type Board,
  type Condition,
  type Direction,
  type Flag,
  type Move,
  type Piece,
  type Scalar,
} from '../rules/formats';
import { RulesError, type ParamValue } from '../rules/loader';

/** A piece on the board. `side` is a side id, or NEUTRAL for unowned pieces. */
export interface PlacedPiece {
  piece: string;
  side: string;
  /** Has moved at least once; `firstMove` conditions hold until it has. */
  moved?: boolean;
}

/** Coordinate (such as "e5") to the piece standing there. */
export type Position = Record<string, PlacedPiece>;

/** Side id to the ids of the pieces that side has lost (captured) so far. */
export type Lost = Record<string, string[]>;

/** The option of a promotion-target list that stands for the side's lost pieces. */
export const CAPTURED_PIECE = 'captured-piece';

/** Everything moves depend on: the board, its pieces by id and the resolved ruleset. */
export interface MoveRules {
  board: Board;
  pieces: Record<string, Piece>;
  /** Resolved parameter values (`ResolvedRuleset.values`). */
  values: Record<string, ParamValue>;
  players: 2 | 3;
}

export interface GeneratedMove {
  from: string;
  to: string;
  piece: string;
  /** Id of the captured piece. */
  capture?: string;
  /** Id of the piece promoted to. */
  promotion?: string;
}

type Step = [number, number];

const FILES = 'abcdefghi';
const SIZE = 9;

const coord = (f: number, r: number) => `${FILES[f]}${r + 1}`;
const parse = (at: string): Step => [FILES.indexOf(at[0]!), Number(at.slice(1)) - 1];
const onBoard = (f: number, r: number) => f >= 0 && f < SIZE && r >= 0 && r < SIZE;

/** Unit steps per named direction; positive ranks are toward the side's forward. */
const DIRECTION_STEPS: Record<Direction, Step[]> = {
  orthogonal: [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ],
  diagonal: [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ],
  forward: [[0, 1]],
  backward: [[0, -1]],
  sideways: [
    [1, 0],
    [-1, 0],
  ],
  'forward-diagonal': [
    [1, 1],
    [-1, 1],
  ],
  'backward-diagonal': [
    [1, -1],
    [-1, -1],
  ],
};

const images = ([f, r]: Step, symmetry: Move['symmetry']): Step[] => {
  if (symmetry === 'mirror')
    return [
      [f, r],
      [-f, r],
    ];
  if (symmetry === 'all') {
    return [
      [f, r],
      [-f, r],
      [f, -r],
      [-f, -r],
      [r, f],
      [-r, f],
      [r, -f],
      [-r, -f],
    ];
  }
  return [[f, r]];
};

const stepKey = ([f, r]: Step) => `${f},${r}`;

/** The move's distinct steps, relative to the side's forward. */
function relativeSteps(move: Move): Step[] {
  const all = move.directions
    ? move.directions.flatMap((d) => DIRECTION_STEPS[d])
    : (move.vectors ?? []).flatMap((v) => images(v, move.symmetry));
  const seen = new Map(all.map((s) => [stepKey(s), s]));
  return [...seen.values()];
}

/** Square types by coordinate, built once per board. */
const typeCache = new WeakMap<Board, Map<string, string[]>>();
function squareTypes(board: Board): Map<string, string[]> {
  let types = typeCache.get(board);
  if (!types) {
    types = new Map(board.squares.map((s) => [s.at, s.types]));
    typeCache.set(board, types);
  }
  return types;
}

/** A parameter's resolved value; missing and undecided values are refused, never guessed. */
function value(rules: MoveRules, id: string): Exclude<ParamValue, null> {
  if (!Object.hasOwn(rules.values, id))
    throw new RulesError(`Parameter ${id} is not in the resolved ruleset`);
  const v = rules.values[id];
  if (v === null || v === undefined)
    throw new RulesError(`Parameter ${id} is still undecided (null)`);
  return v;
}

function flag(rules: MoveRules, f: Flag | undefined, fallback: boolean): boolean {
  if (f === undefined) return fallback;
  if (typeof f === 'boolean') return f;
  const v = value(rules, f.param);
  if (typeof v !== 'boolean')
    throw new RulesError(`Parameter ${f.param} must be a boolean, is ${JSON.stringify(v)}`);
  return v;
}

function range(rules: MoveRules, r: Move['range']): number {
  if (r === undefined) return SIZE - 1;
  if (typeof r === 'number') return r;
  const v = value(rules, r.param);
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new RulesError(`Parameter ${r.param} must be an integer, is ${JSON.stringify(v)}`);
  }
  return v;
}

interface Env {
  rules: MoveRules;
  /** Square types of the square the piece moves from. */
  fromTypes: string[];
  moved: boolean;
}

/** Whether a condition holds. `any` and `all` stop at the first deciding branch. */
function holds(c: Condition, env: Env): boolean {
  if ('not' in c) return !holds(c.not, env);
  if ('all' in c) return c.all.every((x) => holds(x, env));
  if ('any' in c) return c.any.some((x) => holds(x, env));
  if ('players' in c) return c.players.includes(env.rules.players);
  if ('from' in c) return env.fromTypes.includes(c.from);
  if ('firstMove' in c) return c.firstMove === !env.moved;
  const v = value(env.rules, c.param);
  if ('is' in c) return v === c.is;
  if ('in' in c) return !Array.isArray(v) && c.in.includes(v as Scalar);
  return Array.isArray(v) && v.includes(c.has);
}

export const toNotation = (m: GeneratedMove): string =>
  `${m.from}${m.capture !== undefined ? 'x' : '-'}${m.to}${m.promotion !== undefined ? `=${m.promotion}` : ''}`;

function pieceOf(rules: MoveRules, at: string, placed: PlacedPiece): Piece {
  const piece = rules.pieces[placed.piece];
  if (!piece) throw new RulesError(`${at} holds unknown piece ${placed.piece}`);
  return piece;
}

/** Sort by notation and drop duplicates (two moves of a piece may reach the same square). */
function sortUnique(moves: GeneratedMove[]): GeneratedMove[] {
  const byKey = new Map<string, GeneratedMove>();
  for (const m of moves) {
    const key = toNotation(m);
    if (!byKey.has(key)) byKey.set(key, m);
  }
  return [...byKey.keys()].sort().map((k) => byKey.get(k)!);
}

/**
 * The piece types a side may promote to under the `captured-piece` option: those it has lost.
 * Royal pieces and pieces that promote themselves (pawns) are never targets. Refused when the
 * game does not say what was lost, because a promotion would then be a guess.
 */
function lostTargets(rules: MoveRules, side: string, lost: Lost | undefined): string[] {
  if (!lost) {
    throw new RulesError(
      `A promotion under ${CAPTURED_PIECE} needs the pieces each side has lost; none were given`,
    );
  }
  const ids = lost[side] ?? [];
  for (const id of ids) {
    if (!rules.pieces[id]) throw new RulesError(`${side} has lost unknown piece ${id}`);
  }
  return ids.filter((id) => !rules.pieces[id]!.royal && !rules.pieces[id]!.promotion);
}

/** What a piece's moves depend on: its data, its side's forward direction and its square. */
interface Context {
  piece: Piece;
  placed: PlacedPiece;
  forward: 'up' | 'down' | undefined;
  env: Env;
}

function context(rules: MoveRules, from: string, placed: PlacedPiece): Context {
  const forward = rules.board.sides.find((s) => s.id === placed.side)?.forward;
  const fromTypes = squareTypes(rules.board).get(from) ?? [];
  return {
    piece: pieceOf(rules, from, placed),
    placed,
    forward,
    env: { rules, fromTypes, moved: placed.moved === true },
  };
}

type CaptureMode = NonNullable<Move['capture']>;

/**
 * Walk every move of the piece on `from` and report each square it may end on (stop rules
 * applied) with that move's capture mode. Lines end at the first occupied square, which is
 * reported too, unless the move jumps. Who stands on a reported square is the caller's concern.
 */
function walk(
  rules: MoveRules,
  position: Position,
  from: string,
  { piece, placed, forward, env }: Context,
  visit: (to: string, mode: CaptureMode) => void,
): void {
  const types = squareTypes(rules.board);
  const typesAt = (at: string) => types.get(at) ?? [];
  const sign = forward === 'down' ? -1 : 1;
  const [f0, r0] = parse(from);

  for (const move of piece.moves) {
    if (move.when && !holds(move.when, env)) continue;

    // Square rules of the piece and of this move; any applicable `false` forbids (decision 2026-10-19: deny wins).
    const noStop = new Set<string>();
    const noPass = new Set<string>();
    for (const rule of [...(piece.squares ?? []), ...(move.squares ?? [])]) {
      if (rule.when && !holds(rule.when, env)) continue;
      if (!flag(rules, rule.stop, true)) noStop.add(rule.type);
      if (!flag(rules, rule.pass, true)) noPass.add(rule.type);
    }
    const mayStop = (at: string) => !typesAt(at).some((t) => noStop.has(t));
    const mayPass = (at: string) => !typesAt(at).some((t) => noPass.has(t));
    const mode = move.capture ?? 'move-or-capture';
    const land = (to: string) => {
      if (mayStop(to)) visit(to, mode);
    };

    if (move.targets) {
      for (const sq of rules.board.squares) {
        if (sq.at !== from && sq.types.some((t) => move.targets!.includes(t))) land(sq.at);
      }
      continue;
    }

    const relative = relativeSteps(move);
    if (forward === undefined) {
      const flipped = new Set(relative.map(([f, r]) => stepKey([f, -r])));
      if (relative.some((s) => !flipped.has(stepKey(s)))) {
        throw new RulesError(
          `${piece.id} on ${from} moves relative to forward, but side ${placed.side} has no forward direction`,
        );
      }
    }
    const steps = relative.map(([f, r]): Step => [f, r * sign]);
    const most = range(rules, move.range);
    const jump = flag(rules, move.jump, false);
    for (const [df, dr] of steps) {
      let f = f0;
      let r = r0;
      for (let n = 1; n <= most; n++) {
        f += df;
        r += dr;
        if (!onBoard(f, r)) break;
        const at = coord(f, r);
        land(at);
        // A no-passing rule ends sliding moves only; jumping moves ignore it (decision 2026-10-19).
        if (!jump && (position[at] || !mayPass(at))) break;
      }
    }
  }
}

/**
 * Pseudo-legal moves of the piece on `from`, or none if the square is empty. `lost` lists the
 * pieces each side has lost; it is read only by a promotion under `captured-piece`.
 */
export function movesFrom(
  rules: MoveRules,
  position: Position,
  from: string,
  lost?: Lost,
): GeneratedMove[] {
  const placed = position[from];
  if (!placed) return [];
  const ctx = context(rules, from, placed);
  const { piece, forward, env } = ctx;
  const moves: GeneratedMove[] = [];

  const promotions = (to: string): (string | undefined)[] => {
    const promo = piece.promotion;
    if (!promo || (promo.when && !holds(promo.when, env))) return [undefined];
    if (forward === undefined) {
      throw new RulesError(
        `${piece.id} on ${from} promotes, but side ${placed.side} has no forward direction`,
      );
    }
    if (parse(to)[1] !== (forward === 'up' ? SIZE - 1 : 0)) return [undefined];
    const target = promo.to;
    let ids: string[];
    if (Array.isArray(target)) ids = target;
    else {
      const v = value(rules, target.param);
      if (!Array.isArray(v))
        throw new RulesError(`Parameter ${target.param} must be a list of pieces`);
      ids = v.map(String);
    }
    if (ids.includes(CAPTURED_PIECE)) {
      ids = [
        ...ids.filter((id) => id !== CAPTURED_PIECE),
        ...lostTargets(rules, placed.side, lost),
      ];
    }
    // No targets means the piece does not promote: an empty list (decision 2026-10-19), or no
    // lost piece to take back (decision 2026-10-19, section 5). The pawn stays a pawn.
    return ids.length > 0 ? [...new Set(ids)].sort() : [undefined];
  };

  walk(rules, position, from, ctx, (to, mode) => {
    const occupant = position[to];
    let capture: string | undefined;
    if (!occupant) {
      if (mode === 'capture-only') return;
    } else {
      if (occupant.side === placed.side || mode === 'move-only') return;
      if (!flag(rules, pieceOf(rules, to, occupant).capturable, true)) return;
      capture = occupant.piece;
    }
    for (const promotion of promotions(to)) {
      moves.push({
        from,
        to,
        piece: piece.id,
        ...(capture !== undefined && { capture }),
        ...(promotion !== undefined && { promotion }),
      });
    }
  });
  return sortUnique(moves);
}

/**
 * Squares the piece on `from` attacks: where one of its moves could capture an enemy piece
 * standing there. Built from the same walk as its moves, so every parameter that shapes
 * movement shapes attacks too. Squares of its own side's pieces count (they are defended);
 * whether the piece standing on a square may be captured does not. Sorted; none if empty.
 */
export function attacksFrom(rules: MoveRules, position: Position, from: string): string[] {
  const placed = position[from];
  if (!placed) return [];
  const squares = new Set<string>();
  walk(rules, position, from, context(rules, from, placed), (to, mode) => {
    if (mode !== 'move-only') squares.add(to);
  });
  return [...squares].sort();
}

/** Whether a piece's attacks count as check (`givesCheck`, true unless its data says otherwise). */
export function givesCheck(rules: MoveRules, at: string, placed: PlacedPiece): boolean {
  return flag(rules, pieceOf(rules, at, placed).givesCheck, true);
}

/** Pseudo-legal moves of every piece of `side` (a side id, or NEUTRAL). */
export function generateMoves(
  rules: MoveRules,
  position: Position,
  side: string,
  lost?: Lost,
): GeneratedMove[] {
  const own = Object.keys(position)
    .filter((at) => position[at]!.side === side)
    .sort();
  return sortUnique(own.flatMap((at) => movesFrom(rules, position, at, lost)));
}

/** The board's start position for a player count. */
export function startPosition(board: Board, players: 2 | 3): Position {
  const setup = board.setups.find((s) => s.players === players);
  if (!setup) throw new RulesError(`Board ${board.id} has no setup for ${players} players`);
  const position: Position = {};
  for (const [side, placed] of Object.entries(setup.pieces)) {
    for (const [at, piece] of Object.entries(placed)) position[at] = { piece, side };
  }
  return position;
}
