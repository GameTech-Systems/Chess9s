// The 3-player balance report (decision 0015): the verdict for the ruleset as it is, the sweep
// combinations worth a closer look, and the runs that are reported but not scored.
import { describe, expect, it } from 'vitest';
import { MEASURES_3P } from './measures3';
import type { Summary3 } from './play3';
import { buildReport3, toMarkdown3, type RunReport3 } from './report3';
import { summarize3 } from './stats3';

const SEATS = ['dark', 'light', 'dragon'];

/** `n` games won in turn by the seats, `weights` games each (dark, light, dragon). */
function games(n: number, weights: [number, number, number]): Summary3[] {
  const cycle = weights.flatMap((w, i) => Array<string>(w).fill(SEATS[i]!));
  return Array.from({ length: n }, (_, i) => {
    const winner = cycle[i % cycle.length]!;
    return {
      seed: i,
      order: SEATS,
      dragon: 'dragon',
      outcome: 'win',
      winner,
      loser: SEATS.find((s) => s !== winner)!,
      reason: 'checkmate',
      between: null,
      events: [],
      plies: 100 + (i % 7),
      key: String(i),
    };
  });
}

const run = (
  combination: string,
  depth: number,
  g: Summary3[],
  overrides: Record<string, unknown> = {},
): RunReport3 => ({
  combination,
  overrides,
  depth,
  nodes: 100_000,
  seed: 1,
  seconds: 10,
  summary: summarize3(g),
});

const RULESET = { id: 'standard-3p', version: '0.1.0' };
const N = MEASURES_3P.minGames;

describe('buildReport3', () => {
  it('passes when the ruleset as it is passes at both depths', () => {
    const r = buildReport3(RULESET, '2026-10-27', 'search', [
      run('default', 1, games(N, [1, 1, 1])),
      run('default', 2, games(N, [1, 1, 1])),
    ]);
    expect(r.verdict).toBe('pass');
    expect(r).toMatchObject({ players: 3, decision: '0015', mode: 'search' });
  });

  it('is incomplete with one depth or too few games, and fails a full run outside the band', () => {
    const one = buildReport3(RULESET, 'd', 'search', [run('default', 1, games(N, [1, 1, 1]))]);
    expect(one.verdict).toBe('incomplete');
    const few = buildReport3(RULESET, 'd', 'search', [
      run('default', 1, games(30, [2, 1, 1])),
      run('default', 2, games(30, [1, 1, 1])),
    ]);
    expect(few.verdict).toBe('incomplete');
    const off = buildReport3(RULESET, 'd', 'search', [run('default', 1, games(N, [2, 1, 1]))]);
    expect(off.verdict).toBe('fail');
  });

  it('flags a screening combination only when a seat’s whole interval misses the band', () => {
    const r = buildReport3(RULESET, 'd', 'search', [
      run('default', 1, games(40, [1, 1, 1])),
      run('king.range=2', 1, games(40, [3, 2, 2]), { 'king.range': 2 }),
      run('dragonHead.range=3', 1, games(40, [1, 1, 4]), { 'dragonHead.range': 3 }),
    ]);
    expect(r.flagged).toHaveLength(1);
    expect(r.flagged[0]).toMatch(
      /^dragonHead\.range=3 at depth 1: dragon interval .* outside 28–38%/,
    );
  });

  it('reports a greedy Dragon run without scoring it against D60', () => {
    const r = buildReport3(RULESET, 'd', 'greedy-dragon', [
      run('default', 1, games(N, [1, 1, 1])),
      run('default', 2, games(N, [1, 1, 1])),
    ]);
    expect(r.verdict).toBe('not scored');
  });
});

describe('toMarkdown3', () => {
  const report = buildReport3(
    RULESET,
    '2026-10-27',
    'search',
    [
      run('default', 1, games(40, [1, 1, 1])),
      run('dragonHead.range=3', 1, games(40, [1, 1, 2]), { 'dragonHead.range': 3 }),
    ],
    [{ combination: 'x=1', reason: 'not built yet: x' }],
  );
  const md = toMarkdown3(report);

  it('has the verdict, the measures and a score column per seat', () => {
    expect(md).toContain('# Balance report: standard-3p 0.1.0');
    expect(md).toContain('Verdict: **incomplete**');
    expect(md).toContain('decision 0015 (version 1) sets out');
    expect(md).not.toContain('provisional');
    expect(md).toContain('28–38%');
    expect(md).toMatch(/\| Combination \| Depth \| Games \| dark \| light \| dragon \|/);
    expect(md).toContain('| default | 1 | 40 |');
  });

  it('lists the endings by the rows of decision 0016, and the skipped combinations', () => {
    expect(md).toContain('A Kinged player checkmates the other King');
    expect(md).toContain('- x=1: not built yet: x');
  });
});
