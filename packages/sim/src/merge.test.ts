// Sharded runs (S35, decision 0009): each shard plays a fixed slice of a run's seeds and keeps its
// games; merging every shard gives the same fairness report as playing the run in one go.
import { describe, expect, it } from 'vitest';
import { options, planJobs, runReports, type Options } from './cli';
import { loadSource, rulesFor } from './load';
import { mergeShards, shardResult, type ShardResult } from './merge';
import { playGame, type GameSummary } from './play';
import { buildReport, type FairnessReport } from './report';

const source = loadSource(new URL('../../../', import.meta.url).pathname);
const DATE = '2026-10-20';

/** Plays every job's games here as the worker pool would, stopping each after 20 plies. */
function play(o: Options) {
  const plan = planJobs(o, source);
  const games: GameSummary[][] = plan.jobs.map((j) => {
    const { rules, ruleset } = rulesFor(source, j.rulesetId, j.overrides);
    return j.seeds.map((seed) => playGame(rules, ruleset, { ...j.options, maxPlies: 20, seed }));
  });
  return { plan, games };
}

const small = (extra: string[] = []) =>
  options(['--games', '6', '--depths', '1', '--nodes', '300', '--seed', '11', ...extra], 1);

const withoutSeconds = (r: FairnessReport) => ({
  ...r,
  runs: r.runs.map((run) => ({ ...run, seconds: 0 })),
});

const played = new Map<number, ShardResult[]>();
function shards(count: number): ShardResult[] {
  if (played.has(count)) return played.get(count)!;
  const all = Array.from({ length: count }, (_, i) => {
    const o = small(['--shard', `${i + 1}/${count}`]);
    const { plan, games } = play(o);
    return shardResult(
      o,
      plan,
      games,
      plan.jobs.map(() => 0),
      DATE,
    );
  });
  played.set(count, all);
  return all;
}

describe('sharded runs', { timeout: 30_000 }, () => {
  it('split the seeds into fixed, interleaved slices that cover the run once', () => {
    const seeds = [1, 2, 3].map(
      (k) => planJobs(small(['--shard', `${k}/3`]), source).jobs[0]!.seeds,
    );
    expect(seeds).toEqual([
      [11, 14],
      [12, 15],
      [13, 16],
    ]);
  });

  it('merge into the same report as one unsharded run', () => {
    const o = small();
    const { plan, games } = play(o);
    const whole = buildReport(
      plan.ruleset,
      DATE,
      runReports(
        o,
        plan,
        games,
        plan.jobs.map(() => 0),
      ),
      plan.skipped,
      o.overrides,
    );
    const { report, missing } = mergeShards(shards(3));
    expect(missing).toEqual([]);
    expect(withoutSeconds(report)).toEqual(withoutSeconds(whole));
    expect(report.runs[0]!.summary.games).toBe(6);
  });

  it('merge whatever shards there are, in any order, and name the missing ones', () => {
    const [a, b, c] = shards(3);
    const { report, missing } = mergeShards([c!, a!]);
    expect(missing).toEqual([2]);
    expect(report.runs[0]!.summary.games).toBe(4);
    expect(report.runs[0]!.summary.flags).toContain('too few games');
    void b;
  });

  it('keep the runs of an earlier report that the shards did not play', () => {
    const merged = mergeShards(shards(3)).report;
    const earlier = buildReport(
      merged.ruleset,
      '2026-10-01',
      [
        { ...merged.runs[0]!, depth: 2, seed: 99 },
        { ...merged.runs[0]!, seed: 99 },
      ],
      [],
      merged.overrides,
    );
    const { report } = mergeShards(shards(3), earlier);
    expect(report.runs.map((r) => [r.depth, r.seed])).toEqual([
      [2, 99],
      [1, 11],
    ]);
    expect(report.date).toBe(DATE);
    expect(() => mergeShards(shards(3), { ...earlier, overrides: { 'king.range': 1 } })).toThrow(
      /different ruleset or measures/,
    );
    expect(() =>
      mergeShards(shards(3), {
        ...earlier,
        measures: { ...earlier.measures, version: 1 } as unknown as typeof earlier.measures,
      }),
    ).toThrow(/different ruleset or measures/);
  });

  it('refuse a shard twice, and shards of different runs', () => {
    const [a, b] = shards(2);
    expect(() => mergeShards([a!, a!])).toThrow(/shard 1 of 2 twice/);
    expect(() => mergeShards([a!, { ...b!, nodes: 999 }])).toThrow(/different run/);
    expect(() => mergeShards([a!, { ...b!, shard: { index: 2, count: 3 } }])).toThrow(
      /different run/,
    );
    expect(() => mergeShards([])).toThrow(/No shard/);
  });
});
