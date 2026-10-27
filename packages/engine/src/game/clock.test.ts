// S65: the clock (decision 0017) as pure functions of `now`: start, time left, after a move,
// Fischer increments, per-move resets, flag fall, pause and resume, seats that stop.
import { describe, expect, it } from 'vitest';
import type { TimeControl } from '../rules/time-controls';
import {
  afterMove,
  deadline,
  flagFall,
  flagSeat,
  leaveSeat,
  pauseClock,
  restoreClock,
  resumeClock,
  snapshot,
  startClock,
  stopClock,
  timeLeft,
} from './clock';

const S = 1000;
const fischer = (minutes: number, increment: number): TimeControl => ({
  id: `${minutes}+${increment}`,
  name: `${minutes}+${increment}`,
  kind: 'fischer',
  minutes,
  increment,
});
const perMove = (seconds: number): TimeControl => ({
  id: `move${seconds}s`,
  name: `${seconds} seconds per move`,
  kind: 'perMove',
  seconds,
});
const untimed: TimeControl = { id: 'untimed', name: 'Untimed', kind: 'untimed' };
const two = ['light', 'dark'];
const three = ['dark', 'light', 'dragon'];

describe('start', () => {
  it('gives every seat the minutes of a Fischer control, and runs the first mover', () => {
    const c = startClock(fischer(3, 2), two, 'light', 0)!;
    expect(timeLeft(c, 'light', 0)).toBe(180 * S);
    expect(timeLeft(c, 'dark', 0)).toBe(180 * S);
    expect(timeLeft(c, 'light', 10 * S)).toBe(170 * S);
    expect(timeLeft(c, 'dark', 10 * S)).toBe(180 * S);
  });

  it('gives every seat the seconds of a per-move control', () => {
    const c = startClock(perMove(30), three, 'dark', 0)!;
    for (const s of three) expect(timeLeft(c, s, 0)).toBe(30 * S);
    expect(timeLeft(c, 'dark', 12 * S)).toBe(18 * S);
  });

  it('has no clock for an untimed control or the online abandonment control', () => {
    expect(startClock(untimed, two, 'light', 0)).toBeNull();
    expect(
      startClock(
        { id: 'away5m', name: 'away', kind: 'abandonment', awayMinutes: 5, onlineOnly: true },
        two,
        'light',
        0,
      ),
    ).toBeNull();
  });

  it('does not let time left go below zero', () => {
    const c = startClock(perMove(30), two, 'light', 0)!;
    expect(timeLeft(c, 'light', 99 * S)).toBe(0);
  });
});

describe('a move', () => {
  it('charges the mover, adds the Fischer increment, and starts the next seat', () => {
    const c0 = startClock(fischer(3, 2), two, 'light', 0)!;
    const c1 = afterMove(c0, 'light', 'dark', 10 * S);
    expect(timeLeft(c1, 'light', 10 * S)).toBe(172 * S);
    expect(timeLeft(c1, 'light', 50 * S)).toBe(172 * S);
    expect(timeLeft(c1, 'dark', 10 * S)).toBe(180 * S);
    expect(timeLeft(c1, 'dark', 15 * S)).toBe(175 * S);
    expect(c1.turn).toBe('dark');
  });

  it('gains no increment from a 3+0 control', () => {
    const c1 = afterMove(startClock(fischer(3, 0), two, 'light', 0)!, 'light', 'dark', 10 * S);
    expect(timeLeft(c1, 'light', 10 * S)).toBe(170 * S);
  });

  it('keeps a per-move seat at what it had left, and resets it for its next turn', () => {
    let c = startClock(perMove(30), two, 'light', 0)!;
    c = afterMove(c, 'light', 'dark', 12 * S);
    expect(timeLeft(c, 'light', 12 * S)).toBe(18 * S);
    expect(timeLeft(c, 'dark', 12 * S)).toBe(30 * S);
    c = afterMove(c, 'dark', 'light', 20 * S);
    // Unused time is not kept: light has the full 30 seconds again.
    expect(timeLeft(c, 'light', 20 * S)).toBe(30 * S);
    expect(timeLeft(c, 'light', 25 * S)).toBe(25 * S);
  });

  it('runs the seats of a 3-player game in turn, each with its own clock', () => {
    let c = startClock(fischer(1, 5), three, 'dark', 0)!;
    c = afterMove(c, 'dark', 'light', 4 * S);
    c = afterMove(c, 'light', 'dragon', 10 * S);
    c = afterMove(c, 'dragon', 'dark', 11 * S);
    expect(timeLeft(c, 'dark', 11 * S)).toBe(61 * S);
    expect(timeLeft(c, 'light', 11 * S)).toBe(59 * S);
    expect(timeLeft(c, 'dragon', 11 * S)).toBe(64 * S);
    expect(c.turn).toBe('dark');
  });

  it('records the time left of every seat after a move', () => {
    const c = afterMove(startClock(fischer(3, 2), two, 'light', 0)!, 'light', 'dark', 10 * S);
    expect(snapshot(c, 10 * S)).toEqual({ light: 172 * S, dark: 180 * S });
  });

  it('ends the clock with no next seat once the game is over', () => {
    const c = afterMove(startClock(fischer(3, 2), two, 'light', 0)!, 'light', null, 10 * S);
    expect(c.turn).toBeNull();
    expect(deadline(c)).toBeNull();
    expect(flagFall(c, 999 * S)).toBeNull();
  });
});

describe('flag fall', () => {
  it('is the running seat once its time is up, and not before', () => {
    const c = startClock(fischer(1, 0), two, 'light', 0)!;
    expect(flagFall(c, 59 * S)).toBeNull();
    expect(flagFall(c, 60 * S)).toBe('light');
    expect(flagFall(c, 80 * S)).toBe('light');
  });

  it('has a deadline at the moment the running seat runs out', () => {
    let c = startClock(fischer(1, 0), two, 'light', 0)!;
    expect(deadline(c)).toBe(60 * S);
    c = afterMove(c, 'light', 'dark', 10 * S);
    expect(deadline(c)).toBe(70 * S);
  });

  it('falls for a per-move seat at its limit', () => {
    const c = startClock(perMove(30), three, 'dark', 0)!;
    expect(flagFall(c, 30 * S)).toBe('dark');
  });

  it('is not reported again for a seat shown as out of time (Show only)', () => {
    const c0 = startClock(fischer(1, 0), two, 'light', 0)!;
    const c = flagSeat(c0, 'light');
    expect(c.flagged).toEqual(['light']);
    expect(flagFall(c, 100 * S)).toBeNull();
    expect(timeLeft(c, 'light', 100 * S)).toBe(0);
    expect(deadline(c)).toBeNull();
  });

  it('lets a flagged seat move without gaining an increment, and the next seat run', () => {
    let c = flagSeat(startClock(fischer(1, 5), two, 'light', 0)!, 'light');
    c = afterMove(c, 'light', 'dark', 70 * S);
    expect(timeLeft(c, 'light', 70 * S)).toBe(0);
    expect(timeLeft(c, 'dark', 80 * S)).toBe(50 * S);
    expect(c.flagged).toEqual(['light']);
  });

  it('flags a seat that moves in the same instant its time ends (Show only)', () => {
    const c = afterMove(startClock(fischer(1, 5), two, 'light', 0)!, 'light', 'dark', 60 * S);
    expect(c.flagged).toEqual(['light']);
    expect(timeLeft(c, 'light', 60 * S)).toBe(0);
  });
});

describe('pause', () => {
  it('stops the running seat and keeps what it had left', () => {
    let c = startClock(fischer(3, 2), two, 'light', 0)!;
    c = pauseClock(c, 10 * S);
    expect(timeLeft(c, 'light', 10 * S)).toBe(170 * S);
    expect(timeLeft(c, 'light', 500 * S)).toBe(170 * S);
    expect(flagFall(c, 9999 * S)).toBeNull();
    expect(deadline(c)).toBeNull();
  });

  it('runs on from the moment it is resumed', () => {
    let c = pauseClock(startClock(fischer(3, 2), two, 'light', 0)!, 10 * S);
    c = resumeClock(c, 100 * S);
    expect(timeLeft(c, 'light', 100 * S)).toBe(170 * S);
    expect(timeLeft(c, 'light', 110 * S)).toBe(160 * S);
  });

  it('pausing twice, or resuming a running clock, changes nothing', () => {
    const c0 = startClock(fischer(3, 2), two, 'light', 0)!;
    expect(resumeClock(c0, 5 * S)).toEqual(c0);
    const p = pauseClock(c0, 10 * S);
    expect(pauseClock(p, 50 * S)).toEqual(p);
  });

  it('also holds a per-move seat', () => {
    let c = pauseClock(startClock(perMove(30), two, 'light', 0)!, 10 * S);
    c = resumeClock(c, 40 * S);
    expect(timeLeft(c, 'light', 45 * S)).toBe(15 * S);
  });

  it('a move made while paused leaves the next seat paused', () => {
    let c = pauseClock(startClock(fischer(3, 2), two, 'light', 0)!, 10 * S);
    c = afterMove(c, 'light', 'dark', 20 * S);
    expect(c.since).toBeNull();
    expect(timeLeft(c, 'dark', 99 * S)).toBe(180 * S);
  });

  it('a stopped clock cannot be resumed', () => {
    const c = stopClock(startClock(fischer(3, 2), two, 'light', 0)!, 10 * S);
    expect(c.turn).toBeNull();
    expect(resumeClock(c, 20 * S).since).toBeNull();
  });
});

describe('a seat that is out stops its clock', () => {
  it('hands the move to the next seat and keeps the seat out', () => {
    let c = startClock(fischer(1, 0), three, 'dark', 0)!;
    c = leaveSeat(c, 'dark', 'light', 20 * S);
    expect(c.out).toEqual(['dark']);
    expect(timeLeft(c, 'dark', 20 * S)).toBe(40 * S);
    expect(timeLeft(c, 'dark', 90 * S)).toBe(40 * S);
    expect(c.turn).toBe('light');
    expect(timeLeft(c, 'light', 30 * S)).toBe(50 * S);
  });

  it('leaves the running seat alone when another seat goes out', () => {
    let c = startClock(fischer(1, 0), three, 'dark', 0)!;
    c = leaveSeat(c, 'dragon', 'dark', 20 * S);
    expect(c.turn).toBe('dark');
    expect(timeLeft(c, 'dark', 30 * S)).toBe(30 * S);
    expect(timeLeft(c, 'dragon', 30 * S)).toBe(60 * S);
  });

  it('resets a per-move seat handed the move', () => {
    let c = startClock(perMove(30), three, 'dark', 0)!;
    c = leaveSeat(c, 'dark', 'light', 20 * S);
    expect(timeLeft(c, 'light', 20 * S)).toBe(30 * S);
  });

  it('ends the clock when nobody is left to move', () => {
    const c = leaveSeat(startClock(fischer(1, 0), two, 'light', 0)!, 'light', null, 5 * S);
    expect(c.turn).toBeNull();
  });
});

describe('restoring a saved clock', () => {
  it('comes back paused with the same times, to run when resumed', () => {
    const c0 = afterMove(startClock(fischer(3, 2), three, 'dark', 0)!, 'dark', 'light', 10 * S);
    const saved = snapshot(c0, 25 * S);
    const c = restoreClock(fischer(3, 2), saved, 'light', []);
    expect(c.since).toBeNull();
    expect(timeLeft(c, 'light', 999 * S)).toBe(165 * S);
    const r = resumeClock(c, 1000 * S);
    expect(timeLeft(r, 'light', 1010 * S)).toBe(155 * S);
  });

  it('keeps seats out of the game stopped, and seats at zero flagged', () => {
    const c = restoreClock(fischer(1, 0), { dark: 0, light: 30 * S, dragon: 10 * S }, 'light', [
      'dragon',
    ]);
    expect(c.out).toEqual(['dragon']);
    expect(c.flagged).toEqual(['dark']);
  });

  it('has no running turn for a finished game', () => {
    const c = restoreClock(fischer(1, 0), { dark: 0, light: 30 * S }, null, []);
    expect(c.turn).toBeNull();
  });
});
