// A run's games summed up against the D12 measures (decision 0008).
import { MEASURES, type Measures } from './measures';
import type { GameSummary } from './play';

export interface RunSummary {
  games: number;
  firstWins: number;
  secondWins: number;
  draws: number;
  /** First-player score: (wins + ½ draws) / games. */
  score: number;
  /** 95% Wilson interval on the score, counting a draw as half a win. */
  interval: [number, number];
  drawRate: number;
  /** Wins by color (side id). */
  winsBySide: Record<string, number>;
  /** Games by how they ended: checkmate, stalemate or a draw reason. */
  results: Record<string, number>;
  plies: { mean: number; median: number; min: number; max: number };
  distinct: number;
  unfinished: number;
  minDepth: number;
  /** Moves on which the node budget ran out (not counted in reports before S35). */
  capped?: number;
  flags: string[];
  pass: boolean;
}

/** The 95% Wilson score interval for a proportion `p` over `n` trials. */
export function wilson(p: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

const count = (into: Record<string, number>, key: string) => {
  into[key] = (into[key] ?? 0) + 1;
};

/** The band as a label, "47–53%". */
export const bandLabel = (m: Measures) =>
  `${Math.round(m.band.min * 100)}–${Math.round(m.band.max * 100)}%`;

export function summarize(games: GameSummary[], measures: Measures = MEASURES): RunSummary {
  const n = games.length;
  let firstWins = 0;
  let secondWins = 0;
  const winsBySide: Record<string, number> = {};
  const results: Record<string, number> = {};
  for (const g of games) {
    if (g.outcome === 'first') firstWins++;
    if (g.outcome === 'second') secondWins++;
    if (g.winner !== null) count(winsBySide, g.winner);
    count(results, g.reason);
  }
  const draws = n - firstWins - secondWins;
  const score = n === 0 ? 0 : (firstWins + draws / 2) / n;
  const lengths = games.map((g) => g.plies).sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median =
    n === 0 ? 0 : n % 2 === 1 ? lengths[mid]! : (lengths[mid - 1]! + lengths[mid]!) / 2;
  const unfinished = results['unfinished'] ?? 0;

  // Rounded to a hundredth of a percent first, so 47.00% computed as 0.46999… still passes.
  const rounded = Math.round(score * 10000) / 10000;
  const flags: string[] = [];
  if (n > 0 && (rounded < measures.band.min || rounded > measures.band.max))
    flags.push(`score outside ${bandLabel(measures)}`);
  if (n < measures.minGames) flags.push('too few games');
  if (unfinished > 0) flags.push('unfinished games');

  return {
    games: n,
    firstWins,
    secondWins,
    draws,
    score,
    interval: wilson(score, n),
    drawRate: n === 0 ? 0 : draws / n,
    winsBySide,
    results,
    plies: {
      mean: n === 0 ? 0 : lengths.reduce((a, b) => a + b, 0) / n,
      median,
      min: lengths[0] ?? 0,
      max: lengths[n - 1] ?? 0,
    },
    distinct: new Set(games.map((g) => g.key)).size,
    unfinished,
    minDepth: n === 0 ? 0 : Math.min(...games.map((g) => g.minDepth)),
    capped: games.reduce((a, g) => a + g.capped, 0),
    flags,
    pass: flags.length === 0,
  };
}
