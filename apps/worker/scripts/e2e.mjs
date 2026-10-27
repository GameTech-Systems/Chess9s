// End-to-end check of the Worker (S52), run after `pnpm build`: starts `wrangler dev` on the
// repo's wrangler.jsonc, then two Node 22 WebSocket clients (built in, no dependency) play the
// S17 80-move game through a room. One drops mid-game and comes back with its seat token; the
// result must match the game's. Also checks the static app, the SPA fallback, the room peek and
// the Origin check. Usage: pnpm worker:e2e
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const game = JSON.parse(
  readFileSync(join(root, 'packages/engine/test/fixtures/games/hot-seat-mate.json'), 'utf8'),
);
const PORT = Number(process.env.E2E_PORT ?? 8789);
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = 'https://chess9s.com';
const TIMEOUT = 15_000;

if (!existsSync(join(root, 'apps/web/dist/index.html'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}

const state = mkdtempSync(join(tmpdir(), 'chess9s-e2e-'));
const dev = spawn(
  join(root, 'node_modules/.bin/wrangler'),
  ['dev', '--ip', '127.0.0.1', '--port', String(PORT), '--persist-to', state],
  {
    cwd: root,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  },
);
let devLog = '';
dev.stdout.on('data', (d) => (devLog += d));
dev.stderr.on('data', (d) => (devLog += d));

function stop() {
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {
    // Already gone.
  }
  rmSync(state, { recursive: true, force: true });
}

function check(ok, what) {
  if (!ok) throw new Error(what);
  console.log(`ok   ${what}`);
}

async function waitForServer() {
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    if (dev.exitCode !== null) throw new Error(`wrangler dev exited:\n${devLog}`);
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler dev did not start:\n${devLog}`);
}

/** A WebSocket client that queues the server's messages. */
class Client {
  constructor(name, code, origin = ORIGIN) {
    this.name = name;
    this.queue = [];
    this.waiters = [];
    this.ws = new WebSocket(`${BASE.replace('http', 'ws')}/api/rooms/${code}/socket`, {
      headers: { Origin: origin },
    });
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', () => reject(new Error(`${name}: the socket failed`)));
    });
    this.closed = new Promise((resolve) => this.ws.addEventListener('close', resolve));
    this.ws.addEventListener('message', (e) => {
      this.queue.push(JSON.parse(e.data));
      this.flush();
    });
  }
  flush() {
    for (const w of [...this.waiters]) {
      const i = this.queue.findIndex(w.match);
      if (i < 0) continue;
      const [msg] = this.queue.splice(i, 1);
      this.waiters.splice(this.waiters.indexOf(w), 1);
      clearTimeout(w.timer);
      w.resolve(msg);
    }
  }
  /** The next message that matches, skipping (and dropping) earlier ones of other types. */
  next(type, extra = () => true) {
    return new Promise((resolve, reject) => {
      const w = {
        match: (m) => m.type === type && extra(m),
        resolve,
        timer: setTimeout(
          () => reject(new Error(`${this.name}: no ${type} (have ${JSON.stringify(this.queue)})`)),
          TIMEOUT,
        ),
      };
      this.waiters.push(w);
      this.flush();
    });
  }
  send(msg) {
    this.ws.send(JSON.stringify(msg));
  }
}

async function main() {
  await waitForServer();

  const page = await fetch(BASE);
  check(page.ok && (await page.text()).includes('<div id="root">'), 'GET / serves the static app');
  const deep = await fetch(`${BASE}/some/page`);
  check(
    deep.ok && (await deep.text()).includes('<div id="root">'),
    'an unknown path falls back to the app',
  );

  const made = await fetch(`${BASE}/api/rooms`, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ v: 1, type: 'create', ruleset: game.ruleset, seat: 'light' }),
  });
  const created = await made.json();
  check(
    made.status === 201 && created.token && created.seat === 'light',
    'POST /api/rooms makes a room',
  );
  check(
    /connect-src 'self'/.test(made.headers.get('Content-Security-Policy') ?? ''),
    'Worker responses carry the security headers',
  );
  const { code } = created;

  const peek = await fetch(`${BASE}/api/rooms/${code}`);
  const info = await peek.json();
  check(
    peek.ok &&
      info.ruleset.id === game.ruleset.id &&
      info.seats.dark === 'open' &&
      !('token' in info),
    'GET /api/rooms/<code> shows the ruleset and the open seat, no token',
  );

  const stranger = new Client('stranger', code, 'https://example.com');
  const refusedOrigin = await stranger.opened.then(
    () => false,
    () => true,
  );
  check(refusedOrigin, 'a socket from another origin is refused');

  const light = new Client('light', code);
  await light.opened;
  light.send({ v: 1, type: 'join', code, token: created.token });
  await light.next('snapshot');
  let dark = new Client('dark', code);
  await dark.opened;
  dark.send({ v: 1, type: 'join', code });
  const darkToken = (await dark.next('snapshot')).token;
  check(Boolean(darkToken), 'both seats are taken over WebSockets');

  // Dark moves first on this board.
  for (const [i, move] of game.moves.entries()) {
    if (i === 40) {
      dark.ws.close();
      await dark.closed;
      await light.next('opponent', (m) => m.status === 'away');
      dark = new Client('dark again', code);
      await dark.opened;
      dark.send({ v: 1, type: 'join', code, token: darkToken });
      const snap = await dark.next('snapshot');
      check(
        JSON.stringify(snap.moves) === JSON.stringify(game.moves.slice(0, 40)) &&
          snap.seat === 'dark',
        'dark drops after 40 moves and takes its seat back with its token',
      );
      await light.next('opponent', (m) => m.status === 'present');
    }
    const mover = i % 2 === 0 ? dark : light;
    mover.send({ v: 1, type: 'move', move });
    for (const c of [light, dark]) await c.next('move', (m) => m.move === move);
  }
  const over = await Promise.all([light.next('game-over'), dark.next('game-over')]);
  check(
    over.every((m) => JSON.stringify(m.result) === JSON.stringify(game.result)),
    `the ${game.moves.length}-move game ends as recorded (${game.result.reason})`,
  );
  const after = await (await fetch(`${BASE}/api/rooms/${code}`)).json();
  check(JSON.stringify(after.result) === JSON.stringify(game.result), 'the room keeps the result');
  light.ws.close();
  dark.ws.close();
}

main().then(
  () => {
    stop();
    console.log('e2e: all checks passed');
    process.exit(0);
  },
  (e) => {
    console.error(`e2e failed: ${e.message}`);
    stop();
    process.exit(1);
  },
);
