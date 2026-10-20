// pnpm sim:merge <shard files or directories> [--out dir] [--name name]: builds the fairness
// report (decision 0008) from the shards of a sharded run (`pnpm sim --shard K/N`), as
// <out>/<name>.json and .md, the same files an unsharded run writes. Directories are searched for
// *.shard-*-of-*.json. Missing shards are named and their games left out.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { mergeShards, type ShardResult } from './merge';
import { toMarkdown } from './report';

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
    },
  });
  const cwd = process.env['INIT_CWD'] ?? process.cwd();
  const files = shardFiles(positionals.map((p) => resolve(cwd, p)));
  const shards = files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as ShardResult);
  const { report, missing } = mergeShards(shards);
  const name = v.name ?? report.ruleset.id;
  const outDir = resolve(cwd, v.out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(outDir, `${name}.md`), toMarkdown(report));
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
