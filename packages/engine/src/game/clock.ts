// The clock (S65, decision 0017): pure functions of `now`, in milliseconds since any fixed point
// the caller keeps (the browser passes Date.now()). Nothing here reads a timer. Fischer controls
// give each seat its minutes and add the increment after the seat's own moves; per-move controls
// give each move the same time and keep none of what was unused. Any number of seats: a seat that
// is out stops its clock, and the move goes to the next seat the game names.
import { isClocked, type TimeControl } from '../rules/time-controls';

export interface Clock {
  control: TimeControl;
  /** Milliseconds left per seat, as of `since` for the seat whose turn it is. */
  left: Record<string, number>;
  /** The seat whose clock runs (or would run, while paused); null once the game is over. */
  turn: string | null;
  /** When the running seat's clock started; null while paused or over. */
  since: number | null;
  /** Seats that ran out of time and are shown as out of time (Show only keeps playing). */
  flagged: string[];
  /** Seats out of the game for another reason: their clocks stay stopped. */
  out: string[];
}

/** Each seat's time left, in milliseconds. */
export type Times = Record<string, number>;

const limitOf = (control: TimeControl): number =>
  control.kind === 'fischer' ? (control.minutes ?? 0) * 60_000 : (control.seconds ?? 0) * 1000;

/** A clock for a new game, running the first mover from `now`; none for a control without one. */
export function startClock(
  control: TimeControl,
  order: readonly string[],
  turn: string,
  now: number,
): Clock | null {
  if (!isClocked(control)) return null;
  return {
    control,
    left: Object.fromEntries(order.map((side) => [side, limitOf(control)])),
    turn,
    since: now,
    flagged: [],
    out: [],
  };
}

const stopped = (clock: Clock, side: string) =>
  clock.flagged.includes(side) || clock.out.includes(side);

const running = (clock: Clock, side: string) =>
  clock.since !== null && clock.turn === side && !stopped(clock, side);

/** Milliseconds `side` has left at `now`; never below zero. */
export function timeLeft(clock: Clock, side: string, now: number): number {
  if (clock.flagged.includes(side)) return 0;
  const left = clock.left[side] ?? 0;
  return Math.max(0, running(clock, side) ? left - (now - clock.since!) : left);
}

/** Every seat's time left at `now`, for the record. */
export const snapshot = (clock: Clock, now: number): Times =>
  Object.fromEntries(Object.keys(clock.left).map((side) => [side, timeLeft(clock, side, now)]));

/** The seat whose time has run out at `now`, if its clock is running. */
export function flagFall(clock: Clock, now: number): string | null {
  const side = clock.turn;
  if (side === null || !running(clock, side)) return null;
  return timeLeft(clock, side, now) <= 0 ? side : null;
}

/** When the running seat runs out, or null when no clock is running. */
export function deadline(clock: Clock): number | null {
  const side = clock.turn;
  if (side === null || !running(clock, side)) return null;
  return clock.since! + (clock.left[side] ?? 0);
}

/** The clock with the running seat charged up to `now`, and stopped. */
export function pauseClock(clock: Clock, now: number): Clock {
  const side = clock.turn;
  if (clock.since === null || side === null) return clock;
  return {
    ...clock,
    left: { ...clock.left, [side]: timeLeft(clock, side, now) },
    since: null,
  };
}

/** A paused clock running again from `now`; a clock that is running or over is left as it is. */
export const resumeClock = (clock: Clock, now: number): Clock =>
  clock.since !== null || clock.turn === null ? clock : { ...clock, since: now };

/** The clock for a game that is over: the running seat is charged and nothing runs after. */
export const stopClock = (clock: Clock, now: number): Clock => ({
  ...pauseClock(clock, now),
  turn: null,
});

/** The move goes to `next`: a per-move seat starts again from the full time. A paused clock stays paused. */
function handTurn(clock: Clock, next: string | null, now: number): Clock {
  if (next === null) return { ...clock, turn: null, since: null };
  const left =
    clock.control.kind === 'perMove'
      ? { ...clock.left, [next]: limitOf(clock.control) }
      : clock.left;
  return { ...clock, left, turn: next, since: clock.since === null ? null : now };
}

/**
 * `mover` made its move and the move goes to `next` (null when the game is over). The mover is
 * charged, and gains the Fischer increment unless it ran out of time (Show only plays on).
 */
export function afterMove(clock: Clock, mover: string, next: string | null, now: number): Clock {
  const time = timeLeft(clock, mover, now);
  const flagged = time <= 0 && !stopped(clock, mover);
  const gain =
    clock.control.kind === 'fischer' && time > 0 ? (clock.control.increment ?? 0) * 1000 : 0;
  const charged: Clock = {
    ...clock,
    left: { ...clock.left, [mover]: time + gain },
    flagged: flagged ? [...clock.flagged, mover] : clock.flagged,
  };
  return handTurn(charged, next, now);
}

/** `side` ran out of time but play goes on (Show only): shown as out of time, its clock stopped. */
export function flagSeat(clock: Clock, side: string): Clock {
  if (clock.flagged.includes(side)) return clock;
  return { ...clock, left: { ...clock.left, [side]: 0 }, flagged: [...clock.flagged, side] };
}

/**
 * `side` is out of the game (it resigned, or ran out of time and the game goes on without it):
 * its clock stops, and the move goes to `next` when it was the seat to move.
 */
export function leaveSeat(clock: Clock, side: string, next: string | null, now: number): Clock {
  if (clock.out.includes(side)) return clock;
  const wasTurn = clock.turn === side;
  const out = { ...(wasTurn ? pauseClock(clock, now) : clock), out: [...clock.out, side] };
  if (!wasTurn) return out;
  return handTurn({ ...out, since: clock.since === null ? null : now }, next, now);
}

/**
 * A clock read back from a saved game or record: paused, with `left` as it was, to run again
 * when resumed. A seat in `out`, and a seat with no time left, stay stopped.
 */
export function restoreClock(
  control: TimeControl,
  left: Times,
  turn: string | null,
  out: readonly string[],
): Clock {
  return {
    control,
    left: { ...left },
    turn,
    since: null,
    flagged: Object.keys(left).filter((side) => left[side]! <= 0 && !out.includes(side)),
    out: [...out],
  };
}
