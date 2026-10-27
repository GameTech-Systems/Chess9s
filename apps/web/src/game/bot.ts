import {
  bestMove,
  greedyMove,
  playMove,
  toNotation,
  type GameState,
  type GeneratedMove,
} from '@chess9s/engine';
import { createRulesFor, findRuleset, type RulesetInfo } from './rules';
import { newModel } from './session';

/** Positions the computer plays out per move: about half a second in a desktop browser. */
export const BOT_NODES = 800;

/**
 * Computer opponent v1: the engine's search (negamax with alpha-beta over the selected ruleset),
 * with equally good moves picked at random. `random` returns [0, 1). In 3-player games it is the
 * greedy player for the seat to move (S58, decision D59), with `nodes` unused.
 */
export function computerMove(
  game: GameState,
  random: () => number = Math.random,
  nodes: number = BOT_NODES,
): GeneratedMove | undefined {
  if (game.rules.players === 3) return greedyMove(game, { random });
  return bestMove(game, { nodes, random }).move;
}

/**
 * The computer's reply from a ruleset reference and the moves played so far (notations), as the Web
 * Worker gets them: a game state does not travel between threads, so the worker replays the moves
 * itself. A custom ruleset arrives with its overrides; a bundled one is found by id. Undefined when
 * the ruleset is unknown, a move does not replay, or the game has no move.
 */
export function computerReply(
  ref: Pick<RulesetInfo, 'id' | 'version' | 'overrides'>,
  notations: string[],
  random: () => number = Math.random,
  nodes: number = BOT_NODES,
): string | undefined {
  const info = ref.overrides ? { ...ref, name: ref.id } : findRuleset(ref.id, ref.version);
  if (!info) return undefined;
  let { game } = newModel(createRulesFor(info), info);
  for (const notation of notations) {
    const move = game.legal.find((m) => toNotation(m) === notation);
    if (!move) return undefined;
    game = playMove(game, move);
  }
  const move = computerMove(game, random, nodes);
  return move && toNotation(move);
}
