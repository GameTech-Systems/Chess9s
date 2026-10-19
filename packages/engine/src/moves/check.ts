// Check, legal moves, checkmate and stalemate. Attacks come from the same
// movement data as moves (attacksFrom), so parameters such as king.range change
// what counts as check. Any number of sides: every side other than the one
// asked about, the neutral Tail included, can attack it.
// Semantics: docs/RULES-FRAMEWORK.md, "Check and legal moves".
import { RulesError, type ParamValue } from '../rules/loader';
import {
  attacksFrom,
  generateMoves,
  givesCheck,
  toNotation,
  type GeneratedMove,
  type Lost,
  type MoveRules,
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
 */
export function checkers(rules: MoveRules, position: Position, side: string): string[] {
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
      if (placed.side === side) return false;
      if (!attacksFrom(rules, position, at).some((to) => royal.has(to))) return false;
      // Read the flag only for a piece that attacks, so an unrelated piece's flag is never needed.
      return givesCheck(rules, at, placed);
    })
    .sort();
}

export const inCheck = (rules: MoveRules, position: Position, side: string): boolean =>
  checkers(rules, position, side).length > 0;

/**
 * Legal moves for `side`: its pseudo-legal moves, and those of the `alsoMove` sides, that leave
 * none of its royal pieces in check. Sorted by notation.
 */
export function legalMoves(
  rules: MoveRules,
  position: Position,
  side: string,
  { lost, alsoMove = [] }: TurnOptions = {},
): GeneratedMove[] {
  const movers = [...new Set([side, ...alsoMove])];
  const moves = movers.flatMap((mover) => generateMoves(rules, position, mover, lost));
  return moves
    .filter((m) => !inCheck(rules, applyMove(position, m), side))
    .map((m) => [toNotation(m), m] as const)
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
  const found = checkers(rules, position, side);
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
