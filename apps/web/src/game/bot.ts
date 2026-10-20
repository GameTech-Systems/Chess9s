import {
  bestMove,
  playMove,
  toNotation,
  type GameState,
  type GeneratedMove,
} from '@chess9s/engine';
import { createRules, listRulesets } from './rules';
import { newModel } from './session';

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

/**
 * The computer's reply from a ruleset id and the moves played so far (notations), as the Web Worker
 * gets them: a game state does not travel between threads, so the worker replays the moves itself.
 * Undefined when the ruleset is unknown, a move does not replay, or the game has no move.
 */
export function computerReply(
  rulesetId: string,
  notations: string[],
  random: () => number = Math.random,
  nodes: number = BOT_NODES,
): string | undefined {
  const info = listRulesets().find((r) => r.id === rulesetId);
  if (!info) return undefined;
  let { game } = newModel(createRules(info.id), info);
  for (const notation of notations) {
    const move = game.legal.find((m) => toNotation(m) === notation);
    if (!move) return undefined;
    game = playMove(game, move);
  }
  const move = computerMove(game, random, nodes);
  return move && toNotation(move);
}
