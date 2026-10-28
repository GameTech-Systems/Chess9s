// A hot-seat game's clock (S65, decision 0017): what the guest game and the game record keep of
// it, and reading that back. The clock itself (the engine's `Timed`) is applied to a game as it is
// played by session.ts. Time is passed in.
import {
  outSeats,
  restoreClock,
  snapshot,
  type GameState,
  type Times,
  type Timed,
} from '@chess9s/engine';
import { controlById } from './timeControls';

// The clock functions moved to the engine in S66, where an online room uses them too.
export {
  beginTimed,
  timedAfterLeave,
  timedAfterMove,
  timedFlag,
  timedPause,
  type Timed,
} from '@chess9s/engine';

const over = (game: GameState) => game.result.status !== 'ongoing';

/** What the guest game and the game record keep of a clock. */
export interface SavedTimed {
  control: string;
  showOnly: boolean;
  /** Each seat's time left when it was saved. */
  left: Times;
  lefts: Times[];
}

export const timedToSaved = (timed: Timed, now: number): SavedTimed => ({
  control: timed.control.id,
  showOnly: timed.showOnly,
  left: snapshot(timed.clock, now),
  lefts: timed.lefts,
});

const isTimes = (v: unknown, seats: readonly string[]): v is Times =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  seats.every((s) => Number.isFinite((v as Record<string, unknown>)[s])) &&
  Object.values(v).every((t) => typeof t === 'number' && t >= 0);

/**
 * The clock saved with `game`, back and paused, or null when it does not fit that game: an unknown
 * or clockless control, or times that are not numbers for every seat and every move.
 */
export function timedFromSaved(saved: unknown, game: GameState): Timed | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const { control: id, showOnly, left, lefts } = saved as Record<string, unknown>;
  const control = typeof id === 'string' ? controlById(id) : undefined;
  if (!control || typeof showOnly !== 'boolean') return null;
  if (!isTimes(left, game.order) || !Array.isArray(lefts)) return null;
  if (lefts.length !== game.moves.length || !lefts.every((l) => isTimes(l, game.order)))
    return null;
  const clock = restoreClock(control, left, over(game) ? null : game.turn, outSeats(game.seats));
  // A control without a clock (untimed, abandonment) never has a saved one.
  if (control.kind !== 'fischer' && control.kind !== 'perMove') return null;
  return { control, showOnly, clock, lefts: lefts as Times[] };
}
