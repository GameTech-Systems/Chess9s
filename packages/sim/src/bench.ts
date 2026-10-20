// Search benchmark (S35, decision 0009): runs the search on a fixed set of positions and reports
// the positions it visits per move and the share of moves that hit the node budget, for the
// current search and for the S23 search it must agree with wherever that one finishes.
// Positions are data (bench/positions.json): seeded self-play games, each kept as its moves from
// the start, and the plies after which the benchmark searches.
import {
  bestMove,
  newGame,
  playMove,
  referenceBestMove,
  toNotation,
  type GameState,
  type MoveRules,
  type SearchResult,
} from '@chess9s/engine';
import { seeded } from './play';

export interface BenchGame {
  seed: number;
  /** Plies after which the position is searched. */
  plies: number[];
  /** The game's moves in notation, space-separated, up to its last sampled ply. */
  moves: string;
}

export interface BenchPositions {
  description: string;
  ruleset: { id: string; version: string };
  games: BenchGame[];
}

/** Each sampled position, named by its game's seed and ply, as moves from the start. */
export function positionsOf(data: BenchPositions): { name: string; moves: string[] }[] {
  return data.games.flatMap((g) => {
    const moves = g.moves.split(' ').filter((m) => m !== '');
    return g.plies.map((ply) => ({
      name: `seed ${g.seed} ply ${ply}`,
      moves: moves.slice(0, ply),
    }));
  });
}

/** The game after `moves` (notation) from the start. */
export function replay(
  rules: MoveRules,
  ruleset: { id: string; version: string },
  moves: string[],
): GameState {
  let state = newGame(rules, ruleset);
  for (const n of moves) {
    const found = state.legal.filter((m) => toNotation(m) === n);
    if (found.length !== 1)
      throw new Error(`${n} is not one legal move after ${state.moves.length} plies`);
    state = playMove(state, found[0]!);
  }
  return state;
}

/**
 * Positions from seeded self-play games: `openingPlies` random plies, then the search at
 * `depth`. Samples every `every`-th ply from `from` on, and every position where the search ran
 * out of nodes, while the game is still going (and before `maxPlies`).
 */
export function samplePositions(
  rules: MoveRules,
  ruleset: { id: string; version: string },
  o: {
    seeds: number[];
    depth: number;
    nodes: number;
    openingPlies: number;
    from: number;
    every: number;
    maxPlies: number;
  },
  onMove?: (seed: number, ply: number, nodes: number, capped: boolean) => void,
): BenchGame[] {
  return o.seeds.map((seed) => {
    const random = seeded(seed);
    const plies: number[] = [];
    let state = newGame(rules, ruleset);
    while (state.result.status === 'ongoing' && state.moves.length < o.maxPlies) {
      const ply = state.moves.length;
      if (ply < o.openingPlies) {
        state = playMove(state, state.legal[Math.floor(random() * state.legal.length)]!);
        continue;
      }
      const found = bestMove(state, { depth: o.depth, nodes: o.nodes, random });
      onMove?.(seed, ply, found.nodes, found.capped);
      if ((ply >= o.from && (ply - o.from) % o.every === 0) || found.capped) plies.push(ply);
      state = playMove(state, found.move!);
    }
    const last = plies.at(-1) ?? 0;
    return {
      seed,
      plies,
      moves: state.moves
        .slice(0, last)
        .map((m) => m.notation)
        .join(' '),
    };
  });
}

export interface Measured {
  nodes: number;
  ms: number;
  depth: number;
  capped: boolean;
  move: string | null;
  score: number;
}

export interface BenchRow {
  name: string;
  plies: number;
  legal: number;
  search: Measured;
  reference?: Measured;
  /** Same move, score and depth as the reference, whose search finished. */
  same?: boolean;
}

/** Fixed tie-breaks, so a different tie order shows up as a different move. */
const PICKS = [0, 0.5, 0.999];

function measure(run: () => SearchResult): Measured {
  const start = performance.now();
  const r = run();
  return {
    nodes: r.nodes,
    ms: performance.now() - start,
    depth: r.depth,
    capped: r.capped,
    move: r.move ? toNotation(r.move) : null,
    score: r.score,
  };
}

export function benchPosition(
  state: GameState,
  name: string,
  o: { depth: number; nodes: number; reference: boolean },
): BenchRow {
  const search = measure(() => bestMove(state, { depth: o.depth, nodes: o.nodes }));
  const row: BenchRow = { name, plies: state.moves.length, legal: state.legal.length, search };
  if (!o.reference) return row;
  row.reference = measure(() => referenceBestMove(state, { depth: o.depth, nodes: o.nodes }));
  if (!row.reference.capped) {
    row.same = PICKS.every((p) => {
      const a = bestMove(state, { depth: o.depth, nodes: o.nodes, random: () => p });
      const b = referenceBestMove(state, { depth: o.depth, nodes: o.nodes, random: () => p });
      return (
        a.depth === b.depth && a.score === b.score && toNotation(a.move!) === toNotation(b.move!)
      );
    });
  }
  return row;
}

export interface BenchStats {
  moves: number;
  nodes: { mean: number; median: number; p95: number; max: number };
  capped: number;
  cappedShare: number;
  msPerMove: number;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]!;
}

export function benchStats(rows: Measured[]): BenchStats {
  const nodes = rows.map((r) => r.nodes).sort((a, b) => a - b);
  const n = rows.length;
  const capped = rows.filter((r) => r.capped).length;
  return {
    moves: n,
    nodes: {
      mean: n === 0 ? 0 : Math.round(nodes.reduce((a, b) => a + b, 0) / n),
      median: quantile(nodes, 0.5),
      p95: quantile(nodes, 0.95),
      max: nodes[n - 1] ?? 0,
    },
    capped,
    cappedShare: n === 0 ? 0 : capped / n,
    msPerMove: n === 0 ? 0 : Math.round(rows.reduce((a, r) => a + r.ms, 0) / n),
  };
}
