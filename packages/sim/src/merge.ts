// Shards of a run (S35, decision 0009). A shard plays a fixed slice of each run's seeds and keeps
// every game's summary, because the report needs all the games (the median length, the distinct
// games), not a summary of each slice. Merging puts the games back together and builds the same
// fairness report (decision 0008) that one unsharded run would have written. 3-player shards (S59)
// carry `players: 3` and their mode, and merge into the balance report of decision 0015.
import type { Options, Plan } from './cli';
import type { Plan3 } from './cli3';
import { MEASURES } from './measures';
import { MEASURES_3P } from './measures3';
import type { GameSummary } from './play';
import type { Summary3 } from './play3';
import { buildReport, type FairnessReport, type RunReport, type Skipped } from './report';
import { buildReport3, type FairnessReport3, type Mode3, type RunReport3 } from './report3';
import { summarize } from './stats';
import { summarize3 } from './stats3';

export interface ShardResult<G = GameSummary> {
  kind: 'chess9s-sim-shard';
  /** 3-player shards only: a 2-player shard leaves both out. */
  players?: 3;
  mode?: Mode3;
  shard: { index: number; count: number };
  ruleset: { id: string; version: string };
  /** Overrides on top of the ruleset for every run (`--set`). */
  overrides: Record<string, unknown>;
  date: string;
  decision: string;
  /** Version of the decision (0008, or 0015 for 3 players) the shard was played under. */
  version: number;
  /** The whole run's settings: games per run before sharding, its first seed, the budget. */
  games: number;
  seed: number;
  nodes: number;
  runs: {
    combination: string;
    overrides: Record<string, unknown>;
    depth: number;
    /** Time spent playing this shard's games, summed over workers. */
    seconds: number;
    games: G[];
  }[];
  skipped: Skipped[];
}

export type ShardResult3 = ShardResult<Summary3> & { players: 3; mode: Mode3 };

export function shardResult(
  o: Options,
  plan: Plan,
  games: GameSummary[][],
  ms: number[],
  date: string,
): ShardResult;
export function shardResult(
  o: Options,
  plan: Plan3,
  games: Summary3[][],
  ms: number[],
  date: string,
): ShardResult3;
export function shardResult(
  o: Options,
  plan: Plan | Plan3,
  games: (GameSummary | Summary3)[][],
  ms: number[],
  date: string,
): ShardResult<GameSummary | Summary3> {
  if (!o.shard) throw new Error('Not a sharded run');
  const three = 'players' in plan;
  const m = three ? MEASURES_3P : MEASURES;
  return {
    kind: 'chess9s-sim-shard',
    ...(three && { players: 3 as const, mode: plan.mode }),
    shard: o.shard,
    ruleset: plan.ruleset,
    overrides: o.overrides,
    date,
    decision: m.decision,
    version: m.version,
    games: o.games,
    seed: o.seed,
    nodes: o.nodes,
    runs: plan.jobs.map(
      (j: { combination: string; own: Record<string, unknown>; depth: number }, i) => ({
        combination: j.combination,
        overrides: j.own,
        depth: j.depth,
        seconds: Math.round(ms[i]! / 1000),
        games: [...games[i]!].sort((a, b) => a.seed - b.seed),
      }),
    ),
    skipped: plan.skipped,
  };
}

/** What every shard of one run has in common. */
const runOf = (s: ShardResult<unknown>) =>
  JSON.stringify([
    s.kind,
    s.players ?? 2,
    s.mode ?? null,
    s.shard.count,
    s.ruleset,
    s.overrides,
    s.decision,
    s.version,
    s.games,
    s.seed,
    s.nodes,
    s.runs.map((r) => [r.combination, r.overrides, r.depth]),
    s.skipped,
  ]);

/** The shards checked to be of one run under the current measures, and the missing ones. */
function check<S extends ShardResult<unknown>>(
  shards: S[],
  m: { decision: string; version: number },
): { first: S; missing: number[]; date: string } {
  const first = shards[0];
  if (!first) throw new Error('No shard to merge');
  if (first.decision !== m.decision || first.version !== m.version) {
    throw new Error(
      `Shards were played under decision ${first.decision} version ${first.version}, not ${m.decision} version ${m.version}`,
    );
  }
  const run = runOf(first);
  const seen = new Set<number>();
  for (const s of shards) {
    if (runOf(s) !== run) {
      throw new Error(`Shard ${s.shard.index} of ${s.shard.count} is from a different run`);
    }
    if (seen.has(s.shard.index)) {
      throw new Error(`Got shard ${s.shard.index} of ${s.shard.count} twice`);
    }
    seen.add(s.shard.index);
  }
  const count = first.shard.count;
  const missing = Array.from({ length: count }, (_, i) => i + 1).filter((k) => !seen.has(k));
  const date = shards
    .map((s) => s.date)
    .sort()
    .at(-1)!;
  return { first, missing, date };
}

/** The earlier report's runs the shards did not play, kept in place, then the new runs. */
function keep<R extends { combination: string; depth: number }>(earlier: R[], runs: R[]): R[] {
  const key = (r: R) => `${r.combination}@${r.depth}`;
  const fresh = new Map(runs.map((r) => [key(r), r]));
  const before = new Set(earlier.map(key));
  return [
    ...earlier.map((r) => fresh.get(key(r)) ?? r),
    ...runs.filter((r) => !before.has(key(r))),
  ];
}

/**
 * The fairness report of all the shards' games, and the shards that are missing. Missing shards
 * leave their games out, so the runs count fewer games and are flagged as such; the measures
 * and their thresholds are decision 0008's, unchanged. The report's date is the latest shard's.
 * With an `earlier` report of the same ruleset and measures, its runs that the shards did not
 * play are kept (such as the depth-1 run when the shards play depth 2), so the verdict covers
 * every depth.
 */
export function mergeShards(
  shards: ShardResult[],
  earlier?: FairnessReport,
): { report: FairnessReport; missing: number[] } {
  const { first, missing, date } = check(shards, MEASURES);
  const runs: RunReport[] = first.runs.map((r, i) => {
    const games = shards.flatMap((s) => s.runs[i]!.games).sort((a, b) => a.seed - b.seed);
    return {
      combination: r.combination,
      overrides: r.overrides,
      depth: r.depth,
      nodes: first.nodes,
      seed: first.seed,
      seconds: shards.reduce((n, s) => n + s.runs[i]!.seconds, 0),
      summary: summarize(games),
    };
  });
  let all: RunReport[] = runs;
  if (earlier) {
    const same = (r: FairnessReport | ShardResult) =>
      JSON.stringify([r.ruleset, r.overrides, r.decision]);
    if (same(earlier) !== same(first) || earlier.measures.version !== first.version) {
      throw new Error('The earlier report is of a different ruleset or measures');
    }
    all = keep(earlier.runs, runs);
  }
  return {
    report: buildReport(first.ruleset, date, all, first.skipped, first.overrides),
    missing,
  };
}

/** The same for 3-player shards: the balance report of decision 0015 (S59). */
export function mergeShards3(
  shards: ShardResult3[],
  earlier?: FairnessReport3,
): { report: FairnessReport3; missing: number[] } {
  const { first, missing, date } = check(shards, MEASURES_3P);
  const runs: RunReport3[] = first.runs.map((r, i) => ({
    combination: r.combination,
    overrides: r.overrides,
    depth: r.depth,
    nodes: first.nodes,
    seed: first.seed,
    seconds: shards.reduce((n, s) => n + s.runs[i]!.seconds, 0),
    summary: summarize3(shards.flatMap((s) => s.runs[i]!.games).sort((x, y) => x.seed - y.seed)),
  }));
  let all = runs;
  if (earlier) {
    const same = (r: FairnessReport3 | ShardResult3) =>
      JSON.stringify([r.ruleset, r.overrides, r.decision, r.mode]);
    if (same(earlier) !== same(first) || earlier.measures.version !== first.version) {
      throw new Error('The earlier report is of a different ruleset, mode or measures');
    }
    all = keep(earlier.runs, runs);
  }
  return {
    report: buildReport3(first.ruleset, date, first.mode, all, first.skipped, first.overrides),
    missing,
  };
}
