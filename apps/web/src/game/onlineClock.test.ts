// Clocks in online rooms (S66, decision 0017): the browser shows the room's clock and never sets
// it. Times come from the server with each snapshot and move, and run here from when they arrive;
// a flag falls only when the server says so.
import { describe, expect, it } from 'vitest';
import { toNotation } from '@chess9s/engine';
import type { ServerMessage, Snapshot } from '@chess9s/online/protocol';
import { createMessage } from './api';
import { ruleset } from './rules';
import { clockLines } from './session';
import {
  applyServer,
  awayLeft,
  onlineStatus,
  onlineTimed,
  pressSquare,
  setConnection,
  startOnline,
  type Online,
} from './online';

const CODE = 'K7RX2M';
const DRAFT = { id: 'draft-2p', version: '0.2.0', name: 'Good Practice' };
const STANDARD_3P = { id: 'standard-3p', version: '0.2.0', name: 'Standard 3-player' };
const MIN = 60_000;
const NOW = 1_000_000;
const FULL = { light: 3 * MIN, dark: 3 * MIN };

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'light',
  ruleset: DRAFT,
  moves: [],
  result: { status: 'ongoing' },
  seats: { light: 'present', dark: 'present' },
  drawOffer: null,
  time: { control: '3+2', left: FULL, lefts: [] },
  ...over,
});
const start = (over: Partial<Snapshot> = {}, now = NOW): Online => {
  const online = startOnline(snap(over), undefined, 'connecting', now);
  if (!online) throw new Error('the snapshot did not replay');
  return setConnection(online, 'open');
};
/** Each message arrives at its own time. */
const say = (o: Online, ...ms: [ServerMessage, number][]) =>
  ms.reduce((acc, [m, now]) => applyServer(acc, m, now), o);
const times = (o: Online, now: number) =>
  Object.fromEntries(clockLines(o.model, now).map((l) => [l.side, l.ms]));
const running = (o: Online, now: number) =>
  clockLines(o.model, now)
    .filter((l) => l.running)
    .map((l) => l.side);
const first = (o: Online) => toNotation(o.model.game.legal[0]!);

describe('the clock a snapshot brings', () => {
  it('has none in an untimed room', () => {
    const untimed: Snapshot = { ...snap() };
    delete untimed.time;
    const o = startOnline(untimed, undefined, 'open', NOW)!;
    expect(o.model.timed).toBeNull();
    expect(o.control).toBeNull();
    expect(clockLines(o.model, NOW)).toEqual([]);
  });

  it('runs the seat to move from when the snapshot arrived, with the time it had then', () => {
    // Dark moves first in draft-2p; the server says dark has 2:50 left.
    const o = start({
      time: { control: '3+2', left: { light: 3 * MIN, dark: 170_000 }, lefts: [] },
    });
    expect(o.control?.id).toBe('3+2');
    expect(running(o, NOW)).toEqual(['dark']);
    expect(times(o, NOW + 5000)).toEqual({ dark: 165_000, light: 3 * MIN });
  });

  it('does not run while a seat is open, and starts when the last player arrives', () => {
    const o = start({ seats: { light: 'present', dark: 'open' } });
    expect(running(o, NOW + 9000)).toEqual([]);
    const joined = say(o, [{ v: 1, type: 'opponent', status: 'present' }, NOW + 10_000]);
    expect(running(joined, NOW + 10_000)).toEqual(['dark']);
    expect(times(joined, NOW + 15_000)).toEqual({ dark: 3 * MIN - 5000, light: 3 * MIN });
  });

  it('refuses a control this app does not know: the app is out of date', () => {
    expect(startOnline(snap({ time: { control: '9+9' } }))).toBeNull();
  });

  it('shows Show only and the seats already out of time', () => {
    const o = start({
      time: {
        control: '1+0',
        showOnly: true,
        left: { dark: 0, light: MIN },
        lefts: [],
        flagged: ['dark'],
      },
    });
    expect(o.showOnly).toBe(true);
    expect(clockLines(o.model, NOW).find((l) => l.side === 'dark')).toMatchObject({
      flagged: true,
      running: false,
      ms: 0,
    });
  });
});

describe('moves and the end', () => {
  it("takes each seat's time from the move the server sends, and keeps it for the record", () => {
    const o = start();
    const left = { dark: 172_000, light: 3 * MIN };
    const after = say(o, [
      { v: 1, type: 'move', move: first(o), side: 'dark', left },
      NOW + 10_000,
    ]);
    expect(running(after, NOW + 10_000)).toEqual(['light']);
    expect(times(after, NOW + 13_000)).toEqual({ dark: 172_000, light: 3 * MIN - 3000 });
    expect(onlineTimed(after)?.lefts).toEqual([left]);
  });

  it("sends a move whatever this browser's clock reads: only the server drops a flag", () => {
    const o = start({ seat: 'dark' });
    const m = o.model.game.legal.find((l) => !l.promotion && !l.castle)!;
    // Long after dark's time would be up here, a click still plays and sends the move.
    const picked = pressSquare(o, m.from).online;
    const sent = pressSquare(picked, m.to);
    expect(sent.send).toEqual({ v: 1, type: 'move', move: toNotation(m) });
    expect(sent.online.model.game.result.status).toBe('ongoing');
    // The echo carries the times; the client never sends one.
    const echo = say(sent.online, [
      {
        v: 1,
        type: 'move',
        move: toNotation(m),
        side: 'dark',
        left: { dark: 1000, light: 3 * MIN },
      },
      NOW + 5 * MIN,
    ]);
    expect(echo.pending).toBeNull();
    expect(times(echo, NOW + 5 * MIN)).toEqual({ dark: 1000, light: 3 * MIN });
  });

  it('ends a 2-seat game when the server says a seat ran out of time (D66)', () => {
    const o = start();
    const result = { status: 'win', winner: 'light', loser: 'dark', reason: 'timeout' } as const;
    const over = say(
      o,
      [
        { v: 1, type: 'out-of-time', side: 'dark', left: { dark: 0, light: 3 * MIN } },
        NOW + 3 * MIN,
      ],
      [{ v: 1, type: 'game-over', result }, NOW + 3 * MIN],
    );
    expect(over.model.game.result).toEqual(result);
    expect(running(over, NOW + 4 * MIN)).toEqual([]);
    expect(times(over, NOW + 4 * MIN)).toEqual({ dark: 0, light: 3 * MIN });
    expect(onlineStatus(over)).toMatch(/you win/);
  });

  it('shows the seat out of time and plays on with Show only', () => {
    const o = start({
      time: { control: '1+0', showOnly: true, left: { dark: MIN, light: MIN }, lefts: [] },
    });
    const flagged = say(o, [
      { v: 1, type: 'out-of-time', side: 'dark', left: { dark: 0, light: MIN } },
      NOW + MIN,
    ]);
    expect(flagged.model.game.result.status).toBe('ongoing');
    expect(clockLines(flagged.model, NOW + MIN).find((l) => l.side === 'dark')?.flagged).toBe(true);
  });

  it('puts a seat of a 3-seat room out when its time runs out, and runs the next', () => {
    const o = start({
      ruleset: STANDARD_3P,
      seat: 'dark',
      seats: { dark: 'present', light: 'present', dragon: 'present' },
      time: { control: '1+0', left: { dark: MIN, light: MIN, dragon: MIN }, lefts: [] },
    });
    const turn = o.model.game.turn;
    const after = say(o, [
      {
        v: 1,
        type: 'out-of-time',
        side: turn,
        left: { dark: MIN, light: MIN, dragon: MIN, [turn]: 0 },
      },
      NOW + MIN,
    ]);
    expect(after.model.game.seats[turn]).toBe('out');
    expect(after.model.game.resignations).toEqual([{ side: turn, after: 0, timeout: true }]);
    expect(running(after, NOW + MIN)).toEqual([after.model.game.turn]);
    expect(after.model.game.turn).not.toBe(turn);
  });
});

describe('the abandonment control', () => {
  it('has no clock, and shows how long a seat away has before it is out', () => {
    const o = start({ time: { control: 'away5m', away: {} } });
    expect(o.model.timed).toBeNull();
    expect(o.control?.id).toBe('away5m');
    const counting = say(o, [{ v: 1, type: 'away', away: { dark: 5 * MIN } }, NOW + 1000]);
    expect(awayLeft(counting, NOW + 61_000)).toEqual({ dark: 4 * MIN });
    expect(awayLeft(say(counting, [{ v: 1, type: 'away', away: {} }, NOW + 2000]), NOW)).toEqual(
      {},
    );
    const reloaded = start({ time: { control: 'away5m', away: { dark: 90_000 } } }, NOW);
    expect(awayLeft(reloaded, NOW + 30_000)).toEqual({ dark: 60_000 });
  });
});

describe('making a room', () => {
  it('sends the time control chosen, and nothing for an untimed room', () => {
    expect(createMessage(ruleset, 'light', [], { control: '3+2' })).toMatchObject({
      time: { control: '3+2' },
    });
    expect(createMessage(ruleset, 'light', [], { control: 'move1d', showOnly: true }).time).toEqual(
      { control: 'move1d', showOnly: true },
    );
    expect(createMessage(ruleset, 'light', [], { control: 'untimed' })).not.toHaveProperty('time');
    expect(createMessage(ruleset, 'light')).not.toHaveProperty('time');
  });
});
