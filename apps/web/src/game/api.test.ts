import { describe, expect, it } from 'vitest';
import { RANDOM_SEAT, encode, type Snapshot } from '@chess9s/online/protocol';
import { createRoom, createMessage, fetchRoom, socketUrl } from './api';
import { findRuleset } from './rules';

const TOKEN = 'A'.repeat(42) + '_';
const CODE = 'K7RX2M';
const json = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

const snapshot: Snapshot = {
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'light',
  token: TOKEN,
  ruleset: { id: 'standard-2p', version: '0.1.0', name: 'Standard' },
  moves: [],
  result: { status: 'ongoing' },
  seats: { light: 'away', dark: 'open' },
  drawOffer: null,
};
const standard = findRuleset('standard-2p')!;
const custom = { id: 'mine', name: 'My rules', overrides: { 'king.range': 2 } };

describe('the create message', () => {
  it('names a bundled ruleset by id and version', () => {
    expect(createMessage(standard, RANDOM_SEAT)).toEqual({
      v: 1,
      type: 'create',
      ruleset: { id: standard.id, version: standard.version },
      seat: 'random',
    });
  });

  it('carries a custom ruleset’s name and overrides, not its local id', () => {
    const msg = createMessage({ ...standard, ...custom, custom: true }, 'dark');
    expect(msg).toEqual({
      v: 1,
      type: 'create',
      ruleset: { name: 'My rules', overrides: { 'king.range': 2 } },
      seat: 'dark',
    });
  });
});

describe('the create message with computer seats (S63)', () => {
  const standard3 = findRuleset('standard-3p')!;

  it('names the seats the computer plays, and leaves the key out when there are none', () => {
    expect(createMessage(standard3, 'dark', ['dragon'])).toEqual({
      v: 1,
      type: 'create',
      ruleset: { id: standard3.id, version: standard3.version },
      seat: 'dark',
      computer: ['dragon'],
    });
    expect('computer' in createMessage(standard3, 'dark', [])).toBe(false);
    expect('computer' in createMessage(standard3, 'dark')).toBe(false);
  });

  it('hands back the computer seats’ tokens with the creator’s snapshot', async () => {
    const snap3: Snapshot = {
      ...snapshot,
      ruleset: { id: standard3.id, version: standard3.version, name: standard3.name },
      seat: 'dark',
      seats: { dark: 'away', light: 'open', dragon: 'away' },
      computer: ['dragon'],
      computerTokens: { dragon: 'B'.repeat(43) },
    };
    const r = await createRoom(
      async () => json(201, snap3),
      createMessage(standard3, 'dark', ['dragon']),
    );
    expect(r).toEqual({ ok: true, snapshot: snap3 });
  });
});

describe('making a room', () => {
  it('posts the create message to /api/rooms and returns the creator’s snapshot', async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      seen.push({ url, ...(init && { init }) });
      return json(201, snapshot);
    };
    const r = await createRoom(fetcher, createMessage(standard, 'light'));
    expect(r).toEqual({ ok: true, snapshot });
    expect(seen[0]!.url).toBe('/api/rooms');
    expect(seen[0]!.init?.method).toBe('POST');
    expect(JSON.parse(seen[0]!.init?.body as string)).toEqual(createMessage(standard, 'light'));
  });

  it('says why when the server refuses (a bad ruleset, too many requests)', async () => {
    const refused = { v: 1, type: 'refused', reason: 'invalid-ruleset', message: 'Nope.' };
    expect(
      await createRoom(async () => json(400, refused), createMessage(standard, 'light')),
    ).toEqual({
      ok: false,
      problem: 'Nope.',
    });
    const r = await createRoom(
      async () => json(429, 'slow down'),
      createMessage(standard, 'light'),
    );
    expect(r.ok).toBe(false);
  });

  it('says so when there is no connection or the answer makes no sense', async () => {
    const offline = await createRoom(
      async () => {
        throw new TypeError('network');
      },
      createMessage(standard, 'light'),
    );
    expect(offline).toEqual({ ok: false, problem: expect.stringContaining('connect') });
    const odd = await createRoom(async () => json(201, '<html>'), createMessage(standard, 'light'));
    expect(odd.ok).toBe(false);
    // A snapshot for another seat or without a token cannot start a game.
    const noToken = await createRoom(
      async () => json(201, encode({ ...snapshot, token: undefined as never })),
      createMessage(standard, 'light'),
    );
    expect(noToken.ok).toBe(false);
  });
});

describe('looking at a room', () => {
  const info = {
    v: 1,
    code: CODE,
    ruleset: snapshot.ruleset,
    seats: { light: 'present', dark: 'open' },
    result: { status: 'ongoing' },
  };

  it('returns the room’s peek', async () => {
    const urls: string[] = [];
    const r = await fetchRoom(async (u) => (urls.push(u), json(200, info)), CODE);
    expect(r).toEqual({ ok: true, info });
    expect(urls).toEqual([`/api/rooms/${CODE}`]);
  });

  it('tells an unknown or expired room from a failure', async () => {
    expect(
      await fetchRoom(async () => json(404, { error: 'no-room', message: 'x' }), CODE),
    ).toEqual({
      ok: false,
      gone: true,
    });
    expect(await fetchRoom(async () => json(500, 'oops'), CODE)).toEqual({
      ok: false,
      gone: false,
    });
    expect(
      await fetchRoom(async () => {
        throw new TypeError('network');
      }, CODE),
    ).toEqual({ ok: false, gone: false });
    expect(await fetchRoom(async () => json(200, '{"v":2}'), CODE)).toEqual({
      ok: false,
      gone: false,
    });
  });
});

describe('the socket address', () => {
  it('uses wss on https pages and ws on http ones, on the page’s own host', () => {
    expect(socketUrl({ protocol: 'https:', host: 'chess9s.com' }, CODE)).toBe(
      `wss://chess9s.com/api/rooms/${CODE}/socket`,
    );
    expect(socketUrl({ protocol: 'http:', host: 'localhost:8787' }, CODE)).toBe(
      `ws://localhost:8787/api/rooms/${CODE}/socket`,
    );
  });
});
