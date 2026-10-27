// Browser check of time controls in hot-seat play (S65, decision 0017), run after `pnpm build`:
// serves the built app (vite preview), opens Chromium with a fake clock the script moves by hand,
// and plays by clicking, on a desktop viewport and at Pixel 7 width (no sideways scroll):
//   A 2-player game at 3+2: the clocks run and add the increment, Pause holds them, a reload
//     brings the game back paused, and the seat to move runs out of time: it loses.
//   A 3-player game at 30 seconds per move: a seat runs out of time and is out, the others play
//     on, the clocks survive a reload, and the last Kinged player running out loses the duel.
// Needs Playwright with Chromium (not a dependency of this repo):
//   pnpm build && node apps/web/scripts/e2e-clock.mjs      (SHOTS=<directory> saves screenshots)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = fileURLToPath(new URL('../../../', import.meta.url));
const PORT = Number(process.env.E2E_PORT ?? 4174);
const BASE = `http://127.0.0.1:${PORT}`;
const TIMEOUT = 20_000;
const T0 = 1_800_000_000_000;

if (!existsSync(join(root, 'apps/web/dist/index.html'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}

const server = spawn(
  join(root, 'apps/web/node_modules/.bin/vite'),
  ['preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: join(root, 'apps/web'), stdio: ['ignore', 'pipe', 'pipe'], detached: true },
);
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));
const stop = () => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // Already gone.
  }
};

const check = (ok, what) => {
  if (!ok) throw new Error(what);
  console.log(`ok   ${what}`);
};

async function waitForServer() {
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    if (server.exitCode !== null) throw new Error(`vite preview exited:\n${log}`);
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`vite preview did not start:\n${log}`);
}

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

/** A person's move: select a pawn that has a move (other pieces if none does), then a target. */
async function anyMove(page, side) {
  const pieces = page.locator(`svg.board [data-piece][data-side="${side}"]`);
  const squares = await pieces.evaluateAll((els) =>
    els
      .map((el) => [el.getAttribute('data-piece') === 'pawn' ? 0 : 1, el.getAttribute('data-at')])
      .sort((x, y) => x[0] - y[0])
      .map(([, at]) => at),
  );
  for (const at of squares) {
    await page.locator(`[data-hit="${at}"]`).click();
    const target = page.locator('svg.board [data-target]').first();
    if ((await target.count()) > 0) {
      await page.locator(`[data-hit="${await target.getAttribute('data-target')}"]`).click();
      return;
    }
  }
  throw new Error(`${side} has no move to click`);
}

const timeOf = (page, name) => page.locator(`[aria-label="${name} time"]`).innerText();
const moveCount = (page) => page.locator('ol.moves span').count();
const played = (page, n) =>
  page.waitForFunction((k) => document.querySelectorAll('ol.moves span').length === k, n, {
    timeout: TIMEOUT,
  });

/** A page with a fake clock, paused at T0 so only the script moves time. */
async function open(browser, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.clock.install({ time: T0 });
  await page.goto(BASE);
  await page.clock.pauseAt(T0 + 1000);
  return { context, page };
}

async function play(page, name) {
  const card = page.locator('li.ruleset', { has: page.getByText(name, { exact: true }) });
  await card.getByRole('button', { name: 'Play', exact: true }).click();
  return card;
}

async function twoPlayer(browser, options, size) {
  const label = `${size} · 2 players at 3+2`;
  const { context, page } = await open(browser, options);
  await play(page, 'Standard');
  await page.locator('select[aria-label="Time control"]').waitFor({ timeout: TIMEOUT });
  const options2 = await page.locator('select[aria-label="Time control"] option').allInnerTexts();
  check(
    options2[0] === 'Untimed' &&
      options2.includes('3+2') &&
      !options2.some((o) => /day|away/.test(o)),
    `${label}: the picker offers the hot-seat controls, untimed first`,
  );
  await page.locator('select[aria-label="Time control"]').selectOption('3+2');
  check(
    (await timeOf(page, 'Dark')) === '3:00' && (await timeOf(page, 'Light')) === '3:00',
    `${label}: each seat starts with 3:00`,
  );
  await shot(page, `${size.replace(/\W+/g, '')}-clock-2p-start`);

  // Dark moves after 10 seconds and gains 2; Light moves after 5 and gains 2.
  await page.clock.runFor(10_000);
  check((await timeOf(page, 'Dark')) === '2:50', `${label}: Dark's clock ran 10 seconds`);
  await anyMove(page, 'dark');
  await played(page, 1);
  check((await timeOf(page, 'Dark')) === '2:52', `${label}: Dark gained the 2 second increment`);
  await page.clock.runFor(5_000);
  await anyMove(page, 'light');
  await played(page, 2);
  check(
    (await timeOf(page, 'Light')) === '2:57',
    `${label}: Light's clock ran 5 seconds and gained 2`,
  );
  check(
    await page.getByRole('button', { name: 'Undo' }).isDisabled(),
    `${label}: Undo is off while a clock is on`,
  );
  check(
    (await page.locator('select[aria-label="Time control"]').count()) === 0,
    `${label}: the picker is gone once a move is played`,
  );

  // Pause holds the clock; the board does not move while it is held.
  await page.clock.runFor(4_000);
  const before = await timeOf(page, 'Dark');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.clock.runFor(60_000);
  check((await timeOf(page, 'Dark')) === before, `${label}: Pause holds the clock (${before})`);
  check(
    (await page.getByRole('button', { name: 'Resume' }).count()) === 1 &&
      (await page.getByText('Paused. Press Resume to go on.').count()) === 1,
    `${label}: Paused is shown with a Resume button`,
  );
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(2_000);
  const running = await timeOf(page, 'Dark');
  check(running !== before, `${label}: Resume runs the clock again (${before} → ${running})`);

  // A reload keeps the game and brings the clocks back paused.
  const darkAt = await timeOf(page, 'Dark');
  const lightAt = await timeOf(page, 'Light');
  await page.reload();
  await play(page, 'Standard');
  await page.locator('ul[aria-label="Clocks"]').waitFor({ timeout: TIMEOUT });
  check((await moveCount(page)) === 2, `${label}: a reload keeps the two moves`);
  check(
    (await timeOf(page, 'Dark')) === darkAt && (await timeOf(page, 'Light')) === lightAt,
    `${label}: a reload keeps the clocks (Dark ${darkAt}, Light ${lightAt})`,
  );
  check(
    (await page.getByRole('button', { name: 'Resume' }).count()) === 1,
    `${label}: the game comes back paused`,
  );
  await page.clock.runFor(30_000);
  check(
    (await timeOf(page, 'Dark')) === darkAt,
    `${label}: a paused clock stays put after a reload`,
  );
  await shot(page, `${size.replace(/\W+/g, '')}-clock-2p-paused`);
  await noSidewaysScroll(page, label);

  // Dark, to move, runs out of time and loses.
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(4 * 60_000);
  const status = await page.locator('p.status').innerText();
  check(status === 'Out of time · Light wins', `${label}: the flag falls: "${status}"`);
  check((await timeOf(page, 'Dark')) === '0:00', `${label}: the seat out of time shows 0:00`);
  check(
    (await page.getByRole('button', { name: 'Pause' }).count()) === 0,
    `${label}: no Pause once the game is over`,
  );
  await page.clock.runFor(30_000);
  check((await moveCount(page)) === 2, `${label}: no move is accepted after the flag fall`);
  await shot(page, `${size.replace(/\W+/g, '')}-clock-2p-flag`);
  await context.close();
}

async function threePlayer(browser, options, size) {
  const label = `${size} · 3 players at 30 seconds per move`;
  const { context, page } = await open(browser, options);
  await play(page, 'Standard (3-player)');
  await page.locator('select[aria-label="Time control"]').waitFor({ timeout: TIMEOUT });
  await page.locator('select[aria-label="Time control"]').selectOption('move30s');
  check(
    (await timeOf(page, 'Dark')) === '0:30' &&
      (await timeOf(page, 'Light')) === '0:30' &&
      (await timeOf(page, 'Dragon')) === '0:30',
    `${label}: each seat has 30 seconds`,
  );

  await page.clock.runFor(10_000);
  await anyMove(page, 'dark');
  await played(page, 1);
  check(
    (await timeOf(page, 'Dark')) === '0:20' && (await timeOf(page, 'Light')) === '0:30',
    `${label}: Dark keeps what it had left, Light starts again from 0:30`,
  );

  // A reload brings the clocks back paused.
  await page.clock.runFor(3_000);
  const lightAt = await timeOf(page, 'Light');
  await page.reload();
  await play(page, 'Standard (3-player)');
  await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  check(
    (await moveCount(page)) === 1 && (await timeOf(page, 'Light')) === lightAt,
    `${label}: a reload keeps the move and Light's clock (${lightAt})`,
  );
  check(
    (await page.getByRole('button', { name: 'Resume' }).count()) === 1,
    `${label}: the game comes back paused`,
  );
  await page.getByRole('button', { name: 'Resume' }).click();

  // Light runs out of time: it is out, and the Dragon, next, has the move.
  await page.clock.runFor(28_000);
  const light = page.locator('[data-seat="light"]');
  check(
    (await light.locator('.seat-note').innerText()).includes('out of time') &&
      (await page.locator('[data-seat="dragon"]').getAttribute('data-turn')) === 'true',
    `${label}: Light is out of time; the Dragon has the move`,
  );
  check(
    (await page.locator('p.notice').first().innerText()).startsWith('Light ran out of time.'),
    `${label}: the notice says Light ran out of time`,
  );
  await shot(page, `${size.replace(/\W+/g, '')}-clock-3p-out`);
  await noSidewaysScroll(page, label);

  // The Dragon moves, then Dark, the last Kinged player, runs out in the duel and loses.
  await anyMove(page, 'dragon');
  await played(page, 2);
  await page.clock.runFor(31_000);
  const result = page.getByRole('region', { name: 'Result' });
  await result.waitFor({ timeout: TIMEOUT });
  const heading = await result.getByRole('heading').innerText();
  const detail = await result.locator('p').innerText();
  check(
    heading === 'The Dragon wins' && detail === 'Dark ran out of time.',
    `${label}: the result screen says "${heading}", "${detail}"`,
  );
  await shot(page, `${size.replace(/\W+/g, '')}-clock-3p-result`);
  await context.close();
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    for (const [size, options] of [
      ['desktop', { viewport: { width: 1280, height: 900 } }],
      ['Pixel 7', { ...devices['Pixel 7'] }],
    ]) {
      await twoPlayer(browser, options, size);
      await threePlayer(browser, options, size);
    }
    console.log('Clock browser check passed');
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => {
    console.error(e);
    console.error('--- vite preview log ---\n' + log.slice(-2000));
    process.exitCode = 1;
  })
  .finally(stop);
