// pnpm sim:merge <shard files or directories> [options]: builds the fairness report (decision
// 0008) from the shards of a sharded run (`pnpm sim --shard K/N`), as <out>/<name>.json and .md,
// the same files an unsharded run writes. Directories are searched for *.shard-*-of-*.json.
// Missing shards are named and their games left out. 3-player shards (S59) merge into the balance
// report of decision 0015, named <ruleset id> or <ruleset id>.<mode> as `pnpm sim` names it.
//
//   --with <report>   keep the runs of this earlier report that the shards did not play (such
//                     as docs/fairness/draft-2p.json's depth-1 run), so the verdict covers both depths
//   --out <dir>       report directory, from where pnpm was run (docs/fairness)
//   --name <name>     report file name (the ruleset id)
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { mergeShards, mergeShards3, type ShardResult, type ShardResult3 } from './merge';
import { toMarkdown, type FairnessReport } from './report';
import { toMarkdown3, type FairnessReport3 } from './report3';

const SHARD = /\.shard-\d+-of-\d+\.json$/;

/** The shard files named, and those in the directories named (recursively). */
export function shardFiles(paths: string[]): string[] {
  return paths.flatMap((p) => {
    if (!statSync(p).isDirectory()) return [p];
    return readdirSync(p, { recursive: true, encoding: 'utf8' })
      .filter((f) => SHARD.test(f))
      .sort()
      .map((f) => join(p, f));
  });
}

function main(): void {
  const { values: v, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      out: { type: 'string', default: 'docs/fairness' },
      name: { type: 'string' },
      with: { type: 'string' },
    },
  });
  const cwd = process.env['INIT_CWD'] ?? process.cwd();
  const files = shardFiles(positionals.map((p) => resolve(cwd, p)));
  const shards = files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as ShardResult);
  if (shards.length === 0) throw new Error('No shard to merge');
  const earlier =
    v.with === undefined
      ? undefined
      : (JSON.parse(readFileSync(resolve(cwd, v.with), 'utf8')) as unknown);
  const merged =
    shards[0]!.players === 3
      ? mergeShards3(shards as unknown as ShardResult3[], earlier as FairnessReport3 | undefined)
      : mergeShards(shards, earlier as FairnessReport | undefined);
  const { report, missing } = merged;
  const three = 'players' in report;
  const name =
    v.name ??
    (three && report.mode !== 'search' ? `${report.ruleset.id}.${report.mode}` : report.ruleset.id);
  const outDir = resolve(cwd, v.out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(
    join(outDir, `${name}.md`),
    three ? toMarkdown3(report) : toMarkdown(report as FairnessReport),
  );
  const games = report.runs.reduce((n, r) => n + r.summary.games, 0);
  if (missing.length > 0) {
    console.error(`Missing shards: ${missing.join(', ')} of ${shards[0]!.shard.count}`);
  }
  console.error(
    `Merged ${shards.length} shards (${games} games). Verdict: ${report.verdict}. Wrote ${join(v.out, name)}.json and .md`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
