// Check, legal moves, checkmate and stalemate. Attacks come from the same
// movement data as moves (attacksFrom), so parameters such as king.range change
// what counts as check. Any number of sides: every side other than the one
// asked about, the neutral Tail included, can attack it.
// Semantics: docs/RULES-FRAMEWORK.md, "Check and legal moves".
import { RulesError, type ParamValue } from '../rules/loader';
import {
  attackReach,
  attacksFrom,
  generateMoves,
  givesCheck,
  toNotation,
  type GeneratedMove,
  type Lost,
  type MoveRules,
  type PlacedPiece,
  type Position,
} from './generate';

export interface TurnOptions {
  /** The pieces each side has lost; read only by a promotion under `captured-piece`. */
  lost?: Lost;
  /**
   * Other sides whose pieces this side may move on this turn, such as NEUTRAL for the Dragon
   * Tail in 2-player games. Whether it may (the Coast opened, the repeat limit) is game state;
   * the caller decides.
   */
  alsoMove?: string[];
  /**
   * Which of the pseudo-legal moves may be played this turn at all (before the check test), such
   * as the repeat limit on the Tail. `mover` is the side whose piece moves.
   */
  allow?: (move: GeneratedMove, mover: string) => boolean;
  /**
   * Pieces whose attacks give no check while this holds, such as a closed Coast's pieces. They
   * still occupy their squares and block lines.
   */
  inert?: (at: string, placed: PlacedPiece) => boolean;
  /**
   * Moves after which `inert` no longer applies, such as the one that opens the Coast: the
   * position after such a move is judged with every piece active.
   */
  lifts?: (move: GeneratedMove, mover: string) => boolean;
}

/** The position after a move: the piece moves (as its promotion, if any) and is marked moved. */
export function applyMove(position: Position, move: GeneratedMove): Position {
  const placed = position[move.from];
  if (!placed || placed.piece !== move.piece) {
    throw new RulesError(`${move.from} does not hold ${move.piece}`);
  }
  const next: Position = { ...position };
  delete next[move.from];
  next[move.to] = { piece: move.promotion ?? placed.piece, side: placed.side, moved: true };
  return next;
}

/** Every square attacked by the pieces of `side` (a side id, or NEUTRAL), sorted. */
export function attackMap(rules: MoveRules, position: Position, side: string): string[] {
  const squares = new Set<string>();
  for (const [at, placed] of Object.entries(position)) {
    if (placed.side === side) for (const to of attacksFrom(rules, position, at)) squares.add(to);
  }
  return [...squares].sort();
}

/**
 * Squares of the pieces giving check to `side`: pieces of any other side whose `givesCheck`
 * holds and that attack one of its royal pieces. Sorted; none for a side without a royal piece.
 * Pieces that are `inert` give no check.
 */
export function checkers(
  rules: MoveRules,
  position: Position,
  side: string,
  inert?: TurnOptions['inert'],
): string[] {
  const royal = new Set(
    Object.keys(position).filter((at) => {
      const placed = position[at]!;
      return placed.side === side && rules.pieces[placed.piece]?.royal === true;
    }),
  );
  if (royal.size === 0) return [];
  return Object.keys(position)
    .filter((at) => {
      const placed = position[at]!;
      if (placed.side === side || inert?.(at, placed)) return false;
      if (!attacksFrom(rules, position, at).some((to) => royal.has(to))) return false;
      // Read the flag only for a piece that attacks, so an unrelated piece's flag is never needed.
      return givesCheck(rules, at, placed);
    })
    .sort();
}

export const inCheck = (
  rules: MoveRules,
  position: Position,
  side: string,
  inert?: TurnOptions['inert'],
): boolean => checkers(rules, position, side, inert).length > 0;

/**
 * A test of whether a move leaves `side` out of check, as `inCheck` on the position after it
 * would say, without rescanning every piece per move. Each piece of the other sides is walked
 * once on the position and once alone on the board. A move changes only its from-square (now
 * empty, so lines through it reach further) and its to-square (now filled, so lines through it
 * stop sooner), so a piece is walked again only when it moved, read the from-square, or read a
 * newly filled to-square while attacking a king; and never when even alone it reaches no king.
 */
function staysOutOfCheck(
  rules: MoveRules,
  position: Position,
  side: string,
  inert: TurnOptions['inert'],
  lifts: TurnOptions['lifts'],
): (move: GeneratedMove, mover: string) => boolean {
  const royal = Object.keys(position).filter((at) => {
    const placed = position[at]!;
    return placed.side === side && rules.pieces[placed.piece]?.royal === true;
  });
  const others = Object.keys(position)
    .filter((at) => position[at]!.side !== side)
    .map((at) => ({
      at,
      placed: position[at]!,
      ...attackReach(rules, position, at),
      alone: new Set(attacksFrom(rules, { [at]: position[at]! }, at)),
    }));

  return (move, mover) => {
    const placed = position[move.from]!;
    const kings = royal.filter((at) => at !== move.from);
    if (placed.side === side && rules.pieces[move.promotion ?? placed.piece]?.royal === true) {
      kings.push(move.to);
    }
    if (kings.length === 0) return true;
    const hits = (attacks: Set<string>) => kings.some((k) => attacks.has(k));
    const filled = position[move.to] === undefined;
    const inertNow = lifts?.(move, mover) ? undefined : inert;
    let after: Position | undefined;
    for (const other of others) {
      if (other.at === move.to) continue; // Captured.
      const moved = other.at === move.from;
      if (!moved && !hits(other.alone)) continue;
      let { at, placed: piece, attacks } = other;
      if (
        moved ||
        other.reads.has(move.from) ||
        (filled && other.reads.has(move.to) && hits(attacks))
      ) {
        after ??= applyMove(position, move);
        if (moved) at = move.to;
        piece = after[at]!;
        attacks = new Set(attacksFrom(rules, after, at));
      }
      if (inertNow?.(at, piece)) continue;
      if (!hits(attacks)) continue;
      // Read the flag only for a piece that attacks, so an unrelated piece's flag is never needed.
      if (givesCheck(rules, at, piece)) return false;
    }
    return true;
  };
}

/**
 * Legal moves for `side`: its pseudo-legal moves, and those of the `alsoMove` sides, that leave
 * none of its royal pieces in check. A borrowed piece (the Tail) never captures a piece of the
 * side moving it (owner, 19 Oct 2026). Sorted by notation.
 */
export function legalMoves(
  rules: MoveRules,
  position: Position,
  side: string,
  { lost, alsoMove = [], allow, inert, lifts }: TurnOptions = {},
): GeneratedMove[] {
  const movers = [...new Set([side, ...alsoMove])];
  const moves = movers.flatMap((mover) =>
    generateMoves(rules, position, mover, lost)
      .filter((m) => mover === side || position[m.to]?.side !== side)
      .filter((m) => allow?.(m, mover) !== false)
      .map((m) => [m, mover] as const),
  );
  const safe = staysOutOfCheck(rules, position, side, inert, lifts);
  return moves
    .filter(([m, mover]) => safe(m, mover))
    .map(([m]) => [toNotation(m), m] as const)
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
    .map(([, m]) => m);
}

export interface GameStatus {
  side: string;
  inCheck: boolean;
  /** Squares of the pieces giving check. */
  checkers: string[];
  legal: GeneratedMove[];
  /** No legal move: checkmate when in check, stalemate otherwise. */
  result: 'ongoing' | 'checkmate' | 'stalemate';
  /** The `draw.stalemate` ruling, read only when the result is stalemate. */
  stalemate?: ParamValue;
}

/** Whether `side`, to move, is in check, mated or stalemated. */
export function gameStatus(
  rules: MoveRules,
  position: Position,
  side: string,
  options: TurnOptions = {},
): GameStatus {
  const found = checkers(rules, position, side, options.inert);
  const legal = legalMoves(rules, position, side, options);
  const status: GameStatus = {
    side,
    inCheck: found.length > 0,
    checkers: found,
    legal,
    result: legal.length > 0 ? 'ongoing' : found.length > 0 ? 'checkmate' : 'stalemate',
  };
  if (status.result === 'stalemate') status.stalemate = stalemateRuling(rules);
  return status;
}

/** `draw.stalemate`; missing (3-player games, which have their own rule) or null is refused. */
function stalemateRuling(rules: MoveRules): ParamValue {
  const id = 'draw.stalemate';
  const v = rules.values[id];
  if (v === null || v === undefined) {
    throw new RulesError(`Stalemate needs ${id}, which this ruleset does not resolve`);
  }
  return v;
}
