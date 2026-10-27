// The computer's seats in a 3-player game (S58, decision D59): the Dragon is the usual one, and
// at most two seats go to the computer so that a person is always playing.
import type { GameState } from '@chess9s/engine';
import { canUndo, undo, type Model } from './session';

/** The only level so far; S62 adds the search. */
export const BOT_LEVEL_3P = 'Greedy';

/** Most seats the computer may play. */
export const MAX_BOT_SEATS = 2;

export const canToggleBot = (bots: readonly string[], seat: string): boolean =>
  bots.includes(seat) || bots.length < MAX_BOT_SEATS;

/** The seats after `seat` is turned on or off; unchanged when a third would be turned on. */
export function toggleBot(bots: readonly string[], seat: string): string[] {
  if (bots.includes(seat)) return bots.filter((s) => s !== seat);
  return canToggleBot(bots, seat) ? [...bots, seat] : [...bots];
}

/** Take back the last move, and the computer seats' moves before it, to a person's turn. */
export function undoForHuman(model: Model, bots: readonly string[]): Model {
  let back = undo(model);
  while (canUndo(back) && bots.includes(back.game.turn)) back = undo(back);
  return back;
}

/**
 * The seat the board turns to when it follows the turn: the seat to move, or while a computer
 * seat moves, the person who moved last (the first person to move, at the start), so the board
 * does not spin for the computer's moves.
 */
export function followSeat(game: GameState, bots: readonly string[]): string {
  if (!bots.includes(game.turn)) return game.turn;
  for (let i = game.moves.length - 1; i >= 0; i--) {
    const side = game.moves[i]!.side;
    if (!bots.includes(side)) return side;
  }
  return game.order.find((s) => !bots.includes(s)) ?? game.turn;
}
