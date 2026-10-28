// The Room Durable Object (S52) against a fake runtime: rooms are saved as they are played and
// replayed after a restart, seats are taken back with their tokens, idle sockets are closed, and
// a room is deleted on D53's schedule.
import {
  CLOSE_GONE,
  CLOSE_IDLE,
  CLOSE_REPLACED,
  rulesFiles,
  type ServerMessage,
  type Snapshot,
} from '@chess9s/online';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRules, newGame, playMove, toNotation } from '@chess9s/engine';
import hotSeatMate from '../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import threeEnds from '../../../packages/engine/test/fixtures/games/three-player-ends.json';
import { FakeSocket, FakeSockets, FakeState } from './fakes';
import {
  IDLE_MS,
  JOIN_WITHIN_MS,
  KEEP_AFTER_END_MS,
  KEEP_WITHOUT_MOVE_MS,
  MAX_SOCKETS,
  Room,
} from './room';

const CODE = 'K7RX2M';
const DRAFT = { id: 'draft-2p', version: '0.2.0' };
const START = Date.UTC(2026, 9, 27, 12);
const HOUR = 3_600_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
});
afterEach(() => vi.useRealTimers());

function harness() {
  const state = new FakeState();
  const sockets = new FakeSockets();
  let room = new Room(state, {}, sockets);
  const h = {
    state,
    get room() {
      return room;
    },
    /** A new Room on the same state: what Cloudflare does after hibernation or a restart. */
    restart() {
      room = new Room(state, {}, sockets);
    },
    create: (body: unknown = { v: 1, type: 'create', ruleset: DRAFT, seat: 'light' }) =>
      room.fetch(
        new Request(`https://room/create?code=${CODE}`, {
          method: 'POST',
          body: typeof body === 'string' ? body : JSON.stringify(body),
        }),
      ),
    info: () => room.fetch(new Request('https://room/info')),
    async connect(): Promise<FakeSocket> {
      const res = await room.fetch(
        new Request('https://room/socket', { headers: { Upgrade: 'websocket' } }),
      );
      expect(res.status).toBe(200);
      return sockets.last!;
    },
    send: (ws: FakeSocket, msg: unknown) =>
      room.webSocketMessage(ws, typeof msg === 'string' ? msg : JSON.stringify(msg)),
    /** The client went away: the runtime calls the handler while the socket is still closing. */
    async drop(ws: FakeSocket) {
      await room.webSocketClose(ws);
      ws.close(1006);
    },
    async fireAlarm() {
      const at = state.alarmAt;
      if (at === null) throw new Error('No alarm is set.');
      vi.setSystemTime(Math.max(at, Date.now()));
      state.alarmAt = null;
      await room.alarm();
    },
    /** Create the room with light, then connect light (by token) and dark (fresh). */
    async seated() {
      const created = (await (await h.create()).json()) as Snapshot;
      const light = await h.connect();
      await h.send(light, { v: 1, type: 'join', code: CODE, token: created.token });
      const dark = await h.connect();
      await h.send(dark, { v: 1, type: 'join', code: CODE });
      const darkToken = (dark.messages()[0] as Snapshot).token!;
      light.take();
      dark.take();
      return { light, dark, lightToken: created.token!, darkToken };
    },
  };
  return h;
}

const types = (msgs: ServerMessage[]) => msgs.map((m) => m.type);

describe('creating and peeking', () => {
  it('creates a room: the creator gets its seat token, the seat stays away until it connects', async () => {
    const h = harness();
    const res = await h.create();
    expect(res.status).toBe(201);
    const snap = (await res.json()) as Snapshot;
    expect(snap).toMatchObject({ type: 'snapshot', code: CODE, seat: 'light', moves: [] });
    expect(snap.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(snap.seats).toEqual({ light: 'away', dark: 'open' });
  });

  it('shows the ruleset and the seats to anyone, never a token', async () => {
    const h = harness();
    await h.create();
    const res = await h.info();
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({
      v: 1,
      code: CODE,
      ruleset: { ...DRAFT, name: expect.any(String) },
      seats: { light: 'away', dark: 'open' },
      result: { status: 'ongoing' },
    });
    expect(body).not.toMatch(/token/);
  });

  it('refuses a second create on the same code, so the Worker picks another', async () => {
    const h = harness();
    expect((await h.create()).status).toBe(201);
    expect((await h.create()).status).toBe(409);
  });

  it('refuses a bad create with the protocol refusal and keeps nothing', async () => {
    const h = harness();
    const res = await h.create({
      v: 1,
      type: 'create',
      ruleset: { id: 'nope', version: '1.0.0' },
      seat: 'light',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ type: 'refused', reason: 'unknown-ruleset' });
    expect(h.state.data.size).toBe(0);
    const join = await h.create({ v: 1, type: 'join', code: CODE });
    expect(await join.json()).toMatchObject({ type: 'refused', reason: 'malformed' });
  });

  it('answers 404 for a room that does not exist', async () => {
    const h = harness();
    expect((await h.info()).status).toBe(404);
    const res = await h.room.fetch(
      new Request('https://room/socket', { headers: { Upgrade: 'websocket' } }),
    );
    expect(res.status).toBe(404);
  });
});

describe('playing', () => {
  it('plays the 80-move game through restarts and a reconnect, saving every move', async () => {
    const h = harness();
    const seated = await h.seated();
    const { light, darkToken } = seated;
    let { dark } = seated;
    const moves = hotSeatMate.moves as string[];
    for (const [i, move] of moves.entries()) {
      if (i === 40) {
        // Dark's connection drops and comes back with its token.
        await h.drop(dark);
        expect(light.take().filter((m) => m.type !== 'move')).toEqual([
          { v: 1, type: 'opponent', status: 'away' },
        ]);
        h.restart();
        dark = await h.connect();
        await h.send(dark, { v: 1, type: 'join', code: CODE, token: darkToken });
        const snap = dark.take()[0] as Snapshot;
        expect(snap.moves).toEqual(moves.slice(0, 40));
        expect(snap.token).toBeUndefined();
        expect(light.take()).toEqual([{ v: 1, type: 'opponent', status: 'present' }]);
      }
      if (i % 10 === 5) h.restart();
      // Dark moves first on this board.
      const mover = i % 2 === 0 ? dark : light;
      await h.send(mover, { v: 1, type: 'move', move });
      const saved = h.state.data.get('room') as { moves: string[] };
      expect(saved.moves).toHaveLength(i + 1);
    }
    for (const ws of [light, dark]) {
      const got = ws.take();
      expect(got.at(-1)).toEqual({ v: 1, type: 'game-over', result: hotSeatMate.result });
    }
    h.restart();
    expect(await (await h.info()).json()).toMatchObject({ result: hotSeatMate.result });
  });

  it('keeps only the game and its seat tokens: no names, addresses or agents', async () => {
    const h = harness();
    await h.seated();
    expect([...h.state.data.keys()]).toEqual(['room']);
    expect(Object.keys(h.state.data.get('room') as object).sort()).toEqual(
      [
        'code',
        'drawOffer',
        'endedAt',
        'lastMove',
        'moves',
        'offerWait',
        'result',
        'ruleset',
        'tokens',
        'v',
      ].sort(),
    );
  });

  it('keeps a declined draw offer across a restart', async () => {
    const h = harness();
    const { light, dark } = await h.seated();
    await h.send(light, { v: 1, type: 'offer-draw' });
    await h.send(dark, { v: 1, type: 'decline-draw' });
    h.restart();
    light.take();
    await h.send(light, { v: 1, type: 'offer-draw' });
    expect(light.take()).toMatchObject([{ type: 'refused', reason: 'offer-again-later' }]);
  });

  it('a seat taken back on a new connection closes the old one without telling anyone it left', async () => {
    const h = harness();
    const { light, dark, lightToken } = await h.seated();
    const again = await h.connect();
    await h.send(again, { v: 1, type: 'join', code: CODE, token: lightToken });
    expect(light.closed?.code).toBe(CLOSE_REPLACED);
    await h.room.webSocketClose(light);
    expect(dark.take()).toEqual([]);
    // The new connection is light's: it gets dark's move, and the old one gets nothing more.
    light.take();
    again.take();
    await h.send(dark, { v: 1, type: 'move', move: (hotSeatMate.moves as string[])[0] });
    expect(types(again.take())).toEqual(['move']);
    expect(light.take()).toEqual([]);
  });

  it('refuses binary messages and holds at most a few sockets', async () => {
    const h = harness();
    await h.create();
    const ws = await h.connect();
    await h.room.webSocketMessage(ws, new ArrayBuffer(4));
    expect(ws.take()).toMatchObject([{ type: 'refused', reason: 'malformed' }]);
    for (let i = 1; i < MAX_SOCKETS; i++) await h.connect();
    const res = await h.room.fetch(
      new Request('https://room/socket', { headers: { Upgrade: 'websocket' } }),
    );
    expect(res.status).toBe(429);
  });

  it('closes the socket of a room whose saved game no longer replays', async () => {
    const h = harness();
    const { light } = await h.seated();
    const saved = h.state.data.get('room') as { moves: string[] };
    h.state.data.set('room', { ...saved, moves: ['a1-a9'] });
    h.restart();
    await h.send(light, { v: 1, type: 'resign' });
    expect(light.closed?.code).toBe(CLOSE_GONE);
    expect((await h.info()).status).toBe(404);
  });
});

describe('idle sockets', () => {
  it('closes a socket that has not joined within a minute', async () => {
    const h = harness();
    await h.create();
    const ws = await h.connect();
    expect(h.state.alarmAt).toBeLessThanOrEqual(START + JOIN_WITHIN_MS);
    await h.fireAlarm();
    expect(ws.closed?.code).toBe(CLOSE_IDLE);
  });

  it('closes a seated socket with no message and no ping, and tells the opponent', async () => {
    const h = harness();
    const { light, dark } = await h.seated();
    // Dark pings (answered by the runtime, never seen by the room); light goes quiet.
    for (let i = 0; i < 5 && !light.closed; i++) {
      dark.pinged = new Date(h.state.alarmAt!);
      await h.fireAlarm();
    }
    expect(Date.now()).toBe(START + IDLE_MS);
    expect(light.closed?.code).toBe(CLOSE_IDLE);
    expect(dark.closed).toBeNull();
    expect(dark.take()).toEqual([{ v: 1, type: 'opponent', status: 'away' }]);
    expect(h.state.alarmAt).not.toBeNull();
  });
});

describe('retention (D53)', () => {
  it('deletes a room 7 days after its last move, and a move moves the date', async () => {
    const h = harness();
    const { light, dark } = await h.seated();
    vi.setSystemTime(START + 3 * 24 * HOUR);
    await h.send(dark, { v: 1, type: 'move', move: (hotSeatMate.moves as string[])[0] });
    await h.drop(light);
    await h.drop(dark);
    await h.fireAlarm(); // the idle check of the closed sockets finds nothing to do
    expect(h.state.alarmAt).toBe(START + 3 * 24 * HOUR + KEEP_WITHOUT_MOVE_MS);
    expect((await h.info()).status).toBe(200);
    await h.fireAlarm();
    h.restart();
    expect((await h.info()).status).toBe(404);
    expect(h.state.data.size).toBe(0);
    expect(h.state.alarmAt).toBeNull();
  });

  it('deletes a room 24 hours after the game ends and closes its sockets', async () => {
    const h = harness();
    const { light, dark } = await h.seated();
    await h.send(light, { v: 1, type: 'resign' });
    const ended = Date.now();
    for (;;) {
      const at = h.state.alarmAt!;
      if (at >= ended + KEEP_AFTER_END_MS) break;
      // The sockets keep pinging, so only the retention date can close them.
      light.pinged = dark.pinged = new Date(at);
      await h.fireAlarm();
      expect((await h.info()).status).toBe(200);
    }
    expect(h.state.alarmAt).toBe(ended + KEEP_AFTER_END_MS);
    await h.fireAlarm();
    expect(light.closed?.code).toBe(CLOSE_GONE);
    expect(dark.closed?.code).toBe(CLOSE_GONE);
    expect((await h.info()).status).toBe(404);
    expect(h.state.data.size).toBe(0);
  });

  it('deletes a room that was created and never joined after 7 days', async () => {
    const h = harness();
    await h.create();
    expect(h.state.alarmAt).toBe(START + KEEP_WITHOUT_MOVE_MS);
    await h.fireAlarm();
    expect((await h.info()).status).toBe(404);
  });
});

describe('a room with three seats (S63, D61)', () => {
  const STANDARD_3P = { id: 'standard-3p', version: '0.2.0' };
  const make = (computer?: string[]) => ({
    v: 1,
    type: 'create',
    ruleset: STANDARD_3P,
    seat: 'dark',
    ...(computer && { computer }),
  });
  const join = (token?: string) => ({ v: 1, type: 'join', code: CODE, ...(token && { token }) });

  /** The three seats of a standard-3p room, each on its own socket. */
  async function seated3(h: ReturnType<typeof harness>) {
    const created = (await (await h.create(make())).json()) as Snapshot;
    const sockets: Record<string, FakeSocket> = {};
    const tokens: Record<string, string> = { dark: created.token! };
    const first = await h.connect();
    await h.send(first, join(created.token));
    sockets.dark = first;
    for (let i = 0; i < 2; i++) {
      const ws = await h.connect();
      await h.send(ws, join());
      const snap = ws.messages()[0] as Snapshot;
      sockets[snap.seat] = ws;
      tokens[snap.seat] = snap.token!;
    }
    for (const ws of Object.values(sockets)) ws.take();
    return { sockets, tokens };
  }

  it("creates a room with three seats, and the computer seats' tokens only in the reply", async () => {
    const h = harness();
    const res = await h.create(make(['dragon']));
    expect(res.status).toBe(201);
    const snap = (await res.json()) as Snapshot;
    expect(snap.seats).toEqual({ dark: 'away', light: 'open', dragon: 'away' });
    expect(snap.computer).toEqual(['dragon']);
    expect(Object.keys(snap.computerTokens!)).toEqual(['dragon']);
    // Anyone can see which seat is the computer's, but never a token.
    const peek = await (await h.info()).text();
    expect(JSON.parse(peek)).toMatchObject({ computer: ['dragon'], seats: snap.seats });
    expect(peek).not.toContain(snap.token!);
    expect(peek).not.toContain(snap.computerTokens!.dragon!);
  });

  it('keeps the computer seats and the resignations, and gives them back after a restart', async () => {
    const h = harness();
    const created = (await (await h.create(make(['dragon']))).json()) as Snapshot;
    const saved = h.state.data.get('room') as { computer?: string[]; tokens: object };
    expect(saved.computer).toEqual(['dragon']);
    expect(Object.keys(saved.tokens).sort()).toEqual(['dark', 'dragon', 'light']);
    // Creator, a friend, and the creator's browser for the computer.
    const dark = await h.connect();
    await h.send(dark, join(created.token));
    const friend = await h.connect();
    await h.send(friend, join());
    const bot = await h.connect();
    await h.send(bot, join(created.computerTokens!.dragon));
    expect((bot.take()[0] as Snapshot).seat).toBe('dragon');
    const friendToken = (friend.take()[0] as Snapshot).token!;
    dark.take();
    // The friend resigns at once: the other two are told, and the room keeps it.
    await h.send(friend, { v: 1, type: 'resign' });
    expect(types(dark.take())).toEqual(['resigned']);
    expect(types(bot.take())).toEqual(['resigned']);
    expect((h.state.data.get('room') as { resignations?: unknown }).resignations).toEqual([
      { side: 'light', after: 0 },
    ]);
    h.restart();
    const again = await h.connect();
    await h.send(again, join(friendToken));
    expect(again.take()).toMatchObject([
      {
        type: 'snapshot',
        seat: 'light',
        resignations: [{ side: 'light', after: 0 }],
        computer: ['dragon'],
        seats: { dark: 'present', light: 'present', dragon: 'present' },
      },
    ]);
  });

  it('does not save what a 2-seat room never had', async () => {
    const h = harness();
    await h.create(make());
    expect(Object.keys(h.state.data.get('room') as object).sort()).toEqual(
      [
        'code',
        'drawOffer',
        'endedAt',
        'lastMove',
        'moves',
        'offerWait',
        'result',
        'ruleset',
        'tokens',
        'v',
      ].sort(),
    );
  });

  it('plays a game through three sockets and ends it for all three', async () => {
    const h = harness();
    const { sockets } = await seated3(h);
    const game = threeEnds.games.find(
      (g) => g.ruleset === 'standard-3p' && g.rows.includes('kinged-checkmates-king'),
    )!;
    // A local copy of the game says whose turn each move is, as a browser's would.
    let local = newGame(
      loadRules(rulesFiles).rules(STANDARD_3P.id, STANDARD_3P.version),
      STANDARD_3P,
    );
    for (const notation of game.moves) {
      await h.send(sockets[local.turn]!, { v: 1, type: 'move', move: notation });
      local = playMove(
        local,
        local.legal.find((m) => toNotation(m) === notation)!,
      );
    }
    for (const ws of Object.values(sockets)) {
      const msgs = ws.take();
      expect(msgs.filter((m) => m.type === 'move')).toHaveLength(game.moves.length);
      expect(msgs.at(-1)).toEqual({ v: 1, type: 'game-over', result: game.result });
    }
    expect(await (await h.info()).json()).toMatchObject({ result: game.result });
    // The room is deleted 24 hours after the end, as for two seats (D53).
    expect((h.state.data.get('room') as { endedAt: number }).endedAt).toBe(START);
  });

  it('holds six sockets, two for each seat', async () => {
    const h = harness();
    await h.create(make());
    for (let i = 0; i < 6; i++) await h.connect();
    const res = await h.room.fetch(
      new Request('https://room/socket', { headers: { Upgrade: 'websocket' } }),
    );
    expect(res.status).toBe(429);
  });
});

describe('clocks (S66, decision 0017)', () => {
  const MIN = 60_000;
  const timedCreate = (control: string, showOnly?: true) => ({
    v: 1,
    type: 'create',
    ruleset: DRAFT,
    seat: 'light',
    time: { control, ...(showOnly && { showOnly }) },
  });
  /** A 3+2 (or other) room with light and dark seated; dark moves first in draft-2p. */
  async function seatedTimed(control = '3+2') {
    const h = harness();
    const created = (await (await h.create(timedCreate(control))).json()) as Snapshot;
    const light = await h.connect();
    await h.send(light, { v: 1, type: 'join', code: CODE, token: created.token });
    const dark = await h.connect();
    await h.send(dark, { v: 1, type: 'join', code: CODE });
    const darkToken = (dark.messages()[0] as Snapshot).token!;
    light.take();
    dark.take();
    return { h, light, dark, lightToken: created.token!, darkToken };
  }
  /** Fire the alarm until the game is over (an alarm with earlier work just sets the next). */
  async function untilOver(h: ReturnType<typeof harness>) {
    for (let i = 0; i < 10; i++) {
      const saved = h.state.data.get('room') as { result: { status: string } };
      if (saved.result.status !== 'ongoing') return;
      await h.fireAlarm();
    }
    throw new Error('The game did not end.');
  }
  const firstMove = () => {
    const game = newGame(loadRules(rulesFiles).rules(DRAFT.id, DRAFT.version), DRAFT);
    return toNotation(game.legal[0]!);
  };

  it('shows the time control to anyone before they take a seat', async () => {
    const h = harness();
    await h.create(timedCreate('3+2'));
    expect(await (await h.info()).json()).toMatchObject({ time: { control: '3+2' } });
    const u = harness();
    await u.create(timedCreate('5+3', true));
    expect(await (await u.info()).json()).toMatchObject({
      time: { control: '5+3', showOnly: true },
    });
    // Untimed rooms show none.
    const w = harness();
    await w.create();
    expect(await (await w.info()).json()).not.toHaveProperty('time');
  });

  it('drops the flag by its alarm with nobody connected (D66)', async () => {
    const { h, light, dark } = await seatedTimed();
    await h.drop(light);
    await h.drop(dark);
    // The alarm wakes the room for dark's flag, three minutes away (an earlier wake sets the next).
    h.restart();
    await untilOver(h);
    expect(Date.now()).toBe(START + 3 * MIN);
    const saved = h.state.data.get('room') as { result: unknown; endedAt: number };
    expect(saved.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'timeout',
    });
    expect(saved.endedAt).toBe(START + 3 * MIN);
    // Back later, the seat sees the game ended on time.
    vi.setSystemTime(START + 10 * MIN);
    h.restart();
    const back = await h.connect();
    const { tokens } = h.state.data.get('room') as { tokens: Record<string, string> };
    await h.send(back, { v: 1, type: 'join', code: CODE, token: tokens.light });
    const snap = back.messages()[0] as Snapshot;
    expect(snap.result).toMatchObject({ reason: 'timeout', winner: 'light' });
    expect(snap.time?.left).toEqual({ dark: 0, light: 3 * MIN });
  });

  it('shows a seat that reloads the right time left, through a restart', async () => {
    const { h, light, dark, lightToken } = await seatedTimed();
    vi.setSystemTime(START + 10_000);
    await h.send(dark, { v: 1, type: 'move', move: firstMove() });
    const moved = light.take().find((m) => m.type === 'move');
    expect(moved).toMatchObject({ left: { dark: 3 * MIN - 8000, light: 3 * MIN } });
    // Light reloads: its socket goes, the object restarts, and the clock keeps running.
    await h.drop(light);
    vi.setSystemTime(START + 40_000);
    h.restart();
    const again = await h.connect();
    await h.send(again, { v: 1, type: 'join', code: CODE, token: lightToken });
    const snap = again.messages()[0] as Snapshot;
    expect(snap.time).toEqual({
      control: '3+2',
      left: { dark: 3 * MIN - 8000, light: 3 * MIN - 30_000 },
      lefts: [{ dark: 3 * MIN - 8000, light: 3 * MIN }],
    });
    // The record keeps each seat's time left with the moves (D53), and nothing else new.
    const saved = h.state.data.get('room') as { time: { lefts: unknown[] } };
    expect(saved.time.lefts).toEqual([{ dark: 3 * MIN - 8000, light: 3 * MIN }]);
  });

  it('refuses a clock that a client tries to set', async () => {
    const { h, dark } = await seatedTimed();
    await h.send(dark, { v: 1, type: 'move', move: firstMove(), left: { dark: 9 * MIN } });
    expect(dark.take()).toEqual([
      expect.objectContaining({ type: 'refused', reason: 'malformed' }),
    ]);
    const saved = h.state.data.get('room') as { moves: unknown[] };
    expect(saved.moves).toEqual([]);
  });

  it('counts a player out after 5 minutes away while the other is connected', async () => {
    const { h, light, dark } = await seatedTimed('away5m');
    vi.setSystemTime(START + 1000);
    await h.drop(dark);
    expect(light.take()).toEqual([
      { v: 1, type: 'opponent', status: 'away' },
      { v: 1, type: 'away', away: { dark: 5 * MIN } },
    ]);
    h.restart();
    // Light pings to stay connected; the alarm counts dark out.
    light.pinged = new Date(START + 4 * MIN);
    await untilOver(h);
    expect(Date.now()).toBe(START + 1000 + 5 * MIN);
    expect(types(light.take())).toEqual(['out-of-time', 'game-over']);
    expect((h.state.data.get('room') as { result: unknown }).result).toMatchObject({
      winner: 'light',
      reason: 'timeout',
    });
  });

  it('keeps an untimed room as it was: no time saved', async () => {
    const h = harness();
    await h.seated();
    expect(h.state.data.get('room')).not.toHaveProperty('time');
  });
});
