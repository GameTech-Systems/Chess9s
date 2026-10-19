// Computer opponent v1 (S23): negamax with alpha-beta, iterative deepening and a capture-only
// quiescence search, over the engine's own legal moves (playMove), so it plays whichever ruleset
// is selected. The evaluation is material, and a piece's value comes from its movement data
// under the resolved ruleset, so parameters that change how a piece moves change what it is
// worth. These are playing heuristics, not rules. Deterministic: the search stops on a node
// budget (no clock), and ties are broken only by the random source passed in.
import { playMove, type GameState } from '../game/game';
import {
  attacksFrom,
  movesFrom,
  squareTypes,
  type GeneratedMove,
  type MoveRules,
} from '../moves/generate';

/** A checkmate's score, less one per ply it takes to reach, so a faster mate scores higher. */
const MATE = 1_000_000;
/** Most captures in a row the quiescence search follows past the nominal depth. */
const QUIESCENCE_PLIES = 4;

export interface SearchOptions {
  /** Most moves the search plays out (positions it visits); it stops deepening when spent. */
  nodes?: number;
  /** Deepest full-width search, in plies. */
  depth?: number;
  /** Picks among equally good moves, returning [0, 1). Without it the first in notation order. */
  random?: () => number;
}

export interface SearchResult {
  move: GeneratedMove | undefined;
  /** In hundredths of a value unit, from the side to move; near ±MATE for a forced mate. */
  score: number;
  /** Deepest search completed. */
  depth: number;
  nodes: number;
}

const valueCache = new WeakMap<MoveRules, Record<string, number>>();

/**
 * Each piece's value, in hundredths: the average number of squares it could move to or attack
 * from each square of an otherwise empty board, for each side that has a forward direction.
 * Royal pieces are worth nothing (the search scores mate instead), and so are pieces no seat
 * starts with (the neutral Tail).
 */
export function pieceValues(rules: MoveRules): Record<string, number> {
  const cached = valueCache.get(rules);
  if (cached) return cached;
  const setup = rules.board.setups.find((s) => s.players === rules.players);
  const seats = new Set(rules.board.sides.map((s) => s.id));
  const owned = new Set(
    Object.entries(setup?.pieces ?? {})
      .filter(([side]) => seats.has(side))
      .flatMap(([, placed]) => Object.values(placed)),
  );
  const sides = rules.board.sides.filter((s) => s.forward !== undefined).map((s) => s.id);
  const squares = [...squareTypes(rules.board).keys()];
  const values: Record<string, number> = {};
  for (const [id, piece] of Object.entries(rules.pieces)) {
    if (piece.royal || !owned.has(id) || sides.length === 0) {
      values[id] = 0;
      continue;
    }
    let total = 0;
    for (const side of sides) {
      for (const at of squares) {
        const position = { [at]: { piece: id, side, moved: true } };
        const reach = new Set(attacksFrom(rules, position, at));
        for (const m of movesFrom(rules, position, at, {})) reach.add(m.to);
        total += reach.size;
      }
    }
    values[id] = Math.round((100 * total) / (sides.length * squares.length));
  }
  valueCache.set(rules, values);
  return values;
}

/** Hundredths per legal move of the side to move: enough to hem in a lone king, less than a pawn. */
const MOBILITY = 5;

/**
 * Material of the side to move less that of the other seats, in hundredths, plus a little for
 * each of its legal moves (already worked out with the state), so a side well ahead drives the
 * other king into a corner rather than shuffling.
 */
export function evaluate(state: GameState, values = pieceValues(state.rules)): number {
  let score = MOBILITY * state.legal.length;
  for (const placed of Object.values(state.position)) {
    if (placed.side === state.turn) score += values[placed.piece] ?? 0;
    else if (state.order.includes(placed.side)) score -= values[placed.piece] ?? 0;
  }
  return score;
}

/** The score of a finished game from the side to move, `ply` moves from the root. */
function terminal(state: GameState, ply: number): number {
  const { result } = state;
  if (result.status !== 'win') return 0;
  return result.winner === state.turn ? MATE - ply : -(MATE - ply);
}

const OUT_OF_NODES = Symbol('out of nodes');

/** The move the search rates best for the side to move, or none when the game is over. */
export function bestMove(state: GameState, options: SearchOptions = {}): SearchResult {
  const { nodes: budget = 2000, depth: maxDepth = 6, random } = options;
  if (state.result.status !== 'ongoing' || state.legal.length === 0) {
    return { move: undefined, score: 0, depth: 0, nodes: 0 };
  }
  const values = pieceValues(state.rules);
  let nodes = 0;
  const play = (s: GameState, m: GeneratedMove): GameState => {
    if (nodes >= budget) throw OUT_OF_NODES;
    nodes++;
    return playMove(s, m);
  };

  // Captures first, the most valuable victim by the least valuable attacker, then promotions.
  const gain = (m: GeneratedMove) =>
    (m.capture !== undefined ? 16 * (values[m.capture] ?? 0) - (values[m.piece] ?? 0) : 0) +
    (m.promotion !== undefined ? (values[m.promotion] ?? 0) : 0);
  const ordered = (moves: GeneratedMove[]) =>
    moves
      .map((m, i) => [m, gain(m), i] as const)
      .sort((a, b) => b[1] - a[1] || a[2] - b[2])
      .map(([m]) => m);

  function quiesce(s: GameState, alpha: number, beta: number, ply: number, left: number): number {
    if (s.result.status !== 'ongoing') return terminal(s, ply);
    const stand = evaluate(s, values);
    if (left === 0 || stand >= beta) return stand;
    let best = stand;
    if (best > alpha) alpha = best;
    for (const m of ordered(s.legal.filter((x) => x.capture !== undefined))) {
      const score = -quiesce(play(s, m), -beta, -alpha, ply + 1, left - 1);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function negamax(s: GameState, depth: number, alpha: number, beta: number, ply: number): number {
    if (s.result.status !== 'ongoing') return terminal(s, ply);
    if (depth <= 0) return quiesce(s, alpha, beta, ply, QUIESCENCE_PLIES);
    let best = -Infinity;
    for (const m of ordered(s.legal)) {
      const score = -negamax(play(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Iterative deepening: each finished depth reorders the root moves best first for the next.
  // A depth cut short by the budget is dropped, except the first, which keeps what it finished.
  let ranked = ordered(state.legal);
  let ties: GeneratedMove[] = [ranked[0]!];
  let score = 0;
  let depth = 0;
  for (let d = 1; d <= maxDepth; d++) {
    const scored: [GeneratedMove, number][] = [];
    let complete = true;
    try {
      let alpha = -Infinity;
      for (const m of ranked) {
        // Integer scores: a window just under the best so far scores equal moves exactly.
        const s = -negamax(play(state, m), d - 1, -Infinity, -(alpha - 1), 1);
        scored.push([m, s]);
        if (s > alpha) alpha = s;
      }
    } catch (e) {
      if (e !== OUT_OF_NODES) throw e;
      complete = false;
    }
    if (!complete && (d > 1 || scored.length === 0)) break;
    const top = Math.max(...scored.map(([, s]) => s));
    ties = scored.filter(([, s]) => s === top).map(([m]) => m);
    score = top;
    depth = d;
    if (!complete) break;
    const rank = new Map(scored.map(([m, s]) => [m, s]));
    ranked = [...ranked].sort((a, b) => rank.get(b)! - rank.get(a)!);
    if (Math.abs(top) >= MATE - maxDepth - QUIESCENCE_PLIES) break; // A forced mate is found.
  }
  const move = random
    ? ties[Math.min(ties.length - 1, Math.floor(random() * ties.length))]
    : ties[0];
  return { move, score, depth, nodes };
}
