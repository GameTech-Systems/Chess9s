// Fairness reports (decision 0008): the verdict for the ruleset, and the JSON and Markdown forms.
import { describe, expect, it } from 'vitest';
import { buildReport, toMarkdown, type RunReport } from './report';
import type { RunSummary } from './stats';

const summary = (over: Partial<RunSummary> = {}): RunSummary => ({
  games: 2000,
  firstWins: 900,
  secondWins: 900,
  draws: 200,
  score: 0.5,
  interval: [0.478, 0.522],
  drawRate: 0.1,
  winsBySide: { dark: 900, light: 900 },
  results: { checkmate: 1800, repetition: 200 },
  plies: { mean: 150, median: 140, min: 20, max: 600 },
  distinct: 2000,
  unfinished: 0,
  minDepth: 1,
  flags: [],
  pass: true,
  ...over,
});

const run = (
  depth: number,
  over: Partial<RunSummary> = {},
  combination = 'default',
): RunReport => ({
  combination,
  overrides: {},
  depth,
  nodes: 100000,
  seed: 1,
  summary: summary(over),
});

const ruleset = { id: 'draft-2p', version: '0.2.0' };

describe('verdict', () => {
  it('passes when the ruleset passes at both depths', () => {
    expect(buildReport(ruleset, '2026-10-20', [run(1), run(2)], []).verdict).toBe('pass');
  });

  it('fails when a full run is outside the band', () => {
    const r = buildReport(
      ruleset,
      '2026-10-20',
      [run(1), run(2, { score: 0.56, pass: false, flags: ['score outside 47–53%'] })],
      [],
    );
    expect(r.verdict).toBe('fail');
  });

  it('is incomplete while a depth is missing or short of games', () => {
    expect(buildReport(ruleset, '2026-10-20', [run(1)], []).verdict).toBe('incomplete');
    const short = run(2, { games: 50, pass: false, flags: ['too few games'] });
    expect(buildReport(ruleset, '2026-10-20', [run(1), short], []).verdict).toBe('incomplete');
  });

  it('ignores sweep combinations for the verdict but lists their flags', () => {
    const flagged = run(
      1,
      { score: 0.6, pass: false, flags: ['score outside 47–53%'] },
      'king.range=1',
    );
    const r = buildReport(ruleset, '2026-10-20', [run(1), run(2), flagged], []);
    expect(r.verdict).toBe('pass');
    expect(r.flagged).toEqual(['king.range=1 at depth 1: score outside 47–53%']);
  });
});

describe('screening flags', () => {
  const screen = (score: number, interval: [number, number]) =>
    run(1, { games: 40, score, interval, pass: false, flags: ['too few games'] }, 'king.range=1');

  it('flags a short sweep run only when its whole interval misses the band', () => {
    const r = buildReport(ruleset, '2026-10-20', [screen(0.75, [0.6, 0.86])], []);
    expect(r.flagged).toEqual(['king.range=1 at depth 1: interval 60.0–86.0% outside 47–53%']);
  });

  it('does not flag a short run whose interval reaches the band, however far its score is', () => {
    const r = buildReport(ruleset, '2026-10-20', [screen(0.6, [0.45, 0.74])], []);
    expect(r.flagged).toEqual([]);
  });
});

describe('toMarkdown', () => {
  it('states the verdict, the measures and every run', () => {
    const r = buildReport(
      ruleset,
      '2026-10-20',
      [run(1), run(1, { score: 0.6, pass: false, flags: ['too few games'] }, 'king.range=1')],
      [{ combination: 'queen.pawnSwap=true', reason: 'not built yet: queen.pawnSwap' }],
    );
    const md = toMarkdown(r);
    expect(md).toContain('# Fairness report: draft-2p 0.2.0');
    expect(md).toContain('Verdict: **incomplete**');
    expect(md).toContain('decision 0008');
    expect(md).toContain('| default | 1 | 2000 | 50.0% | 47.8–52.2% |');
    expect(md).toContain('| king.range=1 | 1 | 2000 | 60.0% |');
    expect(md).toContain('queen.pawnSwap=true');
    expect(md).toContain('not built yet: queen.pawnSwap');
  });
});
