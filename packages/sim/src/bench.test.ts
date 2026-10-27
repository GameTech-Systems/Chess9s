// The search benchmark (S35, decision 0009): positions come from data as games and plies, each
// position is searched by the current and the S23 search, and the results are summed up.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import data from '../bench/positions.json';
import { benchPosition, benchStats, positionsOf, replay, type BenchPositions } from './bench';
import { loadSource, rulesFor } from './load';

const source = loadSource(new URL('../../../', import.meta.url).pathname);
const { rules, ruleset } = rulesFor(source, 'draft-2p');

describe('benchmark positions', () => {
  const positions = positionsOf(data as BenchPositions);

  it('are for the ruleset as it is now, and replay legally', () => {
    expect((data as BenchPositions).ruleset).toEqual(ruleset);
    expect(positions.length).toBeGreaterThan(100);
    const [first] = positions;
    expect(first!.name).toBe('seed 1 ply 8');
    expect(replay(rules, ruleset, first!.moves).moves).toHaveLength(8);
  });

  it('refuses a move that is not legal', () => {
    expect(() => replay(rules, ruleset, ['a1-a9'])).toThrow(/a1-a9/);
  });
});

describe('benchPosition', () => {
  it('measures both searches and compares them where the S23 search finishes', () => {
    const state = replay(rules, ruleset, positionsOf(data as BenchPositions)[0]!.moves);
    const row = benchPosition(state, 'p', { depth: 1, nodes: 100_000, reference: true });
    expect(row.search).toMatchObject({ depth: 1, capped: false });
    expect(row.reference).toMatchObject({ depth: 1, capped: false });
    expect(row.same).toBe(true);
  });

  it('marks a search the budget cut short', () => {
    const state = replay(rules, ruleset, []);
    const row = benchPosition(state, 'start', { depth: 2, nodes: 50, reference: true });
    expect(row.search.capped).toBe(true);
    expect(row.same).toBeUndefined();
  });
});

describe('the 2-player results', () => {
  // S62 taught the search 3-player games; 2-player positions must search exactly as before: the
  // same positions visited, move, score and depth as the recorded S35 reports, on every tenth one.
  it.each([1, 2])(
    'are unchanged at depth %i',
    (depth) => {
      const report = JSON.parse(
        readFileSync(
          new URL(`../../../docs/benchmarks/search-depth${depth}.json`, import.meta.url),
          'utf8',
        ),
      ) as {
        ruleset: unknown;
        nodes: number;
        rows: { name: string; search: Record<string, unknown> }[];
      };
      expect(report.ruleset).toEqual(ruleset);
      const byName = new Map(positionsOf(data as BenchPositions).map((p) => [p.name, p.moves]));
      const rows = report.rows.filter((_, i) => i % 10 === 0);
      for (const row of rows) {
        const state = replay(rules, ruleset, byName.get(row.name)!);
        const now = benchPosition(state, row.name, {
          depth,
          nodes: report.nodes,
          reference: false,
        });
        const { nodes, depth: d, capped, move, score } = row.search;
        expect({ ...now.search, ms: 0 }).toEqual({ nodes, ms: 0, depth: d, capped, move, score });
      }
    },
    60_000,
  );
});

describe('benchStats', () => {
  it('sums up positions per move and the share that hit the budget', () => {
    const m = (nodes: number, capped = false) => ({
      nodes,
      ms: 10,
      depth: 2,
      capped,
      move: 'a1-a2',
      score: 0,
    });
    const s = benchStats([m(100), m(300), m(200), m(1000, true)]);
    expect(s).toEqual({
      moves: 4,
      nodes: { mean: 400, median: 200, p95: 1000, max: 1000 },
      capped: 1,
      cappedShare: 0.25,
      msPerMove: 10,
    });
  });
});
