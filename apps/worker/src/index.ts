// The Chess Nines Worker (S52, D18, D50): one Worker serves the app and the rooms, on one origin.
// Cloudflare serves the static app (apps/web/dist) for every path but /api/*, which reaches this
// script first (`run_worker_first` in wrangler.jsonc). Rooms live in the Room Durable Object, one
// per room code. Nothing is logged; Cloudflare's own request logs are all there is.
import { MAX_CLIENT_MESSAGE_BYTES, isRoomCode, newRoomCode, refused } from '@chess9s/online';
import { Room } from './room';

export { Room };

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ROOMS: {
    idFromName(name: string): DurableObjectId;
    get(id: DurableObjectId): { fetch(request: Request): Promise<Response> };
  };
}

type Random = (n: number) => Uint8Array;
const cryptoRandom: Random = (n) => crypto.getRandomValues(new Uint8Array(n));

/**
 * The app's security headers, the same as the `/*` rule in apps/web/public/_headers (a test keeps
 * them equal): `_headers` does not reach responses made here.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; worker-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const APP_ORIGIN = 'https://chess9s.com';
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

/**
 * Whether a browser page at `origin` may make rooms and open sockets: the app at chess9s.com, the
 * origin this Worker is served on (a preview's own address), or a local dev server.
 */
export function allowedOrigin(origin: string | null, own: string): boolean {
  if (origin === null) return false;
  return origin === APP_ORIGIN || origin === own || LOCAL_ORIGIN.test(origin);
}

/** Tries before giving up on drawing an unused code (31^6 codes: a clash is already rare). */
const CODE_TRIES = 5;

/** A Worker response with the security headers; the room's own responses are copied in. */
function secured(res: Response): Response {
  if (res.status === 101) return res;
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}

const problem = (status: number, error: string, message: string, headers: HeadersInit = {}) =>
  new Response(JSON.stringify({ error, message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });

/** The body as text, or null when it is larger than `max` bytes (read no further than that). */
async function readCapped(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get('Content-Length') ?? 0) > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

const stub = (env: Env, code: string) => env.ROOMS.get(env.ROOMS.idFromName(code));

/** `POST /api/rooms`: a create message in, the creator's snapshot (code, seat, token) out. */
async function createRoom(request: Request, env: Env, random: Random): Promise<Response> {
  const text = await readCapped(request, MAX_CLIENT_MESSAGE_BYTES);
  if (text === null) {
    return problem(413, 'too-large', `A message may be at most ${MAX_CLIENT_MESSAGE_BYTES} bytes.`);
  }
  try {
    JSON.parse(text);
  } catch {
    return new Response(JSON.stringify(refused('malformed', 'The message is not JSON.')), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  for (let i = 0; i < CODE_TRIES; i++) {
    const code = newRoomCode(random);
    const res = await stub(env, code).fetch(
      new Request(`https://room/create?code=${code}`, { method: 'POST', body: text }),
    );
    if (res.status !== 409) return res;
  }
  return problem(503, 'no-code', 'No free room code was found; try again.');
}

/** Route one request. `random` is for room codes (tests pass a fixed one). */
export async function handle(
  request: Request,
  env: Env,
  random: Random = cryptoRandom,
): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  const origin = request.headers.get('Origin');
  const parts = url.pathname.split('/').slice(1); // ['api', 'rooms', code?, 'socket'?]
  if (parts[1] !== 'rooms' || parts.length > 4) {
    return secured(problem(404, 'not-found', 'There is nothing here.'));
  }
  const code = parts[2];
  const socket = parts[3];
  if (code === undefined) {
    if (request.method !== 'POST') {
      return secured(problem(405, 'method', 'Use POST.', { Allow: 'POST' }));
    }
    if (!allowedOrigin(origin, url.origin)) {
      return secured(problem(403, 'origin', 'Rooms are made from the Chess Nines app.'));
    }
    return secured(await createRoom(request, env, random));
  }
  if (!isRoomCode(code) || (socket !== undefined && socket !== 'socket')) {
    return secured(problem(404, 'no-room', 'There is no room with this code.'));
  }
  if (request.method !== 'GET') {
    return secured(problem(405, 'method', 'Use GET.', { Allow: 'GET' }));
  }
  if (socket === undefined) {
    return secured(await stub(env, code).fetch(new Request('https://room/info')));
  }
  if (!allowedOrigin(origin, url.origin)) {
    return secured(problem(403, 'origin', 'Rooms are joined from the Chess Nines app.'));
  }
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return secured(
      problem(426, 'upgrade', 'This address takes a WebSocket.', { Upgrade: 'websocket' }),
    );
  }
  return secured(await stub(env, code).fetch(new Request('https://room/socket', request)));
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
};
