// Browser check of online play (S53), run after `pnpm build`: starts `wrangler dev`, opens two
// Chromium contexts, makes a room in one, joins it by link in the other and plays the S17 80-move
// game to checkmate by clicking squares. The joiner's tab is reloaded at move 40 and must resume
// on the same position. Run once on a desktop viewport and once at Pixel 7 width, where the page
// must not scroll sideways. Needs Playwright with Chromium (not a dependency of this repo):
//   pnpm build && node apps/worker/scripts/e2e-browser.mjs
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
const PORT = Number(process.env.E2E_PORT ?? 8790);
const BASE = `http://127.0.0.1:${PORT}`;
const TIMEOUT = 20_000;

if (!existsSync(join(root, 'apps/web/dist/index.html'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}

const state = mkdtempSync(join(tmpdir(), 'chess9s-browser-'));
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
const movesShown = (page) => page.locator('ol.moves span').count();

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

  // The creator makes a room on the ruleset the game was recorded on.
  await a.goto(BASE);
  const card = a.locator('li.ruleset', { hasText: `${game.ruleset.id} v${game.ruleset.version}` });
  await card.getByRole('button', { name: 'Play online' }).click();
  await a.getByRole('button', { name: 'Light', exact: true }).click();
  await a.getByRole('button', { name: 'Create room' }).click();
  await a.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: TIMEOUT });
  const code = a.url().split('/').pop();
  await a.getByText('Waiting for an opponent to join').waitFor({ timeout: TIMEOUT });
  const link = await a.getByLabel('Room link').inputValue();
  check(link === `${BASE}/room/${code}`, `${label}: the creator gets the room link ${link}`);
  check(
    (await a.getByRole('link', { name: 'Invite by email' }).getAttribute('href')).startsWith(
      'mailto:?',
    ),
    `${label}: the creator can invite by email`,
  );
  await shot(a, `${label}-1-waiting`);
  await noSidewaysScroll(a, `${label} creator (waiting)`);

  // The joiner opens the link, sees the room, and takes the other seat.
  await b.goto(link);
  await b.getByText('Join a game').waitFor({ timeout: TIMEOUT });
  check(
    (await b.getByText(game.ruleset.id).count()) > 0 &&
      (await b.getByText('You will play').count()) > 0,
    `${label}: the joiner sees the ruleset and the side before taking the seat`,
  );
  await shot(b, `${label}-2-preview`);
  await noSidewaysScroll(b, `${label} joiner (preview)`);
  await b.getByRole('button', { name: 'Take the Dark seat' }).click();
  await b.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
  await a.getByText(/Waiting for Dark to move/).waitFor({ timeout: TIMEOUT });
  check(
    (await a.getByLabel('Chess Nines board, light seat', { exact: false }).count()) > 0 &&
      (await b.locator('svg[aria-label="Chess Nines board, dark seat"]').count()) > 0,
    `${label}: each board is turned to its player's side`,
  );
  await shot(a, `${label}-3-playing`);
  await noSidewaysScroll(a, `${label} creator (playing)`);
  await noSidewaysScroll(b, `${label} joiner (playing)`);

  // Dark moves first on this board.
  let joinerPage = b;
  for (const [i, move] of game.moves.entries()) {
    if (i === 40) {
      await joinerPage.reload();
      await joinerPage.waitForFunction(
        (n) => document.querySelectorAll('ol.moves span').length === n,
        40,
        { timeout: TIMEOUT },
      );
      check(
        (await movesShown(joinerPage)) === 40 && (await movesShown(a)) === 40,
        `${label}: the joiner reloads after 40 moves and resumes on the same position`,
      );
      await joinerPage.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
      check(
        (await joinerPage.getByText('Reconnecting…').count()) === 0,
        `${label}: the reloaded tab is connected again`,
      );
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
  await a.getByText(/Checkmate · Light wins · you win/).waitFor({ timeout: TIMEOUT });
  await joinerPage.getByText(/Checkmate · Light wins · you lose/).waitFor({ timeout: TIMEOUT });
  check(true, `${label}: the ${game.moves.length}-move game ends in checkmate on both screens`);
  await shot(a, `${label}-4-finished`);
  await noSidewaysScroll(a, `${label} creator (finished)`);
  await noSidewaysScroll(joinerPage, `${label} joiner (finished)`);

  // A third visitor finds the finished room full.
  const third = await (await browser.newContext(options)).newPage();
  await third.goto(link);
  await third.getByText('This room is full').waitFor({ timeout: TIMEOUT });
  check(true, `${label}: a third visitor is told the room is full`);
  await third.goto(`${BASE}/room/ZZZZZZ`);
  await third.getByText(/no longer exists/).waitFor({ timeout: TIMEOUT });
  check(true, `${label}: an unknown room says so plainly`);
  for (const c of [creator, joiner, third.context()]) await c.close();
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    await play(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
    await play(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
    console.log('browser check passed');
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
