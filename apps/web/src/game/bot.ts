import { bestMove, type GameState, type GeneratedMove } from '@chess9s/engine';

/** Positions the computer plays out per move: about half a second in a desktop browser. */
export const BOT_NODES = 800;

/**
 * Computer opponent v1: the engine's search (negamax with alpha-beta over the selected ruleset),
 * with equally good moves picked at random. `random` returns [0, 1).
 */
export function computerMove(
  game: GameState,
  random: () => number = Math.random,
  nodes: number = BOT_NODES,
): GeneratedMove | undefined {
  return bestMove(game, { nodes, random }).move;
}
