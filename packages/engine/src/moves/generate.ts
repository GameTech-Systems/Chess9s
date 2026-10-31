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
  type SquareRule,
} from '../rules/formats';
import { RulesError, type ParamValue } from '../rules/loader';

/** A piece on the board. `side` is a side id, or NEUTRAL for unowned pieces. */
export interface PlacedPiece {
  piece: string;
  side: string;
  /** Has moved at least once; `firstMove` conditions hold until it has. */
  moved?: boolean;
  /** The square it started the game on, read by `homeFile` square rules (pawn-safe zones). */
  home?: string;
  /**
   * Square types it has moved off onto a square without them, sorted, for `hasLeft` conditions:
   * a Coast piece that has left the Coast once (3-player first way out through A5, coast.3p.exit,
   * decision 0019). Kept only for the types its own data reads, so other pieces never carry it.
   */
  left?: string[];
  /**
   * Turned to stone (3-player games, decision 0016 rules 10 and 11): it only blocks. It never
   * moves, can't be captured, attacks nothing and gives no check, and no piece may move onto it.
   */
  stone?: boolean;
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
  /** Where the captured piece stood, when not on `to` (a capture in passing). */
  captureAt?: string;
  /** Squares this move passed over that an enemy may capture on, in passing, on the next turn. */
  passes?: string[];
  /** Castling: the partner piece's move, made together with this one. */
  castle?: { from: string; to: string };
  /**
   * 3-player games: the square of the checkmating piece the mover chose, when the move checkmates
   * with two or more pieces giving check and none of them just moved (decision 0016, rule 8).
   */
  mateBy?: string;
  /** 3-player games: what a pawn swapped onto its last rank by a Tail checkmate becomes (rule 9). */
  swapPromotion?: string;
}

/** What the last move left open to capture in passing: the squares it passed and where it landed. */
export interface Passing {
  squares: string[];
  at: string;
}

type Step = [number, number];

const FILES = 'abcdefghi';
const SIZE = 9;

const coord = (f: number, r: number) => `${FILES[f]}${r + 1}`;
/** Coordinates by file * SIZE + rank, so the walk builds no strings. */
const COORDS = Array.from({ length: SIZE * SIZE }, (_, i) => coord(Math.floor(i / SIZE), i % SIZE));
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

/** The move's distinct steps, relative to the side's forward, worked out once per move. */
const stepCache = new WeakMap<Move, Step[]>();
function relativeSteps(move: Move): Step[] {
  let steps = stepCache.get(move);
  if (!steps) {
    const all = move.directions
      ? move.directions.flatMap((d) => DIRECTION_STEPS[d])
      : (move.vectors ?? []).flatMap((v) => images(v, move.symmetry));
    steps = [...new Map(all.map((s) => [stepKey(s), s])).values()];
    stepCache.set(move, steps);
  }
  return steps;
}

/** Square types by coordinate (squares the board data does not list have none), built once per board. */
const typeCache = new WeakMap<Board, Map<string, string[]>>();
export function squareTypes(board: Board): Map<string, string[]> {
  let types = typeCache.get(board);
  if (!types) {
    types = new Map(board.squares.map((s) => [s.at, s.types]));
    typeCache.set(board, types);
  }
  return types;
}

/** The side each square belongs to (`Square.side`), built once per board. */
const sideCache = new WeakMap<Board, Map<string, string>>();
function squareSides(board: Board): Map<string, string> {
  let sides = sideCache.get(board);
  if (!sides) {
    sides = new Map(board.squares.flatMap((s) => (s.side ? [[s.at, s.side] as const] : [])));
    sideCache.set(board, sides);
  }
  return sides;
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
  /** Square types the piece has left (`PlacedPiece.left`). */
  left: readonly string[];
}

const NOTHING_LEFT: readonly string[] = [];

/** Whether a condition holds. `any` and `all` stop at the first deciding branch. */
function holds(c: Condition, env: Env): boolean {
  if ('not' in c) return !holds(c.not, env);
  if ('all' in c) return c.all.every((x) => holds(x, env));
  if ('any' in c) return c.any.some((x) => holds(x, env));
  if ('players' in c) return c.players.includes(env.rules.players);
  if ('from' in c) return env.fromTypes.includes(c.from);
  if ('firstMove' in c) return c.firstMove === !env.moved;
  if ('hasLeft' in c) return env.left.includes(c.hasLeft);
  const v = value(env.rules, c.param);
  if ('is' in c) return v === c.is;
  if ('in' in c) return !Array.isArray(v) && c.in.includes(v as Scalar);
  return Array.isArray(v) && v.includes(c.has);
}

/** The choices a 3-player checkmate adds to a move: `#<checkmating square>` and `=<swap promotion>`. */
const mateChoice = (m: GeneratedMove): string =>
  m.mateBy === undefined && m.swapPromotion === undefined
    ? ''
    : `#${m.mateBy ?? ''}${m.swapPromotion !== undefined ? `=${m.swapPromotion}` : ''}`;

export const toNotation = (m: GeneratedMove): string =>
  `${m.from}${m.capture !== undefined ? 'x' : '-'}${m.to}${m.promotion !== undefined ? `=${m.promotion}` : ''}${m.castle ? `/${m.castle.from}-${m.castle.to}` : ''}${mateChoice(m)}`;

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
  /** Its `moveOnly` condition holds here: it captures and attacks nothing (S71). */
  disarmed: boolean;
  /**
   * Its `attackOnly` condition holds here: the only squares it captures on and attacks (S74);
   * null when it doesn't.
   */
  attackOn: Set<string> | null;
  /** access() results for this piece in this situation, by move (`null` for the piece alone). */
  access: Map<Move | null, Access>;
}

/**
 * access() results per ruleset, by everything they read besides the move: the piece, the
 * from-square's types and the moved flag (for `when` conditions), and the side and home square
 * (for `covers`). The search asks the same thing millions of times (S35).
 */
const accessCache = new WeakMap<MoveRules, Map<string, Map<Move | null, Access>>>();

function context(rules: MoveRules, from: string, placed: PlacedPiece): Context {
  const forward = rules.board.sides.find((s) => s.id === placed.side)?.forward;
  const fromTypes = squareTypes(rules.board).get(from) ?? [];
  const piece = pieceOf(rules, from, placed);
  let byRules = accessCache.get(rules);
  if (!byRules) accessCache.set(rules, (byRules = new Map()));
  const left = placed.left ?? NOTHING_LEFT;
  const key = `${piece.id}|${fromTypes.join('+')}|${placed.moved === true}|${placed.side}|${placed.home ?? ''}|${left.join('+')}`;
  let access = byRules.get(key);
  if (!access) byRules.set(key, (access = new Map()));
  const env: Env = { rules, fromTypes, moved: placed.moved === true, left };
  return {
    piece,
    placed,
    forward,
    env,
    disarmed: piece.moveOnly !== undefined && holds(piece.moveOnly.when, env),
    attackOn:
      piece.attackOnly !== undefined && holds(piece.attackOnly.when, env)
        ? squaresOfTypes(rules, piece.attackOnly.on)
        : null,
    access,
  };
}

const typedSquares = new WeakMap<MoveRules, Map<string, Set<string>>>();

/** The squares of the board that have any of `types`, worked out once per ruleset. */
function squaresOfTypes(rules: MoveRules, types: readonly string[]): Set<string> {
  let byKey = typedSquares.get(rules);
  if (!byKey) typedSquares.set(rules, (byKey = new Map()));
  const key = types.join('+');
  let found = byKey.get(key);
  if (!found) {
    const all = squareTypes(rules.board);
    found = new Set(COORDS.filter((at) => (all.get(at) ?? []).some((t) => types.includes(t))));
    byKey.set(key, found);
  }
  return found;
}

/** Whether the piece in this context may capture on, and attacks, `to` (moveOnly, attackOnly). */
const armedAt = (ctx: Context, to: string): boolean =>
  !ctx.disarmed && (ctx.attackOn === null || ctx.attackOn.has(to));

/** Whether a square rule covers the square `at` for this piece: its type, owner and file. */
function covers(rules: MoveRules, rule: SquareRule, at: string, placed: PlacedPiece): boolean {
  const typed = (squareTypes(rules.board).get(at) ?? []).includes(rule.type);
  if (typed === (rule.outside === true)) return false;
  if (rule.owner !== undefined) {
    const side = squareSides(rules.board).get(at);
    if (side === undefined || (side === placed.side) !== (rule.owner === 'own')) return false;
  }
  return rule.homeFile !== true || (placed.home !== undefined && placed.home[0] === at[0]);
}

interface Access {
  mayStop: (at: string) => boolean;
  mayPass: (at: string) => boolean;
}

/**
 * Where the piece may stop and pass under its own square rules and those of `move`; any
 * applicable `false` forbids (decision 2026-10-19: deny wins).
 */
function access(rules: MoveRules, ctx: Context, move?: Move): Access {
  const cached = ctx.access.get(move ?? null);
  if (cached) return cached;
  const { piece, placed, env } = ctx;
  const noStop: SquareRule[] = [];
  const noPass: SquareRule[] = [];
  for (const rule of [...(piece.squares ?? []), ...(move?.squares ?? [])]) {
    if (rule.stop === undefined && rule.pass === undefined) continue;
    if (rule.when && !holds(rule.when, env)) continue;
    if (!flag(rules, rule.stop, true)) noStop.push(rule);
    if (!flag(rules, rule.pass, true)) noPass.push(rule);
  }
  const blocked = (deny: SquareRule[]) =>
    new Set(COORDS.filter((at) => deny.some((r) => covers(rules, r, at, placed))));
  const noStopAt = blocked(noStop);
  const noPassAt = blocked(noPass);
  const found: Access = {
    mayStop: (at) => !noStopAt.has(at),
    mayPass: (at) => !noPassAt.has(at),
  };
  ctx.access.set(move ?? null, found);
  return found;
}

/**
 * Whether the piece standing on `at` may be captured: never a stone; otherwise its `capturable`
 * flag, then its square rules' `capturable` for the square it stands on (pawn-safe zones, capture
 * on the Coast).
 */
export function capturable(rules: MoveRules, at: string, placed: PlacedPiece): boolean {
  if (placed.stone === true) return false;
  const piece = pieceOf(rules, at, placed);
  if (!flag(rules, piece.capturable, true)) return false;
  const env: Env = {
    rules,
    fromTypes: squareTypes(rules.board).get(at) ?? [],
    moved: placed.moved === true,
    left: placed.left ?? NOTHING_LEFT,
  };
  return !(piece.squares ?? []).some(
    (r) =>
      r.capturable !== undefined &&
      covers(rules, r, at, placed) &&
      (!r.when || holds(r.when, env)) &&
      !flag(rules, r.capturable, true),
  );
}

/**
 * Walk every move of the piece on `from` and report each square it may end on (stop rules
 * applied) with that move and how many steps along `step` it took (none for a targets move).
 * Lines end at the first occupied square, which is reported too, unless the move jumps. Who
 * stands on a reported square is the caller's concern. `look` hears every square whose
 * occupant the walk reads: only those can change the result.
 */
function walk(
  rules: MoveRules,
  position: Position,
  from: string,
  ctx: Context,
  visit: (to: string, move: Move, step?: Step, n?: number) => void,
  look?: (at: string) => void,
): void {
  const { piece, placed, forward, env } = ctx;
  const sign = forward === 'down' ? -1 : 1;
  const [f0, r0] = parse(from);

  for (const move of piece.moves) {
    if (move.when && !holds(move.when, env)) continue;
    const { mayStop, mayPass } = access(rules, ctx, move);

    if (move.targets) {
      for (const sq of rules.board.squares) {
        if (sq.at !== from && sq.types.some((t) => move.targets!.includes(t)) && mayStop(sq.at)) {
          visit(sq.at, move);
        }
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
        const at = COORDS[f * SIZE + r]!;
        look?.(at);
        if (mayStop(at)) visit(at, move, [df, dr], n);
        // A no-passing rule ends sliding moves only; jumping moves ignore it (decision 2026-10-19).
        if (!jump && (position[at] || !mayPass(at))) break;
      }
    }
  }
}

/**
 * What the piece in this context becomes on reaching `to`: the sorted promotion targets, or
 * [undefined] when it does not promote there.
 */
function promotionTargets(
  rules: MoveRules,
  ctx: Context,
  from: string,
  to: string,
  lost: Lost | undefined,
): (string | undefined)[] {
  const { piece, placed, forward, env } = ctx;
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
    ids = [...ids.filter((id) => id !== CAPTURED_PIECE), ...lostTargets(rules, placed.side, lost)];
  }
  // No targets means the piece does not promote: an empty list (decision 2026-10-19), or no
  // lost piece to take back (decision 2026-10-19, section 5). The pawn stays a pawn.
  return ids.length > 0 ? [...new Set(ids)].sort() : [undefined];
}

/**
 * What the piece standing on `at` becomes when it is put on `to` other than by a move of its own
 * (a Tail swap, decision 0016 rule 9): its promotion targets there, or [undefined].
 */
export const promotionsAt = (
  rules: MoveRules,
  at: string,
  placed: PlacedPiece,
  to: string,
  lost?: Lost,
): (string | undefined)[] => promotionTargets(rules, context(rules, at, placed), at, to, lost);

/**
 * Whether the piece standing on `at` may stand on `to` under its own square rules (not those of
 * any one move), such as a Rook on the Coast or a Queen on a void square.
 */
export const mayStand = (rules: MoveRules, at: string, placed: PlacedPiece, to: string): boolean =>
  access(rules, context(rules, at, placed)).mayStop(to);

/**
 * Pseudo-legal moves of the piece on `from`, or none if the square is empty. `lost` lists the
 * pieces each side has lost; it is read only by a promotion under `captured-piece`. `passing`
 * is what the last move left open to capture in passing, if anything.
 */
export function movesFrom(
  rules: MoveRules,
  position: Position,
  from: string,
  lost?: Lost,
  passing?: Passing,
): GeneratedMove[] {
  const placed = position[from];
  if (!placed || placed.stone === true) return [];
  const ctx = context(rules, from, placed);
  const { piece } = ctx;
  const [f0, r0] = parse(from);
  const moves: GeneratedMove[] = [];

  const promotions = (to: string) => promotionTargets(rules, ctx, from, to, lost);

  walk(rules, position, from, ctx, (to, move, step, n = 0) => {
    const armed = armedAt(ctx, to);
    if (!armed && move.capture === 'capture-only') return;
    const mode = armed ? (move.capture ?? 'move-or-capture') : 'move-only';
    const occupant = position[to];
    let capture: string | undefined;
    let captureAt: string | undefined;
    if (!occupant) {
      if (mode === 'capture-only') {
        // A capture in passing: onto a square the last move passed, taking the piece that made it.
        const victim = passing && position[passing.at];
        if (!move.inPassing || !victim || !passing.squares.includes(to)) return;
        if (victim.side === placed.side || !capturable(rules, passing.at, victim)) return;
        capture = victim.piece;
        captureAt = passing.at;
      }
    } else {
      if (occupant.side === placed.side || mode === 'move-only') return;
      if (!capturable(rules, to, occupant)) return;
      capture = occupant.piece;
    }
    const passes =
      move.passable && step && n > 1
        ? Array.from({ length: n - 1 }, (_, i) =>
            coord(f0 + step[0] * (i + 1), r0 + step[1] * (i + 1)),
          )
        : [];
    for (const promotion of promotions(to)) {
      moves.push({
        from,
        to,
        piece: piece.id,
        ...(capture !== undefined && { capture }),
        ...(captureAt !== undefined && { captureAt }),
        ...(promotion !== undefined && { promotion }),
        ...(passes.length > 0 && { passes }),
      });
    }
  });
  moves.push(...castlings(rules, position, from, ctx));
  return sortUnique(moves);
}

/**
 * Castling moves of the piece on `from` (pseudo-legal: whether it is in check, or crosses or
 * lands on an attacked square, is for legalMoves). Along its rank, toward an unmoved own partner
 * with only empty squares between; the piece moves `steps` and the partner lands on the last
 * square it crossed. Both must be allowed to stand there, and the piece to cross what it crosses.
 */
function castlings(
  rules: MoveRules,
  position: Position,
  from: string,
  ctx: Context,
): GeneratedMove[] {
  const { piece, placed, env } = ctx;
  const castle = piece.castle;
  if (!castle || placed.moved === true || (castle.when && !holds(castle.when, env))) return [];
  const [f0, r0] = parse(from);
  const out: GeneratedMove[] = [];
  for (const df of [1, -1]) {
    let f = f0 + df;
    while (onBoard(f, r0) && !position[coord(f, r0)]) f += df;
    if (!onBoard(f, r0) || Math.abs(f - f0) <= castle.steps) continue;
    const partnerAt = coord(f, r0);
    const partner = position[partnerAt]!;
    if (
      partner.side !== placed.side ||
      partner.piece !== castle.partner ||
      partner.moved === true
    ) {
      continue;
    }
    const to = coord(f0 + df * castle.steps, r0);
    const rookTo = coord(f0 + df * (castle.steps - 1), r0);
    const own = access(rules, ctx);
    const crossed = castlePath({ from, to });
    if (!own.mayStop(to) || !crossed.every(own.mayPass)) continue;
    if (!access(rules, context(rules, partnerAt, partner)).mayStop(rookTo)) continue;
    out.push({ from, to, piece: piece.id, castle: { from: partnerAt, to: rookTo } });
  }
  return out;
}

/** The squares a castling piece crosses between its from- and to-square (same rank). */
export function castlePath({ from, to }: { from: string; to: string }): string[] {
  const [f0, r0] = parse(from);
  const [f1] = parse(to);
  const df = Math.sign(f1 - f0);
  const out: string[] = [];
  for (let f = f0 + df; f !== f1; f += df) out.push(coord(f, r0));
  return out;
}

/**
 * Squares the piece on `from` attacks: where one of its moves could capture an enemy piece
 * standing there. Built from the same walk as its moves, so every parameter that shapes
 * movement shapes attacks too. Squares of its own side's pieces count (they are defended);
 * whether the piece standing on a square may be captured does not. None while its `moveOnly`
 * condition holds, and only squares of its `attackOnly` types while that one holds (it still
 * blocks other pieces' lines). Sorted; none if empty.
 */
export function attacksFrom(rules: MoveRules, position: Position, from: string): string[] {
  return reach(rules, position, from, false);
}

/**
 * The squares the piece on `from` would attack if its `moveOnly` and `attackOnly` conditions did
 * not hold: where its
 * moves go, as attacksFrom counts them. The same as attacksFrom for any other piece. For playing
 * heuristics that ask where a piece could go, such as the Tail's way out (S71).
 */
export function reachFrom(rules: MoveRules, position: Position, from: string): string[] {
  return reach(rules, position, from, true);
}

function reach(rules: MoveRules, position: Position, from: string, armed: boolean): string[] {
  const placed = position[from];
  if (!placed || placed.stone === true) return [];
  const ctx = context(rules, from, placed);
  if (ctx.disarmed && !armed) return [];
  const squares = new Set<string>();
  walk(rules, position, from, ctx, (to, move) => {
    if (move.capture !== 'move-only' && (armed || armedAt(ctx, to))) squares.add(to);
  });
  return [...squares].sort();
}

/**
 * The squares the piece on `from` attacks, and every square whose occupant its walk reads. Its
 * attacks stay the same after a move that leaves all of those squares as they were (and leaves
 * the piece where it is), because nothing else in the walk depends on the position.
 */
export function attackReach(
  rules: MoveRules,
  position: Position,
  from: string,
): { attacks: Set<string>; reads: Set<string> } {
  const attacks = new Set<string>();
  const reads = new Set<string>();
  const placed = position[from];
  if (!placed || placed.stone === true) return { attacks, reads };
  const ctx = context(rules, from, placed);
  // A disarmed piece attacks nothing wherever the others stand, so its walk reads nothing.
  if (ctx.disarmed) return { attacks, reads };
  walk(
    rules,
    position,
    from,
    ctx,
    (to, move) => {
      if (move.capture !== 'move-only' && armedAt(ctx, to)) attacks.add(to);
    },
    (at) => reads.add(at),
  );
  return { attacks, reads };
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
  passing?: Passing,
): GeneratedMove[] {
  const own = Object.keys(position)
    .filter((at) => position[at]!.side === side)
    .sort();
  return sortUnique(own.flatMap((at) => movesFrom(rules, position, at, lost, passing)));
}

const readsFirstMove = (c: Condition | undefined): boolean =>
  c !== undefined &&
  ('firstMove' in c ||
    ('not' in c && readsFirstMove(c.not)) ||
    ('all' in c && c.all.some(readsFirstMove)) ||
    ('any' in c && c.any.some(readsFirstMove)));

/** The square types a condition's `hasLeft` parts name. */
const leftTypes = (c: Condition | undefined): string[] =>
  c === undefined
    ? []
    : 'hasLeft' in c
      ? [c.hasLeft]
      : 'not' in c
        ? leftTypes(c.not)
        : 'all' in c
          ? c.all.flatMap(leftTypes)
          : 'any' in c
            ? c.any.flatMap(leftTypes)
            : [];

interface KeyFacts {
  moved: boolean;
  home: boolean;
  /** The square types its `hasLeft` conditions read, sorted. */
  left: string[];
}

/**
 * Per piece id: whether its moved flag and its home square can change what it may do, and which
 * square types it must remember leaving.
 */
const keyCache = new WeakMap<MoveRules, Map<string, KeyFacts>>();
function keyFacts(rules: MoveRules, id: string): KeyFacts {
  let facts = keyCache.get(rules);
  if (!facts) {
    facts = new Map();
    const env: Env = { rules, fromTypes: [], moved: false, left: NOTHING_LEFT };
    const castles = Object.values(rules.pieces).filter(
      (p) => p.castle && (!p.castle.when || holds(p.castle.when, env)),
    );
    for (const p of Object.values(rules.pieces)) {
      const rulesOf = [...(p.squares ?? []), ...p.moves.flatMap((m) => m.squares ?? [])];
      const moved =
        castles.some((c) => c === p || c.castle!.partner === p.id) ||
        readsFirstMove(p.promotion?.when) ||
        p.moves.some((m) => readsFirstMove(m.when)) ||
        rulesOf.some((r) => readsFirstMove(r.when));
      const conditions = [
        ...rulesOf.map((r) => r.when),
        ...p.moves.map((m) => m.when),
        p.promotion?.when,
        p.castle?.when,
      ];
      const left = [...new Set(conditions.flatMap(leftTypes))].sort();
      facts.set(p.id, { moved, home: rulesOf.some((r) => r.homeFile === true), left });
    }
    keyCache.set(rules, facts);
  }
  return facts.get(id) ?? { moved: false, home: false, left: [] };
}

/**
 * The `left` list of a piece moved from `from` to `to`: the square types its data reads that
 * `from` has and `to` lacks are added (sorted). The same list when nothing is added, and none for
 * a piece whose data reads no `hasLeft` condition.
 */
export function leftAfter(
  rules: MoveRules,
  placed: PlacedPiece,
  from: string,
  to: string,
): string[] | undefined {
  const tracked = keyFacts(rules, placed.piece).left;
  if (tracked.length === 0) return placed.left;
  const types = squareTypes(rules.board);
  const fromTypes = types.get(from) ?? [];
  const toTypes = types.get(to) ?? [];
  const added = tracked.filter(
    (t) => fromTypes.includes(t) && !toTypes.includes(t) && !(placed.left ?? []).includes(t),
  );
  return added.length === 0 ? placed.left : [...(placed.left ?? []), ...added].sort();
}

/**
 * A placed piece as the repetition rule compares it: its type and side, and its moved flag,
 * starting file and the square types it has left only where they can change what it may do (first
 * moves, castling, pawn-safe zones, a Coast piece's first way out), so a piece that moved away and
 * came back is the same piece unless its rights changed.
 */
export function placedKey(rules: MoveRules, placed: PlacedPiece): string {
  const facts = keyFacts(rules, placed.piece);
  const left = facts.left.filter((t) => placed.left?.includes(t));
  return `${placed.side}:${placed.piece}${facts.moved && placed.moved ? '*' : ''}${facts.home ? `@${placed.home?.[0] ?? ''}` : ''}${left.length > 0 ? `^${left.join('+')}` : ''}${placed.stone === true ? '~stone' : ''}`;
}

/** The board's start position for a player count. */
export function startPosition(board: Board, players: 2 | 3): Position {
  const setup = board.setups.find((s) => s.players === players);
  if (!setup) throw new RulesError(`Board ${board.id} has no setup for ${players} players`);
  const position: Position = {};
  for (const [side, placed] of Object.entries(setup.pieces)) {
    for (const [at, piece] of Object.entries(placed)) position[at] = { piece, side, home: at };
  }
  return position;
}
