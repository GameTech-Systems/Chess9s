// The Worker's routes (S52, D50): /api/* reaches the Worker first and everything else is the
// static app. Rooms are made with a fresh code, peeked without tokens, and joined over a
// WebSocket from an allowed origin. Every response carries the app's security headers.
import { CODE_ALPHABET, type Snapshot } from '@chess9s/online';
import { describe, expect, it } from 'vitest';
import headersFile from '../../web/public/_headers?raw';
import { FakeRooms } from './fakes';
import { SECURITY_HEADERS, allowedOrigin, handle, type Env } from './index';

const APP = 'https://chess9s.com';
const CREATE = {
  v: 1,
  type: 'create',
  ruleset: { id: 'draft-2p', version: '0.2.0' },
  seat: 'random',
};

function worker(random?: (n: number) => Uint8Array) {
  const rooms = new FakeRooms();
  const assets: string[] = [];
  const env: Env = {
    ASSETS: {
      fetch: async (request: Request) => {
        assets.push(new URL(request.url).pathname);
        return new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } });
      },
    },
    ROOMS: rooms,
  };
  const call = (path: string, init: RequestInit & { origin?: string | null } = {}) => {
    const { origin = APP, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (origin !== null) headers.set('Origin', origin);
    return handle(new Request(`${APP}${path}`, { ...rest, headers }), env, random);
  };
  const create = (body: unknown = CREATE, origin?: string | null) =>
    call('/api/rooms', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...(origin !== undefined && { origin }),
    });
  return { rooms, assets, call, create };
}

/** Bytes from a list, so the codes the Worker draws are known. */
const bytes = (...values: number[]) => {
  const queue = [...values];
  return (n: number) => Uint8Array.from({ length: n }, () => queue.shift() ?? 0);
};
const codeOf = (byte: number) => CODE_ALPHABET[byte]!.repeat(6);

describe('rooms over HTTP', () => {
  it('creates a room with a fresh code and gives back the creator seat and token', async () => {
    const w = worker();
    const res = await w.create();
    expect(res.status).toBe(201);
    const snap = (await res.json()) as Snapshot;
    expect(snap.code).toMatch(new RegExp(`^[${CODE_ALPHABET}]{6}$`));
    expect(['light', 'dark']).toContain(snap.seat);
    expect(snap.token).toBeDefined();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('draws another code when the first is taken', async () => {
    const w = worker(bytes(...Array(6).fill(0), ...Array(6).fill(0), ...Array(6).fill(1)));
    expect(((await (await w.create()).json()) as Snapshot).code).toBe(codeOf(0));
    expect(((await (await w.create()).json()) as Snapshot).code).toBe(codeOf(1));
    expect(w.rooms.asked).toEqual([codeOf(0), codeOf(0), codeOf(1)]);
  });

  it('refuses a create from another site, an oversized body and a bad message', async () => {
    const w = worker();
    expect((await w.create(CREATE, 'https://example.com')).status).toBe(403);
    expect((await w.create(CREATE, null)).status).toBe(403);
    expect((await w.create('x'.repeat(30_000))).status).toBe(413);
    const bad = await w.create('{"v":1');
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ type: 'refused', reason: 'malformed' });
    expect(w.rooms.asked).toEqual([]);
  });

  it('shows a room without its tokens, and 404 for a code that is not one', async () => {
    const w = worker();
    const snap = (await (await w.create()).json()) as Snapshot;
    const res = await w.call(`/api/rooms/${snap.code}`, { origin: null });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(JSON.parse(body)).toMatchObject({ code: snap.code, ruleset: { id: 'draft-2p' } });
    expect(body).not.toContain(snap.token!);
    const asked = w.rooms.asked.length;
    for (const path of ['/api/rooms/k7rx2m', '/api/rooms/K7RX0M', '/api/rooms/K7RX2M/x'])
      expect((await w.call(path)).status, path).toBe(404);
    expect(w.rooms.asked.length).toBe(asked);
    expect((await w.call('/api/rooms/K7RX2M')).status).toBe(404);
  });

  it('answers 405 for a method a route does not take, and 404 for an unknown API path', async () => {
    const w = worker();
    const get = await w.call('/api/rooms');
    expect(get.status).toBe(405);
    expect(get.headers.get('Allow')).toBe('POST');
    expect((await w.call('/api/rooms/K7RX2M', { method: 'DELETE' })).status).toBe(405);
    expect((await w.call('/api/nothing')).status).toBe(404);
  });
});

describe('room sockets', () => {
  const upgrade = { headers: { Upgrade: 'websocket' } };

  it('upgrades a socket from the app, a preview of it or a local dev server', async () => {
    const w = worker();
    const { code } = (await (await w.create()).json()) as Snapshot;
    for (const origin of [APP, 'http://localhost:5173', 'http://127.0.0.1:8787']) {
      const res = await w.call(`/api/rooms/${code}/socket`, { ...upgrade, origin });
      expect(res.status, origin).toBe(200); // the fake runtime's stand-in for 101
    }
  });

  it('refuses a socket from another origin, without an upgrade, or to no room', async () => {
    const w = worker();
    const { code } = (await (await w.create()).json()) as Snapshot;
    const path = `/api/rooms/${code}/socket`;
    expect((await w.call(path, { ...upgrade, origin: 'https://evil.example' })).status).toBe(403);
    expect((await w.call(path, { ...upgrade, origin: null })).status).toBe(403);
    expect((await w.call(path)).status).toBe(426);
    expect((await w.call('/api/rooms/K7RX2M/socket', upgrade)).status).toBe(404);
  });

  it('allows the origins of the app, its previews and local development only', () => {
    expect(allowedOrigin(APP, APP)).toBe(true);
    const preview = 'https://s52-rooms-chess9s.example.workers.dev';
    expect(allowedOrigin(preview, preview)).toBe(true);
    expect(allowedOrigin(preview, APP)).toBe(false);
    expect(allowedOrigin('http://localhost', APP)).toBe(true);
    for (const bad of [
      null,
      'null',
      'http://chess9s.com',
      'https://chess9s.com.example.com',
      'https://evil.chess9s.com',
      'http://localhost.example.com',
      'http://localhost:5173/',
    ])
      expect(allowedOrigin(bad, APP), String(bad)).toBe(false);
  });
});

describe('the static app and headers', () => {
  it('leaves every other path to the static assets', async () => {
    const w = worker();
    expect((await w.call('/play/K7RX2M')).status).toBe(200);
    expect(w.assets).toEqual(['/play/K7RX2M']);
  });

  it("sets the same security headers as _headers, which allows connect-src 'self'", async () => {
    const block = headersFile.split(/\n\s*\n/).find((b) => /^\/\*$/m.test(b))!;
    const fromFile = Object.fromEntries(
      block
        .split('\n')
        .filter((l) => /^\s+\S/.test(l))
        .map((l) => {
          const i = l.indexOf(':');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
    expect(SECURITY_HEADERS).toEqual(fromFile);
    expect(fromFile['Content-Security-Policy']).toContain("connect-src 'self'");
    const w = worker();
    for (const res of [
      await w.create(),
      await w.call('/api/nothing'),
      await w.call('/api/rooms'),
    ]) {
      for (const [name, value] of Object.entries(SECURITY_HEADERS))
        expect(res.headers.get(name), name).toBe(value);
    }
  });
});
