import { describe, expect, it } from 'vitest';
import { addSpent, formatElapsed, soundsFor } from './aids';

describe('formatElapsed', () => {
  it('shows minutes and seconds, then hours', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(59_999)).toBe('0:59');
    expect(formatElapsed(61_000)).toBe('1:01');
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });
  it('never goes negative', () => {
    expect(formatElapsed(-5)).toBe('0:00');
  });
});

describe('soundsFor', () => {
  it('knocks on a move and chimes for the next turn', () => {
    expect(soundsFor(0, 1, false)).toEqual(['knock', 'chime']);
  });
  it('only knocks when the game has ended', () => {
    expect(soundsFor(5, 6, true)).toEqual(['knock']);
  });
  it('is silent when no move was added (new game, undo)', () => {
    expect(soundsFor(3, 3, false)).toEqual([]);
    expect(soundsFor(3, 2, false)).toEqual([]);
  });
});

describe('addSpent (3-player seat clocks, display only)', () => {
  it('adds the time to the seat that had the move, without changing the rest or going negative', () => {
    const one = addSpent({}, 'dark', 1500);
    expect(one).toEqual({ dark: 1500 });
    const two = addSpent(one, 'light', 400);
    expect(two).toEqual({ dark: 1500, light: 400 });
    expect(addSpent(two, 'dark', 500)).toEqual({ dark: 2000, light: 400 });
    expect(addSpent(two, 'dark', -50)).toEqual(two);
    expect(one).toEqual({ dark: 1500 });
  });
});
