// pnpm bench [options]: the search benchmark (decision 0009). Writes <out>/<name>.json and .md.
//
//   --positions <file>  positions data, from the repository root (packages/sim/bench/positions.json)
//   --depth <n>         search depth (2)
//   --nodes <n>         positions per move (the decision 0008 budget, 100000)
//   --no-reference      skip the S23 search (no comparison)
//   --out <dir>         report directory, from where pnpm was run (docs/benchmarks)
//   --name <name>       report file name (search-depth<depth>)
//   --make              write new positions instead, from seeded self-play games of draft-2p at
//                       --depth with --nodes
//   --seeds <a,b>       seeds of those games (1,2,3,4,5,6,7,8)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  benchPosition,
  benchStats,
  positionsOf,
  replay,
  samplePositions,
  type BenchPositions,
  type BenchRow,
  type BenchStats,
} from './bench';
import { repoRoot } from './cli';
import { loadSource, rulesFor } from './load';
import { MEASURES } from './measures';

export interface BenchReport {
  date: string;
  ruleset: { id: string; version: string };
  depth: number;
  nodes: number;
  search: BenchStats;
  reference?: BenchStats;
  /** Positions where the reference finished, and how many of those gave the same result. */
  compared?: { finished: number; same: number };
  rows: BenchRow[];
}

const num = (x: number) => x.toLocaleString('en-US');
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function benchMarkdown(r: BenchReport): string {
  const line = (label: string, s: BenchStats) =>
    `| ${label} | ${s.moves} | ${num(s.nodes.mean)} | ${num(s.nodes.median)} | ${num(s.nodes.p95)} | ${num(s.nodes.max)} | ${s.capped} (${pct(s.cappedShare)}) | ${num(s.msPerMove)} |`;
  const lines = [
    `# Search benchmark: ${r.ruleset.id} ${r.ruleset.version}, depth ${r.depth}`,
    '',
    `${r.date}. Each position is searched once to depth ${r.depth} with at most ${num(r.nodes)} positions per move (decision 0008). "Capped" means the budget ran out before the search finished depth ${r.depth}. Times are from the machine that ran it.`,
    '',
    '| Search | Moves | Positions per move: mean | median | 95th percentile | max | Capped | ms per move |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    line('current', r.search),
    ...(r.reference ? [line('S23 (reference)', r.reference)] : []),
  ];
  if (r.compared) {
    lines.push(
      '',
      `Same move, score and depth as the S23 search (tie-breaks 0, 0.5 and 0.999) on ${r.compared.same} of the ${r.compared.finished} positions where the S23 search finished.`,
    );
  }
  lines.push(
    '',
    '## Positions',
    '',
    '| Position | Legal moves | Current | S23 |',
    '| --- | --- | --- | --- |',
  );
  const cell = (m?: BenchRow['search']) => (m ? `${num(m.nodes)}${m.capped ? ' capped' : ''}` : '');
  for (const row of r.rows) {
    lines.push(`| ${row.name} | ${row.legal} | ${cell(row.search)} | ${cell(row.reference)} |`);
  }
  return lines.join('\n') + '\n';
}

function main(): void {
  const { values: v } = parseArgs({
    args: process.argv.slice(2),
    options: {
      positions: { type: 'string', default: 'packages/sim/bench/positions.json' },
      depth: { type: 'string', default: '2' },
      nodes: { type: 'string', default: String(MEASURES.nodes) },
      'no-reference': { type: 'boolean', default: false },
      out: { type: 'string', default: 'docs/benchmarks' },
      name: { type: 'string' },
      make: { type: 'boolean', default: false },
      seeds: { type: 'string', default: '1,2,3,4,5,6,7,8' },
    },
  });
  const cwd = process.env['INIT_CWD'] ?? process.cwd();
  const root = repoRoot(cwd);
  const source = loadSource(root);
  const file = join(root, v.positions);

  if (v.make) {
    const { rules, ruleset } = rulesFor(source, 'draft-2p');
    const seeds = v.seeds.split(',').map(Number);
    const games = samplePositions(
      rules,
      ruleset,
      {
        seeds,
        depth: Number(v.depth),
        nodes: Number(v.nodes),
        openingPlies: MEASURES.openingPlies,
        from: 8,
        every: 24,
        maxPlies: MEASURES.maxPlies,
      },
      (seed, ply, nodes, capped) => {
        if (capped || ply % 50 === 0)
          console.error(`seed ${seed} ply ${ply}: ${nodes}${capped ? ' capped' : ''}`);
      },
    );
    const data: BenchPositions = {
      description: `Search benchmark positions (decision 0009), each game as its moves from the start up to its last sampled position; a position is the game after that many plies. Taken from depth-${v.depth} self-play games with seeds ${v.seeds} (${MEASURES.openingPlies} random opening plies, ${v.nodes} positions per move): ply 8, then every 24th ply, and every position where the search ran out of nodes.`,
      ruleset,
      games,
    };
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.error(
      `Wrote ${games.reduce((n, g) => n + g.plies.length, 0)} positions to ${v.positions}`,
    );
    return;
  }

  const data = JSON.parse(readFileSync(file, 'utf8')) as BenchPositions;
  const { rules, ruleset } = rulesFor(source, data.ruleset.id);
  if (ruleset.version !== data.ruleset.version) {
    throw new Error(
      `Positions are for ${data.ruleset.id} ${data.ruleset.version}, not ${ruleset.version}`,
    );
  }
  const depth = Number(v.depth);
  const nodes = Number(v.nodes);
  const reference = !v['no-reference'];
  const rows: BenchRow[] = [];
  for (const p of positionsOf(data)) {
    const row = benchPosition(replay(rules, ruleset, p.moves), p.name, { depth, nodes, reference });
    rows.push(row);
    console.error(
      `${p.name}: ${row.search.nodes}${row.search.capped ? ' capped' : ''}` +
        (row.reference
          ? ` (S23 ${row.reference.nodes}${row.reference.capped ? ' capped' : ''})`
          : '') +
        (row.same === false ? ' DIFFERENT' : ''),
    );
  }
  const finished = rows.filter((r) => r.same !== undefined);
  const report: BenchReport = {
    date: new Date().toISOString().slice(0, 10),
    ruleset,
    depth,
    nodes,
    search: benchStats(rows.map((r) => r.search)),
    ...(reference && {
      reference: benchStats(rows.map((r) => r.reference!)),
      compared: { finished: finished.length, same: finished.filter((r) => r.same).length },
    }),
    rows,
  };
  const outDir = resolve(cwd, v.out);
  const name = v.name ?? `search-depth${depth}`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(outDir, `${name}.md`), benchMarkdown(report));
  const s = report.search;
  console.error(
    `Current: ${s.capped}/${s.moves} capped, ${s.nodes.mean} positions per move on average.` +
      (report.compared
        ? ` Same as S23 on ${report.compared.same}/${report.compared.finished}.`
        : ''),
  );
  if (report.compared && report.compared.same !== report.compared.finished) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
