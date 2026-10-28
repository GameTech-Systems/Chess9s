// A game's clock (S65, decision 0017): the clock with the control it runs, Show only, and each
// seat's time left after each move (what the game record keeps). These functions work on the clock
// alone; the hot-seat session and an online room (S66) apply them to a game as it is played. Time
// is passed in: the browser passes its own, a room the server's.
import type { TimeControl } from '../rules/time-controls';
import {
  afterMove,
  flagSeat,
  leaveSeat,
  pauseClock,
  snapshot,
  startClock,
  stopClock,
  type Clock,
  type Times,
} from './clock';
import type { GameState } from './game';
import { outSeats } from './three';

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

/** The game ended another way (an agreed draw): the clock stops. */
export const timedStop = (timed: Timed, now: number): Timed => ({
  ...timed,
  clock: stopClock(timed.clock, now),
});
