// Sharded runs (S35, decision 0009): each shard plays a fixed slice of a run's seeds and keeps its
// games; merging every shard gives the same fairness report as playing the run in one go.
import { describe, expect, it } from 'vitest';
import { options, planJobs, runReports, type Options } from './cli';
import { loadSource, rulesFor } from './load';
import { planJobs3, runReports3 } from './cli3';
import {
  mergeShards,
  mergeShards3,
  shardResult,
  type ShardResult,
  type ShardResult3,
} from './merge';
import { playGame, type GameSummary } from './play';
import { playGame3, type Summary3 } from './play3';
import { buildReport, type FairnessReport } from './report';
import { buildReport3 } from './report3';

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

describe('sharded 3-player runs (S59)', { timeout: 30_000 }, () => {
  const three = (extra: string[] = []) =>
    options(['--players', '3', '--greedy', '--games', '6', '--seed', '3', ...extra], 1);

  function play3(o: Options) {
    const plan = planJobs3(o, source);
    const games: Summary3[][] = plan.jobs.map((j) => {
      const { rules, ruleset } = rulesFor(source, j.rulesetId, j.overrides);
      return j.seeds.map((seed) => playGame3(rules, ruleset, { ...j.options, maxPlies: 20, seed }));
    });
    return { plan, games };
  }

  const shards3 = (count: number): ShardResult3[] =>
    Array.from({ length: count }, (_, i) => {
      const o = three(['--shard', `${i + 1}/${count}`]);
      const { plan, games } = play3(o);
      return shardResult(
        o,
        plan,
        games,
        plan.jobs.map(() => 0),
        DATE,
      );
    });

  it('carry the player count and mode, and merge into the same balance report as one run', () => {
    const all = shards3(2);
    expect(all[0]).toMatchObject({ players: 3, mode: 'greedy', decision: '0015' });
    const o = three();
    const { plan, games } = play3(o);
    const whole = buildReport3(
      plan.ruleset,
      DATE,
      plan.mode,
      runReports3(
        o,
        plan,
        games,
        plan.jobs.map(() => 0),
      ),
      plan.skipped,
      o.overrides,
    );
    const { report, missing } = mergeShards3([all[1]!, all[0]!]);
    expect(missing).toEqual([]);
    expect(report).toEqual(whole);
    expect(report.runs[0]!.summary.games).toBe(6);
  });

  it('keep an earlier report’s other runs, and refuse 2-player shards or another mode', () => {
    const merged = mergeShards3(shards3(2)).report;
    const earlier = { ...merged, runs: [{ ...merged.runs[0]!, depth: 2 }] };
    expect(mergeShards3(shards3(2), earlier).report.runs.map((r) => r.depth)).toEqual([2, 0]);
    expect(() => mergeShards3(shards3(2), { ...earlier, mode: 'search' })).toThrow(
      /different ruleset, mode or measures/,
    );
    expect(() => mergeShards3(shards(2) as unknown as ShardResult3[])).toThrow(/decision 0008/);
  });
});
