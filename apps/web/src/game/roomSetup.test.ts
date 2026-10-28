// The create-room screen's choices (S63): which seat the creator takes and which the computer
// plays, kept to what the room accepts (a person always has a seat; at most two for the computer).
import { describe, expect, it } from 'vitest';
import { RANDOM_SEAT } from '@chess9s/online/protocol';
import { chooseSeat, sidesOf, toggleComputer } from './roomSetup';

describe('the sides of a game', () => {
  it('are the board’s sides in turn order, without the neutral side that holds the stones', () => {
    expect(sidesOf(2)).toEqual(['dark', 'light']);
    expect(sidesOf(3)).toEqual(['dark', 'light', 'dragon']);
  });
});

describe('choosing the creator’s seat', () => {
  it('takes the seat, and releases it if the computer had it', () => {
    expect(chooseSeat(RANDOM_SEAT, ['dragon'], 'light')).toEqual({
      seat: 'light',
      computer: ['dragon'],
    });
    expect(chooseSeat('light', ['dragon', 'dark'], 'dragon')).toEqual({
      seat: 'dragon',
      computer: ['dark'],
    });
  });

  it('may go back to random', () => {
    expect(chooseSeat('light', ['dragon'], RANDOM_SEAT)).toEqual({
      seat: RANDOM_SEAT,
      computer: ['dragon'],
    });
  });
});

describe('giving a seat to the computer', () => {
  it('toggles a seat on and off', () => {
    expect(toggleComputer('light', [], 'dragon')).toEqual(['dragon']);
    expect(toggleComputer('light', ['dragon'], 'dragon')).toEqual([]);
  });

  it('never gives away the creator’s own seat', () => {
    expect(toggleComputer('light', [], 'light')).toEqual([]);
  });

  it('gives at most two seats away, so a person always has one', () => {
    expect(toggleComputer(RANDOM_SEAT, ['dark', 'dragon'], 'light')).toEqual(['dark', 'dragon']);
  });

  it('with a random seat still leaves one seat for a person', () => {
    expect(toggleComputer(RANDOM_SEAT, ['dark'], 'dragon')).toEqual(['dark', 'dragon']);
  });
});
