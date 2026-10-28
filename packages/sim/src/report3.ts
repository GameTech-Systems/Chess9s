// A 3-player balance report (decision 0015, D60): every run's seat scores, the verdict for the
// ruleset as it is, the sweep combinations worth a closer look, and those that could not be played.
// Written as JSON for tools and Markdown for people, beside the 2-player reports (report.ts).
import { MEASURES_3P, type Measures3 } from './measures3';
import type { RunReport, Skipped, Verdict } from './report';
import { band3Label, ENDINGS, type Ending, type Run3Summary } from './stats3';

/**
 * Who plays: the search on every seat (scored against D60), the greedy player on every seat (S58),
 * or the greedy Dragon against searching Kinged players (reported, not scored).
 */
export type Mode3 = 'search' | 'greedy' | 'greedy-dragon';

export interface RunReport3 extends Omit<RunReport, 'summary'> {
  summary: Run3Summary;
}

export interface FairnessReport3 {
  players: 3;
  ruleset: { id: string; version: string };
  /** Overrides on top of the ruleset for every run (`--set`). */
  overrides: Record<string, unknown>;
  date: string;
  decision: string;
  measures: Measures3;
  mode: Mode3;
  verdict: Verdict | 'not scored';
  runs: RunReport3[];
  /** Sweep combinations whose runs raised a flag other than too few games. */
  flagged: string[];
  skipped: Skipped[];
}

const SCREENING = 'too few games';
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** A sweep run's flags; a screening run is flagged for a seat only when its whole interval misses. */
function sweepFlags(s: Run3Summary, m: Measures3): string[] {
  if (!s.flags.includes(SCREENING)) return s.flags;
  const flags = s.flags.filter((f) => f !== SCREENING && !f.includes(' score outside '));
  const seats = Object.entries(s.seats).flatMap(([id, seat]) => {
    const [lo, hi] = seat.interval;
    return s.finished > 0 && (hi < m.band.min || lo > m.band.max)
      ? [`${id} interval ${(lo * 100).toFixed(1)}–${pct(hi)} outside ${band3Label(m)}`]
      : [];
  });
  return [...seats, ...flags];
}

function verdictOf(runs: RunReport3[], m: Measures3): Verdict {
  const own = runs.filter((r) => r.combination === 'default');
  const full = (r: RunReport3) => r.summary.games >= m.minGames;
  if (own.some((r) => full(r) && r.summary.flags.some((f) => f.includes(' score outside ')))) {
    return 'fail';
  }
  return m.depths.every((d) => own.some((r) => r.depth === d && r.summary.pass))
    ? 'pass'
    : 'incomplete';
}

export function buildReport3(
  ruleset: { id: string; version: string },
  date: string,
  mode: Mode3,
  runs: RunReport3[],
  skipped: Skipped[] = [],
  overrides: Record<string, unknown> = {},
  measures: Measures3 = MEASURES_3P,
): FairnessReport3 {
  const flagged = runs
    .filter((r) => r.combination !== 'default')
    .map((r) => [r, sweepFlags(r.summary, measures)] as const)
    .filter(([, flags]) => flags.length > 0)
    .map(([r, flags]) => `${r.combination} at ${depthLabel(r)}: ${flags.join(', ')}`);
  return {
    players: 3,
    ruleset,
    overrides,
    date,
    decision: measures.decision,
    measures,
    mode,
    verdict: mode === 'search' ? verdictOf(runs, measures) : 'not scored',
    runs,
    flagged,
    skipped,
  };
}

/** Greedy runs have no search depth: they are run at depth 0. */
const depthLabel = (r: RunReport3) => (r.depth === 0 ? 'greedy' : `depth ${r.depth}`);

const num = (x: number) => x.toLocaleString('en-US');

const PLAYERS: Record<Mode3, string> = {
  search: 'The paranoid search (S62) plays every seat, so the seats are measured with equal play.',
  greedy: 'The greedy player (S58) plays every seat. Reported, not scored against D60.',
  'greedy-dragon':
    'The greedy Dragon (S58) plays against Kinged players who search (S62): what players meet against the computer Dragon. Reported, not scored against D60.',
};

export function toMarkdown3(report: FairnessReport3): string {
  const { measures: m } = report;
  const seats = Object.keys(report.runs[0]?.summary.seats ?? {});
  const extra = Object.entries(report.overrides).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  const lines = [
    `# Balance report: ${report.ruleset.id} ${report.ruleset.version}${extra.length ? ` with ${extra.join(', ')}` : ''}${report.mode === 'search' ? '' : ` (${report.mode})`}`,
    '',
    `Verdict: **${report.verdict}** (${report.date}).`,
    '',
    `Measured as decision ${report.decision} (version ${m.version}) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be ${band3Label(m)} over at least ${num(m.minGames)} games at each of depths ${m.depths.join(' and ')}. Games stopped at the cap (${num(m.maxPlies)} plies) are reported, not scored; more than ${Math.round(m.maxCapped * 100)}% of them flags the run for the owner. ${PLAYERS[report.mode]} Each game opens with ${m.openingPlies} random plies; at most ${num(m.nodes)} positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.`,
    '',
    '## Runs',
    '',
    `Seat scores, with the 95% interval in brackets.`,
    '',
    `| Combination | Depth | Games | ${seats.join(' | ')} | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |`,
    `| --- | --- | --- | ${seats.map(() => '---').join(' | ')} | --- | --- | --- | --- | --- |`,
  ];
  for (const r of report.runs) {
    const s = r.summary;
    const scores = seats.map((id) => {
      const seat = s.seats[id];
      if (!seat) return '–';
      const [lo, hi] = seat.interval;
      return `${pct(seat.score)} (${(lo * 100).toFixed(1)}–${pct(hi)})`;
    });
    lines.push(
      `| ${r.combination} | ${r.depth === 0 ? 'greedy' : r.depth} | ${s.games} | ${scores.join(' | ')} | ${s.draws} | ${s.unfinished} | ${s.plies.mean.toFixed(0)} / ${s.plies.median} / ${s.plies.min}–${s.plies.max} | ${s.distinct} | ${s.flags.join(', ') || 'none'} |`,
    );
  }
  lines.push('', '## How the games ended', '');
  for (const r of report.runs.filter((x) => x.combination === 'default')) {
    const s = r.summary;
    const time =
      r.seconds === undefined
        ? ''
        : ` ${(r.seconds / Math.max(1, s.games)).toFixed(1)} s per game.`;
    lines.push(`### ${depthLabel(r).replace(/^d/, 'D')}`, '');
    lines.push('| Ending (decision 0016) | Games |', '| --- | --- |');
    for (const key of Object.keys(ENDINGS) as Ending[]) {
      const count = s.endings[key];
      if (count) lines.push(`| ${ENDINGS[key]} | ${count} |`);
    }
    const list = (o: Record<string, number>) =>
      Object.entries(o)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k} ${v}`)
        .join(', ') || 'none';
    const wins = Object.entries(s.seats)
      .map(([id, seat]) => `${id} ${seat.wins} (${list(seat.winsBy)})`)
      .join('; ');
    lines.push(
      '',
      `Wins by seat: ${wins}. Draws by who shares them: ${list(s.drawsBetween)}. By reason: ${list(s.results)}. Games in which it happened: ${list(s.events)}.${time}`,
      '',
    );
  }
  lines.push('## Flagged combinations', '');
  lines.push(...(report.flagged.length ? report.flagged.map((f) => `- ${f}`) : ['None.']));
  lines.push('', '## Skipped combinations', '');
  lines.push(
    ...(report.skipped.length
      ? report.skipped.map((s) => `- ${s.combination}: ${s.reason}`)
      : ['None.']),
  );
  return lines.join('\n') + '\n';
}
