// The Worker's routes (S52, D50): /api/* reaches the Worker first and everything else is the
// static app. Rooms are made with a fresh code, peeked without tokens, and joined over a
// WebSocket from an allowed origin. Every response carries the app's security headers.
import { CODE_ALPHABET, type Snapshot } from '@chess9s/online';
import { describe, expect, it } from 'vitest';
import headersFile from '../../web/public/_headers?raw';
import wranglerFile from '../../../wrangler.jsonc?raw';
import { FakeRooms } from './fakes';
import * as entry from './index';
import { LIMITS, SECURITY_HEADERS, allowedOrigin, handle, type Env, type Limiter } from './index';

const APP = 'https://chess9s.com';
const CREATE = {
  v: 1,
  type: 'create',
  ruleset: { id: 'draft-2p', version: '0.2.0' },
  seat: 'random',
};

/** A stand-in for Cloudflare's rate-limiting binding: `limit` calls per key, never reset. */
class FakeLimiter implements Limiter {
  readonly seen = new Map<string, number>();
  constructor(private readonly max: number) {}
  async limit({ key }: { key: string }) {
    const n = (this.seen.get(key) ?? 0) + 1;
    this.seen.set(key, n);
    return { success: n <= this.max };
  }
}

function worker(random?: (n: number) => Uint8Array) {
  const rooms = new FakeRooms();
  const assets: string[] = [];
  const limits = {
    ROOM_LIMIT: new FakeLimiter(LIMITS.rooms),
    SOCKET_LIMIT: new FakeLimiter(LIMITS.sockets),
    INFO_LIMIT: new FakeLimiter(LIMITS.info),
  };
  const env: Env = {
    ASSETS: {
      fetch: async (request: Request) => {
        assets.push(new URL(request.url).pathname);
        return new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } });
      },
    },
    ROOMS: rooms,
    ...limits,
  };
  const call = (
    path: string,
    init: RequestInit & { origin?: string | null; ip?: string; base?: string } = {},
  ) => {
    const { origin = APP, ip = '203.0.113.7', base = APP, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (origin !== null) headers.set('Origin', origin);
    headers.set('CF-Connecting-IP', ip);
    return handle(new Request(`${base}${path}`, { ...rest, headers }), env, random);
  };
  const create = (body: unknown = CREATE, origin?: string | null) =>
    call('/api/rooms', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...(origin !== undefined && { origin }),
    });
  return { rooms, assets, call, create, env, limits };
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

  it('upgrades a socket from the app, and from a local dev server on a local Worker', async () => {
    const w = worker();
    const { code } = (await (await w.create()).json()) as Snapshot;
    const path = `/api/rooms/${code}/socket`;
    expect((await w.call(path, upgrade)).status).toBe(200); // the fake runtime's stand-in for 101
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:8787']) {
      const local = await w.call(path, { ...upgrade, origin, base: 'http://127.0.0.1:8787' });
      expect(local.status, origin).toBe(200);
      expect((await w.call(path, { ...upgrade, origin })).status, origin).toBe(403);
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
    // K7 (S95): local origins only while the Worker itself runs locally (wrangler dev).
    expect(allowedOrigin('http://localhost', APP)).toBe(false);
    expect(allowedOrigin('http://localhost:5173', preview)).toBe(false);
    expect(allowedOrigin('http://localhost:5173', 'http://localhost:8787')).toBe(true);
    expect(allowedOrigin('http://localhost:5173', 'http://127.0.0.1:8787')).toBe(true);
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

describe('per-address limits (K1, S95)', () => {
  const upgrade = { headers: { Upgrade: 'websocket' } };
  const secured = (res: Response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS))
      expect(res.headers.get(name), name).toBe(value);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  };

  it('allows 10 rooms a minute from one address, then answers a secured 429', async () => {
    const w = worker();
    for (let i = 0; i < LIMITS.rooms; i++) expect((await w.create()).status).toBe(201);
    const made = w.rooms.asked.length;
    const res = await w.create();
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(await res.json()).toMatchObject({ error: 'rate' });
    secured(res);
    expect(w.rooms.asked.length).toBe(made);
    const other = await w.call('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(CREATE),
      ip: '198.51.100.2',
    });
    expect(other.status).toBe(201);
  });

  it('limits room-info requests and socket opens per address, each on its own count', async () => {
    const w = worker();
    const { code } = (await (await w.create()).json()) as Snapshot;
    for (let i = 0; i < LIMITS.info; i++)
      expect((await w.call(`/api/rooms/${code}`, { origin: null })).status).toBe(200);
    const info = await w.call(`/api/rooms/${code}`, { origin: null });
    expect(info.status).toBe(429);
    secured(info);
    for (let i = 0; i < LIMITS.sockets; i++) {
      w.rooms.states.get(code)!.sockets.length = 0; // the room's own cap is not under test here
      expect((await w.call(`/api/rooms/${code}/socket`, upgrade)).status).toBe(200);
    }
    const socket = await w.call(`/api/rooms/${code}/socket`, upgrade);
    expect(socket.status).toBe(429);
    expect(socket.headers.get('Retry-After')).toBe('60');
    expect((await w.create()).status).toBe(201);
  });

  it('wrangler.jsonc binds the same limits, a minute each, for the site and its previews', () => {
    const bindings = [
      ...wranglerFile.matchAll(
        /"name": "(\w+)", "namespace_id": "\d+", "simple": \{ "limit": (\d+), "period": (\d+) \}/g,
      ),
    ].map((m) => `${m[1]} ${m[2]} ${m[3]}`);
    const want = [
      `ROOM_LIMIT ${LIMITS.rooms} 60`,
      `SOCKET_LIMIT ${LIMITS.sockets} 60`,
      `INFO_LIMIT ${LIMITS.info} 60`,
    ];
    expect(bindings).toEqual([...want, ...want]);
  });

  it('counts by the connecting address, and needs no limiter to run', async () => {
    const w = worker();
    await w.create();
    expect([...w.limits.ROOM_LIMIT.seen.keys()]).toEqual(['203.0.113.7']);
    const bare: Env = { ASSETS: w.env.ASSETS, ROOMS: w.env.ROOMS };
    const res = await handle(
      new Request(`${APP}/api/rooms`, {
        method: 'POST',
        body: JSON.stringify(CREATE),
        headers: { Origin: APP },
      }),
      bare,
    );
    expect(res.status).toBe(201);
  });
});

describe('errors (K5, S95)', () => {
  it('answers a secured 503 when a room throws, and leaves the app pages alone', async () => {
    const w = worker();
    const broken: Env = {
      ...w.env,
      ROOMS: {
        idFromName: (name: string) => name as unknown as DurableObjectId,
        get: () => ({
          fetch: async () => {
            throw new Error('Durable Object reset');
          },
        }),
      },
    };
    const res = await handle(
      new Request(`${APP}/api/rooms/K7RX2M`, { headers: { 'CF-Connecting-IP': '203.0.113.9' } }),
      broken,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'unavailable' });
    for (const [name, value] of Object.entries(SECURITY_HEADERS))
      expect(res.headers.get(name), name).toBe(value);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('the entry module', () => {
  it('exports only functions and objects: workerd refuses to start on any other export', () => {
    for (const [name, value] of Object.entries(entry))
      expect(['function', 'object'], name).toContain(typeof value);
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
