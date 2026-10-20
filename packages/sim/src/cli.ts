// pnpm sim [options]: plays a ruleset against itself and writes a fairness report (decision 0008)
// to docs/fairness/<name>.json and .md. The report is rewritten as games finish, and on Ctrl-C,
// so a long run that is stopped still leaves its games counted (flagged as too few).
//
//   --ruleset <id>     ruleset in rules/rulesets (draft-2p)
//   --games <n>        games per combination and depth (2000)
//   --depths <a,b>     search depths (1,2)
//   --nodes <n>        positions per move (100000)
//   --seed <n>         seed of the first game (1)
//   --workers <n>      worker threads (all cores)
//   --sweep            also change each 2-player parameter one at a time
//   --set <id=value>   override a parameter for every run (repeatable; value as JSON or a word)
//   --out <dir>        report directory, from where pnpm was run (docs/fairness)
//   --name <name>      report file name (the ruleset id)
//   --report <file>    play nothing: rebuild that report's .json and .md from its runs
//   --shard <K/N>      play only shard K of N (game i of each run goes to shard i mod N + 1)
//                      and write its games to <name>.shard-K-of-N.json for `pnpm sim:merge`
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadSource, rulesFor, type RulesSource } from './load';
import { MEASURES } from './measures';
import { shardResult } from './merge';
import type { GameSummary } from './play';
import { runPool, type Job } from './pool';
import {
  buildReport,
  toMarkdown,
  type FairnessReport,
  type RunReport,
  type Skipped,
} from './report';
import { summarize } from './stats';
import { combinations, playable, type Combination } from './sweep';

export interface Options {
  ruleset: string;
  games: number;
  depths: number[];
  nodes: number;
  seed: number;
  workers: number;
  sweep: boolean;
  overrides: Record<string, unknown>;
  out: string;
  name: string;
  report?: string;
  /** Play only this slice of each run's games (1-based index). */
  shard?: Shard;
}

export interface Shard {
  index: number;
  count: number;
}

/** `K/N` with 1 ≤ K ≤ N. */
function shardOf(text: string): Shard {
  const m = /^(\d+)\/(\d+)$/.exec(text);
  const index = Number(m?.[1]);
  const count = Number(m?.[2]);
  if (!m || count < 1 || index < 1 || index > count) {
    throw new Error(`--shard needs K/N with 1 ≤ K ≤ N, not ${JSON.stringify(text)}`);
  }
  return { index, count };
}

const whole = (flag: string, text: string): number => {
  if (!/^\d+$/.test(text))
    throw new Error(`${flag} needs a whole number, not ${JSON.stringify(text)}`);
  return Number(text);
};

export function options(argv: string[], cores: number): Options {
  const { values: v } = parseArgs({
    args: argv,
    options: {
      ruleset: { type: 'string', default: 'draft-2p' },
      games: { type: 'string', default: String(MEASURES.minGames) },
      depths: { type: 'string', default: MEASURES.depths.join(',') },
      nodes: { type: 'string', default: String(MEASURES.nodes) },
      seed: { type: 'string', default: '1' },
      workers: { type: 'string', default: String(cores) },
      sweep: { type: 'boolean', default: false },
      set: { type: 'string', multiple: true, default: [] },
      out: { type: 'string', default: 'docs/fairness' },
      name: { type: 'string' },
      report: { type: 'string' },
      shard: { type: 'string' },
    },
  });
  const overrides: Record<string, unknown> = {};
  for (const pair of v.set) {
    const at = pair.indexOf('=');
    if (at <= 0) throw new Error(`--set needs id=value, not ${JSON.stringify(pair)}`);
    const text = pair.slice(at + 1);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
    overrides[pair.slice(0, at)] = value;
  }
  return {
    ruleset: v.ruleset,
    games: whole('--games', v.games),
    depths: v.depths.split(',').map((d) => whole('--depths', d)),
    nodes: whole('--nodes', v.nodes),
    seed: whole('--seed', v.seed),
    workers: Math.max(1, whole('--workers', v.workers)),
    sweep: v.sweep,
    overrides,
    out: v.out,
    name: v.name ?? v.ruleset,
    ...(v.report === undefined ? {} : { report: v.report }),
    ...(v.shard === undefined ? {} : { shard: shardOf(v.shard) }),
  };
}

/** The repository root: the nearest directory up from `from` that holds rules/parameters.json. */
export function repoRoot(from: string): string {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'rules/parameters.json'))) return dir;
    if (dirname(dir) === dir) throw new Error(`No rules/parameters.json above ${from}`);
  }
}

/** Rebuild a report from its runs, so a change to flags or wording needs no new games. */
function rebuild(file: string): void {
  const old = JSON.parse(readFileSync(file, 'utf8')) as FairnessReport;
  const report = buildReport(old.ruleset, old.date, old.runs, old.skipped, old.overrides);
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(file.replace(/\.json$/, '.md'), toMarkdown(report));
  console.error(`Verdict: ${report.verdict}. Rebuilt ${file} and its .md`);
}

export type PlannedJob = Job & {
  combination: string;
  own: Record<string, unknown>;
  depth: number;
};

export interface Plan {
  ruleset: { id: string; version: string };
  jobs: PlannedJob[];
  skipped: Skipped[];
}

/**
 * The runs to play: one per combination (the ruleset as it is, or the sweep) and depth, each with
 * its seeds, base seed + i for game i. A shard keeps game i when i mod N is K − 1, so long and
 * short games spread evenly and the N shards together play every game once.
 */
export function planJobs(o: Options, source: RulesSource): Plan {
  const { rules, ruleset } = rulesFor(source, o.ruleset, o.overrides);
  const combos: Combination[] = o.sweep
    ? combinations(source.registry, rules.values)
    : [{ id: 'default', overrides: {} }];
  const skipped: Skipped[] = [];
  const jobs: PlannedJob[] = [];
  const seeds = Array.from({ length: o.games }, (_, i) => o.seed + i).filter(
    (_, i) => !o.shard || i % o.shard.count === o.shard.index - 1,
  );
  for (const c of combos) {
    const overrides = { ...o.overrides, ...c.overrides };
    const why = playable(source, o.ruleset, overrides);
    if (why !== undefined) {
      skipped.push({ combination: c.id, reason: why });
      continue;
    }
    for (const depth of o.depths) {
      jobs.push({
        combination: c.id,
        own: c.overrides,
        depth,
        rulesetId: o.ruleset,
        overrides,
        options: {
          depth,
          nodes: o.nodes,
          openingPlies: MEASURES.openingPlies,
          maxPlies: MEASURES.maxPlies,
        },
        seeds,
      });
    }
  }
  return { ruleset, jobs, skipped };
}

/** Each run's summary of the games played so far, in seed order. */
export function runReports(
  o: Pick<Options, 'nodes' | 'seed'>,
  plan: Plan,
  games: GameSummary[][],
  ms: number[],
): RunReport[] {
  return plan.jobs.map((j, i) => ({
    combination: j.combination,
    overrides: j.own,
    depth: j.depth,
    nodes: o.nodes,
    seed: o.seed,
    seconds: Math.round(ms[i]! / 1000),
    // Seed order, so a stopped run's summary doesn't depend on which worker finished first.
    summary: summarize([...games[i]!].sort((a, b) => a.seed - b.seed)),
  }));
}

async function main(): Promise<void> {
  const o = options(process.argv.slice(2), availableParallelism());
  const cwd = process.env['INIT_CWD'] ?? process.cwd();
  if (o.report !== undefined) return rebuild(resolve(cwd, o.report));
  const root = repoRoot(cwd);
  const plan = planJobs(o, loadSource(root));
  const { jobs, skipped } = plan;

  const games: GameSummary[][] = jobs.map(() => []);
  const ms: number[] = jobs.map(() => 0);
  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(cwd, o.out);
  mkdirSync(outDir, { recursive: true });
  const file = o.shard
    ? `${o.name}.shard-${o.shard.index}-of-${o.shard.count}.json`
    : `${o.name}.json`;
  const write = () => {
    if (o.shard) {
      const shard = shardResult(o, plan, games, ms, date);
      writeFileSync(join(outDir, file), JSON.stringify(shard, null, 2) + '\n');
      return undefined;
    }
    const report = buildReport(
      plan.ruleset,
      date,
      runReports(o, plan, games, ms),
      skipped,
      o.overrides,
    );
    writeFileSync(join(outDir, file), JSON.stringify(report, null, 2) + '\n');
    writeFileSync(join(outDir, `${o.name}.md`), toMarkdown(report));
    return report;
  };

  const total = jobs.reduce((n, j) => n + j.seeds.length, 0);
  let finished = 0;
  const started = Date.now();
  console.error(
    `${total} games${o.shard ? ` (shard ${o.shard.index} of ${o.shard.count})` : ''}: ${jobs.length} runs on ${o.workers} workers; ${skipped.length} combinations skipped`,
  );
  const { done, stop } = runPool(
    new URL('./worker.js', import.meta.url),
    root,
    jobs,
    o.workers,
    (p) => {
      games[p.job]!.push(p.game);
      ms[p.job]! += p.ms;
      finished++;
      if (finished % 50 === 0 || finished === total || o.shard) {
        write();
        const elapsed = (Date.now() - started) / 1000;
        const left = (elapsed / finished) * (total - finished);
        console.error(
          `${finished}/${total} games, ${elapsed.toFixed(0)} s, about ${left.toFixed(0)} s left`,
        );
      }
    },
  );
  // Ctrl-C, or a time limit (SIGTERM, or SIGINT from `timeout -s INT`), keeps the games played.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      console.error('Stopping: writing the games played so far');
      void stop();
    });
  }
  await done;
  const report = write();
  console.error(
    report
      ? `Verdict: ${report.verdict}. Wrote ${join(o.out, o.name)}.json and .md`
      : `Wrote ${join(o.out, file)} (${finished} games)`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
