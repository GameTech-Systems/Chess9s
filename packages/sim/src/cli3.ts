// pnpm sim on a 3-player ruleset: the balance report of decision 0015 (D60, S59). The paranoid
// search (S62) plays every seat at each of --depths; --greedy-dragon plays the Dragon greedy against
// searching Kinged players and --greedy plays every seat greedy (S58), both reported, not scored.
// --sweep, --shard, --set, --games, --nodes and --seed work as for 2 players (cli.ts).
import { newGame, RulesError, unbuiltFeatures } from '@chess9s/engine';
import type { Options } from './cli';
import { rulesFor, type RulesSource } from './load';
import { MEASURES_3P } from './measures3';
import type { Summary3 } from './play3';
import type { Job3 } from './pool';
import type { Mode3, RunReport3 } from './report3';
import type { Skipped } from './report';
import { summarize3 } from './stats3';
import { combinations, playable, type Combination } from './sweep';

/** The 3-player default ruleset (D63). */
export const DEFAULT_3P = { ruleset: 'standard-3p' } as const;

/** A greedy run has no search depth: it is run, and reported, at depth 0. */
export type PlannedJob3 = Job3 & {
  combination: string;
  own: Record<string, unknown>;
  depth: number;
};

export interface Plan3 {
  players: 3;
  mode: Mode3;
  ruleset: { id: string; version: string };
  jobs: PlannedJob3[];
  skipped: Skipped[];
}

/**
 * The runs to play: one per combination (the ruleset as it is, or the sweep of every 3-player
 * parameter) and depth, each with its seeds, base seed + i for game i; a shard keeps game i when
 * i mod N is K − 1, as for 2 players (decision 0009).
 */
export function planJobs3(o: Options, source: RulesSource): Plan3 {
  const { rules, ruleset } = rulesFor(source, o.ruleset, o.overrides);
  if (rules.players !== 3) throw new Error(`${o.ruleset} is a ${rules.players}-player ruleset`);
  try {
    newGame(rules, ruleset);
  } catch (e) {
    if (e instanceof RulesError) throw new Error(`${o.ruleset} cannot be played: ${e.message}`);
    throw e;
  }
  // Not built yet in the ruleset as it is, so in every run: a combination that changes one of
  // these would play the same game as the default, and is skipped.
  const known = new Set(unbuiltFeatures(rules).map((f) => f.id));
  const mode = o.mode ?? 'search';
  const combos: Combination[] = o.sweep
    ? combinations(source.registry, rules.values, 3)
    : [{ id: 'default', overrides: {} }];
  const seeds = Array.from({ length: o.games }, (_, i) => o.seed + i).filter(
    (_, i) => !o.shard || i % o.shard.count === o.shard.index - 1,
  );
  const skipped: Skipped[] = [];
  const jobs: PlannedJob3[] = [];
  for (const c of combos) {
    const overrides = { ...o.overrides, ...c.overrides };
    const changes = Object.keys(c.overrides).filter((id) => known.has(id));
    const why = changes.length
      ? `not built yet: ${changes.join(', ')}`
      : playable(source, o.ruleset, overrides, known);
    if (why !== undefined) {
      skipped.push({ combination: c.id, reason: why });
      continue;
    }
    for (const depth of mode === 'greedy' ? [0] : o.depths) {
      jobs.push({
        players: 3,
        combination: c.id,
        own: c.overrides,
        depth,
        rulesetId: o.ruleset,
        overrides,
        options: {
          openingPlies: MEASURES_3P.openingPlies,
          maxPlies: MEASURES_3P.maxPlies,
          ...(depth > 0 && { search: { depth, nodes: o.nodes } }),
          ...(mode === 'greedy-dragon' && { greedyDragon: true }),
        },
        seeds,
      });
    }
  }
  return { players: 3, mode, ruleset, jobs, skipped };
}

/** Each run's summary of the games played so far, in seed order. */
export function runReports3(
  o: Pick<Options, 'nodes' | 'seed'>,
  plan: Plan3,
  games: Summary3[][],
  ms: number[],
): RunReport3[] {
  return plan.jobs.map((j, i) => ({
    combination: j.combination,
    overrides: j.own,
    depth: j.depth,
    nodes: o.nodes,
    seed: o.seed,
    seconds: Math.round(ms[i]! / 1000),
    summary: summarize3([...games[i]!].sort((a, b) => a.seed - b.seed)),
  }));
}
