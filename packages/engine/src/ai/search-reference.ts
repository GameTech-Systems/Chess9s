// The search as S23 built it, frozen in S35 as the baseline for the equivalence test and the
// benchmark (decision 0009): the faster search in search.ts must return the same move, score and
// depth wherever this one finishes. Not for play; change nothing in how it searches. It shares
// the evaluation, and S35 added only the `capped` report.
import { playMove, type GameState } from '../game/game';
import type { GeneratedMove } from '../moves/generate';
import { evaluate, pieceValues, type SearchOptions, type SearchResult } from './search';

/** A checkmate's score, less one per ply it takes to reach, so a faster mate scores higher. */
const MATE = 1_000_000;
/** Most captures in a row the quiescence search follows past the nominal depth. */
const QUIESCENCE_PLIES = 4;

/** The score of a finished game from the side to move, `ply` moves from the root. */
function terminal(state: GameState, ply: number): number {
  const { result } = state;
  if (result.status !== 'win') return 0;
  return result.winner === state.turn ? MATE - ply : -(MATE - ply);
}

const OUT_OF_NODES = Symbol('out of nodes');

/** The S23 search's move for the side to move. */
export function referenceBestMove(state: GameState, options: SearchOptions = {}): SearchResult {
  const { nodes: budget = 2000, depth: maxDepth = 6, random } = options;
  if (state.result.status !== 'ongoing' || state.legal.length === 0) {
    return { move: undefined, score: 0, depth: 0, nodes: 0, capped: false };
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
  let capped = false;
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
      capped = true;
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
  return { move, score, depth, nodes, capped };
}
