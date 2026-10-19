import type { GameState, GeneratedMove } from '@chess9s/engine';

/** Computer opponent v0: any legal move, chosen at random. `random` returns [0, 1). */
export function randomMove(
  game: GameState,
  random: () => number = Math.random,
): GeneratedMove | undefined {
  const { legal } = game;
  return legal[Math.min(legal.length - 1, Math.floor(random() * legal.length))];
}
