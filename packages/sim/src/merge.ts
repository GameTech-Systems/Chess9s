// Shards of a run (S35, decision 0009). A shard plays a fixed slice of each run's seeds and keeps
// every game's summary, because the report needs all the games (the median length, the distinct
// games), not a summary of each slice. Merging puts the games back together and builds the same
// fairness report (decision 0008) that one unsharded run would have written.
import type { Options, Plan } from './cli';
import { MEASURES } from './measures';
import type { GameSummary } from './play';
import { buildReport, type FairnessReport, type Skipped } from './report';
import { summarize } from './stats';

export interface ShardResult {
  kind: 'chess9s-sim-shard';
  shard: { index: number; count: number };
  ruleset: { id: string; version: string };
  /** Overrides on top of the ruleset for every run (`--set`). */
  overrides: Record<string, unknown>;
  date: string;
  decision: string;
  /** Version of decision 0008 the shard was played under. */
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
    games: GameSummary[];
  }[];
  skipped: Skipped[];
}

export function shardResult(
  o: Options,
  plan: Plan,
  games: GameSummary[][],
  ms: number[],
  date: string,
): ShardResult {
  if (!o.shard) throw new Error('Not a sharded run');
  return {
    kind: 'chess9s-sim-shard',
    shard: o.shard,
    ruleset: plan.ruleset,
    overrides: o.overrides,
    date,
    decision: MEASURES.decision,
    version: MEASURES.version,
    games: o.games,
    seed: o.seed,
    nodes: o.nodes,
    runs: plan.jobs.map((j, i) => ({
      combination: j.combination,
      overrides: j.own,
      depth: j.depth,
      seconds: Math.round(ms[i]! / 1000),
      games: [...games[i]!].sort((a, b) => a.seed - b.seed),
    })),
    skipped: plan.skipped,
  };
}

/** What every shard of one run has in common. */
const runOf = (s: ShardResult) =>
  JSON.stringify([
    s.kind,
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

/**
 * The fairness report of all the shards' games, and the shards that are missing. Missing shards
 * leave their games out, so the runs count fewer games and are flagged as such; the measures
 * and their thresholds are decision 0008's, unchanged. The report's date is the latest shard's.
 */
export function mergeShards(shards: ShardResult[]): { report: FairnessReport; missing: number[] } {
  const first = shards[0];
  if (!first) throw new Error('No shard to merge');
  if (first.decision !== MEASURES.decision || first.version !== MEASURES.version) {
    throw new Error(
      `Shards were played under decision ${first.decision} version ${first.version}, not ${MEASURES.decision} version ${MEASURES.version}`,
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
  const runs = first.runs.map((r, i) => {
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
  const date = shards
    .map((s) => s.date)
    .sort()
    .at(-1)!;
  return {
    report: buildReport(first.ruleset, date, runs, first.skipped, first.overrides),
    missing,
  };
}
