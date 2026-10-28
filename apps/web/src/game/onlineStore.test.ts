import { describe, expect, it } from 'vitest';
import type { Store } from './guest';
import { ONLINE_KEY, forgetSeat, loadSeat, saveSeat } from './onlineStore';

const TOKEN = 'A'.repeat(42) + '_';
const OTHER = 'B'.repeat(43);
const NOW = Date.UTC(2026, 9, 27, 12);
const DAY = 86_400_000;

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};
const broken: Store = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('the online store (chess9s.online)', () => {
  it('keeps one entry per room: its seat and its token', () => {
    const store = memory();
    saveSeat(store, 'K7RX2M', { seat: 'light', token: TOKEN }, NOW);
    saveSeat(store, 'QQ2222', { seat: 'dark', token: OTHER }, NOW);
    expect(loadSeat(store, 'K7RX2M', NOW)).toEqual({ seat: 'light', token: TOKEN });
    expect(loadSeat(store, 'QQ2222', NOW)).toEqual({ seat: 'dark', token: OTHER });
    expect(loadSeat(store, 'ZZ9999', NOW)).toBeNull();
    expect(Object.keys(JSON.parse(store.data.get(ONLINE_KEY)!).rooms)).toEqual([
      'K7RX2M',
      'QQ2222',
    ]);
  });

  it('stores nothing about the player: no name, no address', () => {
    const store = memory();
    saveSeat(store, 'K7RX2M', { seat: 'light', token: TOKEN }, NOW);
    expect(Object.keys(JSON.parse(store.data.get(ONLINE_KEY)!).rooms.K7RX2M).sort()).toEqual([
      'at',
      'seat',
      'token',
    ]);
  });

  it('forgets a room when it ends or expires, and removes the key with the last one', () => {
    const store = memory();
    saveSeat(store, 'K7RX2M', { seat: 'light', token: TOKEN }, NOW);
    saveSeat(store, 'QQ2222', { seat: 'dark', token: OTHER }, NOW);
    forgetSeat(store, 'K7RX2M');
    expect(loadSeat(store, 'K7RX2M', NOW)).toBeNull();
    expect(loadSeat(store, 'QQ2222', NOW)).not.toBeNull();
    forgetSeat(store, 'QQ2222');
    expect(store.data.has(ONLINE_KEY)).toBe(false);
  });

  it('drops an entry older than any room can live (D53: 7 days with no move)', () => {
    const store = memory();
    saveSeat(store, 'K7RX2M', { seat: 'light', token: TOKEN }, NOW - 8 * DAY);
    expect(loadSeat(store, 'K7RX2M', NOW)).toBeNull();
    saveSeat(store, 'QQ2222', { seat: 'dark', token: OTHER }, NOW);
    expect(Object.keys(JSON.parse(store.data.get(ONLINE_KEY)!).rooms)).toEqual(['QQ2222']);
  });

  it.each([
    ['not JSON', 'nope'],
    ['another version', JSON.stringify({ v: 2, rooms: {} })],
    [
      'an entry with a bad token',
      JSON.stringify({ v: 1, rooms: { K7RX2M: { seat: 'light', token: 'x', at: NOW } } }),
    ],
    [
      'an entry with a bad seat',
      JSON.stringify({ v: 1, rooms: { K7RX2M: { seat: 'Light!', token: TOKEN, at: NOW } } }),
    ],
    [
      'a room that is not a code',
      JSON.stringify({ v: 1, rooms: { nope: { seat: 'light', token: TOKEN, at: NOW } } }),
    ],
  ])('ignores %s', (_, text) => {
    const store = memory();
    store.setItem(ONLINE_KEY, text);
    expect(loadSeat(store, 'K7RX2M', NOW)).toBeNull();
    // A good entry saved after it still works.
    saveSeat(store, 'K7RX2M', { seat: 'light', token: TOKEN }, NOW);
    expect(loadSeat(store, 'K7RX2M', NOW)).toEqual({ seat: 'light', token: TOKEN });
  });

  it('plays on when storage is blocked', () => {
    expect(() => saveSeat(broken, 'K7RX2M', { seat: 'light', token: TOKEN }, NOW)).not.toThrow();
    expect(loadSeat(broken, 'K7RX2M', NOW)).toBeNull();
    expect(() => forgetSeat(broken, 'K7RX2M')).not.toThrow();
    expect(loadSeat(null, 'K7RX2M', NOW)).toBeNull();
  });
});

describe('the computer seats of a 3-seat room (S63)', () => {
  const dragon = { dragon: OTHER };

  it('keeps their tokens with the entry, so a reload by the creator can play them again', () => {
    const store = memory();
    saveSeat(store, 'K7RX2M', { seat: 'dark', token: TOKEN, computer: dragon }, NOW);
    expect(loadSeat(store, 'K7RX2M', NOW)).toEqual({
      seat: 'dark',
      token: TOKEN,
      computer: dragon,
    });
    // An entry without any has no such key.
    saveSeat(store, 'QQ2222', { seat: 'dark', token: TOKEN }, NOW);
    expect(loadSeat(store, 'QQ2222', NOW)).toEqual({ seat: 'dark', token: TOKEN });
  });

  it('drops tokens that are not tokens, or too many, or for the creator’s own seat, and keeps the seat', () => {
    const store = memory();
    const put = (computer: unknown) =>
      store.setItem(
        ONLINE_KEY,
        JSON.stringify({
          v: 1,
          rooms: { K7RX2M: { seat: 'dark', token: TOKEN, computer, at: NOW } },
        }),
      );
    for (const bad of [
      { dragon: 'short' },
      { 'Not A Side': OTHER },
      { dark: OTHER },
      { a: OTHER, b: OTHER, c: OTHER },
      'dragon',
      [OTHER],
    ]) {
      put(bad);
      expect(loadSeat(store, 'K7RX2M', NOW)).toEqual({ seat: 'dark', token: TOKEN });
    }
  });
});
