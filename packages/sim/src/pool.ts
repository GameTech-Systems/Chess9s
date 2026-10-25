// Plays many games on worker threads. Each game is one task, handed out as workers free up, so
// results don't depend on how many workers there are (each game has its own seed).
import { Worker } from 'node:worker_threads';
import type { Ruleset } from '@chess9s/engine';
import type { GameSummary, PlayOptions } from './play';

export interface Job {
  rulesetId: string;
  /** The ruleset itself, when it is not in rules/rulesets (`--ruleset-file`). */
  ruleset?: Ruleset;
  overrides: Record<string, unknown>;
  options: Omit<PlayOptions, 'seed' | 'init'>;
  seeds: number[];
}

export interface Played {
  job: number;
  game: GameSummary;
  ms: number;
}

/** Messages a worker sends back: a finished game. */
export type FromWorker = Played;
/** Messages a worker receives: the next game to play. */
export interface ToWorker {
  job: number;
  seed: number;
}

export function runPool(
  workerUrl: URL,
  root: string,
  jobs: Job[],
  workers: number,
  onGame: (played: Played) => void,
): { done: Promise<void>; stop: () => Promise<void> } {
  const queue: ToWorker[] = jobs.flatMap((j, job) => j.seeds.map((seed) => ({ job, seed })));
  const pool: Worker[] = [];
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
  let busy = 0;

  const next = (w: Worker) => {
    const task = queue.shift();
    if (task) {
      busy++;
      w.postMessage(task);
    } else if (busy === 0) {
      void Promise.all(pool.map((p) => p.terminate())).then(() => resolve());
    }
  };

  for (let i = 0; i < Math.max(1, Math.min(workers, queue.length)); i++) {
    const w = new Worker(workerUrl, { workerData: { root, jobs } });
    w.on('message', (played: FromWorker) => {
      busy--;
      onGame(played);
      next(w);
    });
    w.on('error', reject);
    pool.push(w);
    next(w);
  }
  if (queue.length === 0 && busy === 0) resolve();

  const stop = async () => {
    queue.length = 0;
    await Promise.all(pool.map((p) => p.terminate()));
    resolve();
  };
  return { done, stop };
}
