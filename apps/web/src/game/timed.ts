// A hot-seat game's clock (S65, decision 0017): the engine's clock with the control it runs, Show
// only, and each seat's time left after each move (what the game record keeps). These functions
// work on the clock alone; session.ts applies them to a game as it is played. Time is passed in.
import {
  afterMove,
  startClock,
  flagSeat,
  leaveSeat,
  outSeats,
  pauseClock,
  restoreClock,
  snapshot,
  stopClock,
  type Clock,
  type GameState,
  type TimeControl,
  type Times,
} from '@chess9s/engine';
import { controlById } from './timeControls';

export interface Timed {
  control: TimeControl;
  /** Running out of time is shown and play goes on (decision 0017). */
  showOnly: boolean;
  clock: Clock;
  /** Each seat's time left right after each move played, in move order. */
  lefts: Times[];
}

/** A clock for a game that has not begun, running the first mover; none for an untimed control. */
export function beginTimed(
  control: TimeControl,
  showOnly: boolean,
  game: GameState,
  now: number,
): Timed | null {
  const clock = startClock(control, game.order, game.turn, now);
  return clock && { control, showOnly, clock, lefts: [] };
}

/** Seats the game has put out that the clock does not know yet stop their clocks. */
function sync(clock: Clock, game: GameState, now: number): Clock {
  return outSeats(game.seats)
    .filter((side) => !clock.out.includes(side))
    .reduce((c, side) => leaveSeat(c, side, game.turn, now), clock);
}

const over = (game: GameState) => game.result.status !== 'ongoing';

/** `mover` played a move; `game` is the game after it. */
export function timedAfterMove(timed: Timed, mover: string, game: GameState, now: number): Timed {
  const moved = afterMove(timed.clock, mover, over(game) ? null : game.turn, now);
  const clock = over(game) ? stopClock(moved, now) : sync(moved, game, now);
  return { ...timed, clock, lefts: [...timed.lefts, snapshot(clock, now)] };
}

/** `side` left the game (it resigned or ran out of time); `game` is the game after it. */
export function timedAfterLeave(timed: Timed, side: string, game: GameState, now: number): Timed {
  const left = leaveSeat(timed.clock, side, over(game) ? null : game.turn, now);
  return { ...timed, clock: over(game) ? stopClock(left, now) : sync(left, game, now) };
}

/** The seat ran out of time and play goes on (Show only). */
export const timedFlag = (timed: Timed, side: string): Timed => ({
  ...timed,
  clock: flagSeat(timed.clock, side),
});

export const timedPause = (timed: Timed, now: number): Timed => ({
  ...timed,
  clock: pauseClock(timed.clock, now),
});

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
