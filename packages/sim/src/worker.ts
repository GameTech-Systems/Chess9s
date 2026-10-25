// A worker thread for the pool: plays the games it is handed and sends back each summary.
import { parentPort, workerData } from 'node:worker_threads';
import type { MoveRules } from '@chess9s/engine';
import { loadSource, rulesFor } from './load';
import { playGame } from './play';
import type { FromWorker, Job, ToWorker } from './pool';

const { root, jobs } = workerData as { root: string; jobs: Job[] };
const source = loadSource(root);
const resolved = new Map<number, ReturnType<typeof rulesFor>>();

parentPort!.on('message', ({ job, seed }: ToWorker) => {
  const j = jobs[job]!;
  let r = resolved.get(job);
  if (!r) {
    const own = j.ruleset
      ? { ...source, rulesets: { ...source.rulesets, [j.rulesetId]: j.ruleset } }
      : source;
    r = rulesFor(own, j.rulesetId, j.overrides);
    resolved.set(job, r);
  }
  const start = performance.now();
  const game = playGame(r.rules as MoveRules, r.ruleset, { ...j.options, seed });
  const played: FromWorker = { job, game, ms: performance.now() - start };
  parentPort!.postMessage(played);
});
