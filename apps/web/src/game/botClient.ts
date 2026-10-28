import { toNotation, type GameState, type GeneratedMove } from '@chess9s/engine';
import { computerMove } from './bot';
import type { BotRequest, BotResponse } from './bot.worker';
import type { Level3 } from './bots';

/** Asks for the computer's move without blocking the page; `cancel` drops a pending answer. */
export interface BotSearch {
  cancel: () => void;
}

let worker: Worker | null | undefined;
let nextId = 0;

function getWorker(): Worker | null {
  if (worker === undefined) {
    try {
      worker =
        typeof Worker === 'undefined'
          ? null
          : new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  return worker;
}

/**
 * Finds the computer's move for `game` and calls `done` with it, at `level` in 3-player games. Uses
 * a Web Worker; where there is none (tests, old browsers) or it fails, it searches on the page's
 * thread instead.
 */
export function searchMove(
  game: GameState,
  done: (move: GeneratedMove | undefined) => void,
  level?: Level3,
): BotSearch {
  let live = true;
  const finish = (move: GeneratedMove | undefined) => live && ((live = false), done(move));
  const sync = () => finish(computerMove(game, Math.random, undefined, level));
  const w = getWorker();
  if (!w) {
    sync();
    return { cancel: () => (live = false) };
  }
  const id = nextId++;
  const onMessage = (e: MessageEvent<BotResponse>) => {
    if (e.data.id !== id) return;
    cleanup();
    finish(game.legal.find((m) => toNotation(m) === e.data.move));
  };
  const onError = () => {
    cleanup();
    worker = null;
    if (live) sync();
  };
  const cleanup = () => {
    w.removeEventListener('message', onMessage);
    w.removeEventListener('error', onError);
  };
  w.addEventListener('message', onMessage);
  w.addEventListener('error', onError);
  const request: BotRequest = {
    id,
    ruleset: { ...game.ruleset, players: game.rules.players },
    moves: game.moves.map((m) => m.notation),
    ...(game.resignations.length > 0 && { resignations: game.resignations }),
    ...(level && { level }),
  };
  w.postMessage(request);
  return {
    cancel: () => {
      live = false;
      cleanup();
    },
  };
}
