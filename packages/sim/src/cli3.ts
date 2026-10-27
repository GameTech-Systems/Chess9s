// pnpm sim --players 3 [--ruleset <3-player id>] [--search --depths <d>]: greedy players on every
// seat of a 3-player ruleset (S58, decision D59), or the paranoid search at one depth (S62), and
// each seat's results. Takes --games (100 with --players 3), --nodes, --seed, --workers, --set,
// --out and --name from cli.ts; --sweep and --shard are 2-player options. The fairness measures
// and the verdict are S59.
import { newGame, RulesError } from '@chess9s/engine';
import type { Options, Plan3 } from './cli';
import { rulesFor, type RulesSource } from './load';
import { MEASURES } from './measures';
import type { Job3 } from './pool';
import { summarize3, type Report3, type Summary3 } from './play3';

/** The default ruleset and number of games for `--players 3`. */
export const DEFAULT_3P = { ruleset: 'standard-3p', games: 100 } as const;

/** The runs to play: one job with a seed per game, base seed + i. */
export function plan3(o: Options, source: RulesSource): Plan3 {
  if (o.sweep) throw new Error('--sweep is a 2-player option');
  if (o.shard) throw new Error('--shard is a 2-player option');
  if (o.search && o.depths.length !== 1) throw new Error('--search plays one depth: --depths <d>');
  const { rules, ruleset } = rulesFor(source, o.ruleset, o.overrides);
  if (rules.players !== 3) throw new Error(`${o.ruleset} is a ${rules.players}-player ruleset`);
  try {
    newGame(rules, ruleset);
  } catch (e) {
    if (e instanceof RulesError) throw new Error(`${o.ruleset} cannot be played: ${e.message}`);
    throw e;
  }
  const job: Job3 = {
    players: 3,
    rulesetId: o.ruleset,
    overrides: o.overrides,
    options: {
      openingPlies: MEASURES.openingPlies,
      maxPlies: MEASURES.maxPlies,
      ...(o.search && { search: { depth: o.depths[0]!, nodes: o.nodes } }),
    },
    seeds: Array.from({ length: o.games }, (_, i) => o.seed + i),
  };
  return { ruleset, job };
}

export function report3(plan: Plan3, date: string, games: Summary3[]): Report3 {
  return {
    ruleset: plan.ruleset,
    ...(plan.job.options.search && { search: plan.job.options.search }),
    date,
    ...summarize3([...games].sort((a, b) => a.seed - b.seed)),
  };
}
