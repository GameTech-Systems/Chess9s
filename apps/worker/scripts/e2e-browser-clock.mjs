// Browser check of clocks in online rooms (S66), run after `pnpm build`: starts `wrangler dev`,
// opens two Chromium contexts, makes a 3+2 room in one (the preview shows the control), joins it by
// link in the other and plays the first moves of the S17 game by clicking. The joiner reloads
// mid-game and must show the same times as the creator. Then nobody moves: the server's alarm drops
// dark's flag (decision 0017, D66) and both screens show light winning on time. Real time: about
// three minutes, the desktop and Pixel 7 rooms side by side. Needs Playwright with Chromium (not a
// dependency of this repo):
//   pnpm build && node apps/worker/scripts/e2e-browser-clock.mjs
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = fileURLToPath(new URL('../../../', import.meta.url));
const game = JSON.parse(
  readFileSync(join(root, 'packages/engine/test/fixtures/games/hot-seat-mate.json'), 'utf8'),
);
const PORT = Number(process.env.E2E_PORT ?? 8792);
const BASE = `http://127.0.0.1:${PORT}`;
const TIMEOUT = 20_000;

if (!existsSync(join(root, 'apps/web/dist/index.html'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}

const state = mkdtempSync(join(tmpdir(), 'chess9s-clock-'));
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
const stop = () => {
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {
    // Already gone.
  }
  rmSync(state, { recursive: true, force: true });
};

const check = (ok, what) => {
  if (!ok) throw new Error(what);
  console.log(`ok   ${what}`);
};

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

const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Click a move on the board of the page whose turn it is: from-square, to-square, a promotion piece. */
async function click(page, notation) {
  const [main, castle] = notation.split('/');
  const [path, promotion] = main.split('=');
  const [from, to] = path.split(/[-x]/);
  await page.locator(`[data-hit="${from}"]`).click();
  // Castling is chosen by clicking the partner piece's square.
  await page.locator(`[data-hit="${castle ? castle.split('-')[0] : to}"]`).click();
  if (promotion) await page.getByRole('button', { name: title(promotion) }).click();
}

/** With SHOTS=<directory>, save a screenshot at the main steps (to look at the screens). */
const shot = (page, name) =>
  process.env.SHOTS
    ? page.screenshot({ path: join(process.env.SHOTS, `${name}.png`), fullPage: true })
    : undefined;

async function noSidewaysScroll(page, what) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: document.documentElement.clientWidth,
  }));
  check(scroll <= width, `${what}: no sideways scroll (${scroll} <= ${width})`);
}

/** The seconds a page shows on a seat's clock ("2:58" is 178). */
async function seconds(page, side) {
  const text = await page
    .getByLabel(`${title(side)} time`)
    .first()
    .innerText();
  return text
    .trim()
    .split(':')
    .reduce((n, part) => n * 60 + Number(part), 0);
}

/** Both pages show each seat's clock within a second or two of each other. */
async function sameTimes(a, b, what) {
  for (const side of ['dark', 'light']) {
    const [x, y] = [await seconds(a, side), await seconds(b, side)];
    check(Math.abs(x - y) <= 2, `${what}: ${side}'s clock reads ${x}s and ${y}s`);
  }
}

const MOVES = 10;
const RELOAD_AT = 6;

async function play(browser, options, label) {
  const creator = await browser.newContext(options);
  const joiner = await browser.newContext(options);
  const a = await creator.newPage();
  const b = await joiner.newPage();
  for (const [name, page] of [
    ['creator', a],
    ['joiner', b],
  ]) {
    page.on('pageerror', (e) => console.error(`${label} ${name} page error:`, e.message));
    page.on('console', (m) => m.type() === 'error' && console.error(`${label} ${name}:`, m.text()));
  }

  // The creator makes a 3+2 room on the ruleset the game was recorded on.
  await a.goto(BASE);
  const card = a.locator('li.ruleset', { hasText: `${game.ruleset.id} v${game.ruleset.version}` });
  await card.getByRole('button', { name: 'Play online' }).click();
  await a.getByRole('button', { name: 'Light', exact: true }).click();
  await a.locator('select[aria-label="Time control"]').selectOption('3+2');
  await shot(a, `${label}-1-create`);
  await noSidewaysScroll(a, `${label} creator (create)`);
  await a.getByRole('button', { name: 'Create room' }).click();
  await a.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: TIMEOUT });
  await a.getByText('Waiting for an opponent to join').waitFor({ timeout: TIMEOUT });
  const link = await a.getByLabel('Room link').inputValue();

  // The joiner sees the time control before taking the seat.
  await b.goto(link);
  await b.getByText('Join a game').waitFor({ timeout: TIMEOUT });
  check(
    (await b.getByText('3+2').count()) > 0,
    `${label}: the joiner sees the time control 3+2 before taking the seat`,
  );
  await shot(b, `${label}-2-preview`);
  await b.getByRole('button', { name: 'Take the Dark seat' }).click();
  await b.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
  await a.getByText(/Waiting for Dark to move/).waitFor({ timeout: TIMEOUT });
  check(
    (await seconds(a, 'light')) === 180 && (await seconds(b, 'light')) === 180,
    `${label}: both screens show light's 3:00 while dark is to move`,
  );
  await shot(a, `${label}-3-playing`);
  await noSidewaysScroll(a, `${label} creator (playing)`);
  await noSidewaysScroll(b, `${label} joiner (playing)`);

  // Dark moves first on this board.
  let joinerPage = b;
  for (const [i, move] of game.moves.slice(0, MOVES).entries()) {
    if (i === RELOAD_AT) {
      await new Promise((r) => setTimeout(r, 3000));
      await joinerPage.reload();
      await joinerPage.waitForFunction(
        (n) => document.querySelectorAll('ol.moves span').length === n,
        RELOAD_AT,
        { timeout: TIMEOUT },
      );
      await joinerPage.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
      await sameTimes(a, joinerPage, `${label}: after the joiner reloads`);
    }
    const mover = i % 2 === 0 ? joinerPage : a;
    await click(mover, move);
    for (const page of [a, joinerPage]) {
      await page.waitForFunction(
        (n) => document.querySelectorAll('ol.moves span').length === n,
        i + 1,
        { timeout: TIMEOUT },
      );
    }
  }
  // Each move gained its 2 seconds: dark's clock is past 3:00 less the time it spent.
  await sameTimes(a, joinerPage, `${label}: after ${MOVES} moves`);

  // Dark does not move again: the server drops its flag, with both screens open.
  const flag = { timeout: 200_000 };
  await a.getByText(/Out of time · Light wins · you win/).waitFor(flag);
  await joinerPage.getByText(/Out of time · Light wins · you lose/).waitFor(flag);
  check((await seconds(a, 'dark')) === 0, `${label}: dark's clock shows 0:00`);
  check(true, `${label}: dark's flag falls on the server and both screens show light winning`);
  await shot(a, `${label}-4-flag`);
  await noSidewaysScroll(a, `${label} creator (flag)`);
  await noSidewaysScroll(joinerPage, `${label} joiner (flag)`);
  for (const c of [creator, joiner]) await c.close();
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    await Promise.all([
      play(browser, { viewport: { width: 1280, height: 900 } }, 'desktop'),
      play(browser, { ...devices['Pixel 7'] }, 'Pixel 7'),
    ]);
    console.log('browser clock check passed');
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => {
    console.error(e);
    console.error('--- wrangler dev log ---\n' + devLog.slice(-3000));
    process.exitCode = 1;
  })
  .finally(stop);
