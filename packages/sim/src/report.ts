// A fairness report (decision 0008): every run's summary, the verdict for the ruleset as it is,
// the sweep combinations that need a closer look, and those that could not be played. Written as
// JSON for tools and Markdown for people.
import { MEASURES, type Measures } from './measures';
import { bandLabel, type RunSummary } from './stats';

export interface RunReport {
  combination: string;
  overrides: Record<string, unknown>;
  depth: number;
  nodes: number;
  /** Seed of the run's first game; game i uses seed + i. */
  seed: number;
  /** Time spent playing the games, summed over workers. */
  seconds?: number;
  summary: RunSummary;
}

export interface Skipped {
  combination: string;
  reason: string;
}

export type Verdict = 'pass' | 'fail' | 'incomplete';

export interface FairnessReport {
  ruleset: { id: string; version: string };
  /** Overrides on top of the ruleset for every run (`--set`). */
  overrides: Record<string, unknown>;
  date: string;
  decision: string;
  measures: Measures;
  verdict: Verdict;
  runs: RunReport[];
  /** Sweep combinations whose runs raised a flag other than too few games. */
  flagged: string[];
  skipped: Skipped[];
}

const SCREENING = 'too few games';

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/**
 * A sweep run's flags. With enough games, its own flags. A screening run (too few games) is
 * flagged for its score only when the whole 95% interval misses the band (decision 0008,
 * version 2): with 40 games the interval is about ±15 points, so a point estimate outside the
 * band is mostly chance.
 */
function sweepFlags(s: RunSummary, m: Measures): string[] {
  if (!s.flags.includes(SCREENING)) return s.flags;
  const [lo, hi] = s.interval;
  const flags = s.flags.filter((f) => f !== SCREENING && !f.startsWith('score outside'));
  if (s.games > 0 && (hi < m.band.min || lo > m.band.max)) {
    flags.unshift(`interval ${(lo * 100).toFixed(1)}–${pct(hi)} outside ${bandLabel(m)}`);
  }
  return flags;
}

/**
 * Pass when the ruleset as it is passes at every depth the measures name; fail when one of its
 * runs has enough games and is outside the band; otherwise incomplete.
 */
function verdictOf(runs: RunReport[], measures: Measures): Verdict {
  const own = runs.filter((r) => r.combination === 'default');
  const outside = `score outside ${bandLabel(measures)}`;
  if (own.some((r) => r.summary.games >= measures.minGames && r.summary.flags.includes(outside))) {
    return 'fail';
  }
  const passes = measures.depths.every((d) => own.some((r) => r.depth === d && r.summary.pass));
  return passes ? 'pass' : 'incomplete';
}

export function buildReport(
  ruleset: { id: string; version: string },
  date: string,
  runs: RunReport[],
  skipped: Skipped[],
  overrides: Record<string, unknown> = {},
  measures: Measures = MEASURES,
): FairnessReport {
  const flagged = runs
    .filter((r) => r.combination !== 'default')
    .map((r) => [r, sweepFlags(r.summary, measures)] as const)
    .filter(([, flags]) => flags.length > 0)
    .map(([r, flags]) => `${r.combination} at depth ${r.depth}: ${flags.join(', ')}`);
  return {
    ruleset,
    overrides,
    date,
    decision: measures.decision,
    measures,
    verdict: verdictOf(runs, measures),
    runs,
    flagged,
    skipped,
  };
}

const num = (x: number) => x.toLocaleString('en-US');

export function toMarkdown(report: FairnessReport): string {
  const { measures: m } = report;
  const extra = Object.entries(report.overrides).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  const lines = [
    `# Fairness report: ${report.ruleset.id} ${report.ruleset.version}${extra.length ? ` with ${extra.join(', ')}` : ''}`,
    '',
    `Verdict: **${report.verdict}** (${report.date}).`,
    '',
    `Measured as decision ${report.decision} (version ${m.version}) sets out (ledger D12): the first player's score, counting a draw as half, must be ${bandLabel(m)} over at least ${num(m.minGames)} games at each of depths ${m.depths.join(' and ')}. The same search plays both seats; each game opens with ${m.openingPlies} random plies; at most ${num(m.nodes)} positions per move; games stop at ${num(m.maxPlies)} plies. Runs with fewer games are screening only: a sweep combination is flagged when its whole 95% interval misses the band.`,
    '',
    '## Runs',
    '',
    '| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of report.runs) {
    const s = r.summary;
    const [lo, hi] = s.interval;
    lines.push(
      `| ${r.combination} | ${r.depth} | ${s.games} | ${pct(s.score)} | ${(lo * 100).toFixed(1)}–${pct(hi)} | ${pct(s.drawRate)} | ${s.firstWins} | ${s.secondWins} | ${s.plies.mean.toFixed(0)} / ${s.plies.median} / ${s.plies.min}–${s.plies.max} | ${s.distinct} | ${s.flags.join(', ') || 'none'} |`,
    );
  }
  lines.push('', '## How the games ended', '');
  for (const r of report.runs.filter((x) => x.combination === 'default')) {
    const s = r.summary;
    const endings = Object.entries(s.results)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
    const sides = Object.entries(s.winsBySide)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
    const time =
      r.seconds === undefined
        ? ''
        : `; ${(r.seconds / Math.max(1, s.games)).toFixed(1)} s per game`;
    lines.push(
      `- Depth ${r.depth}: ${endings || 'no games'}. Wins by color: ${sides || 'none'}. Shallowest search finished: depth ${s.minDepth}${time}.`,
    );
  }
  lines.push('', '## Flagged combinations', '');
  lines.push(...(report.flagged.length ? report.flagged.map((f) => `- ${f}`) : ['None.']));
  lines.push('', '## Skipped combinations', '');
  lines.push(
    ...(report.skipped.length
      ? report.skipped.map((s) => `- ${s.combination}: ${s.reason}`)
      : ['None.']),
  );
  return lines.join('\n') + '\n';
}
