// Browser check of 3-seat online rooms (S63), run after `pnpm build`: starts `wrangler dev` and
//   1. opens three Chromium contexts, makes a Good Practice (draft-3p) room in the first, joins it
//      by link in the other two and plays a recorded game by clicking squares: the Dragon captures
//      a King (that seat is out and skipped, and still sees the game) and then checkmates the other
//      (decision 0016). One joiner reloads mid-game and must resume on the same position.
//   2. makes a room with the computer playing the Dragon: two people join, the creator's tab is
//      reloaded (the computer seat comes back), the computer answers the first round, and then
//      both people resign, so the Dragon wins (decision 0018).
// Each at desktop width and at Pixel 7 width, where the page must not scroll sideways. Needs
// Playwright with Chromium (not a dependency of this repo):
//   pnpm build && node apps/worker/scripts/e2e-browser-3p.mjs      (SHOTS=<directory> saves screenshots)
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
  readFileSync(join(root, 'apps/web/scripts/draft-3p-dragon-mates.json'), 'utf8'),
);
const PORT = Number(process.env.E2E_PORT ?? 8791);
const BASE = `http://127.0.0.1:${PORT}`;
const TIMEOUT = 30_000;
const NAME = 'Good Practice (3-player)';

if (!existsSync(join(root, 'apps/web/dist/index.html'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}

const state = mkdtempSync(join(tmpdir(), 'chess9s-browser3-'));
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
const turnOf = (page) => page.locator('[data-seat][data-turn="true"]').getAttribute('data-seat');

/** Click a move on the board of the page whose turn it is: from-square, to-square, a promotion piece. */
async function click(page, notation) {
  const m = /^([a-i][1-9])[-x]([a-i][1-9])(?:=([a-z-]+))?(?:\/([a-i][1-9])-[a-i][1-9])?$/.exec(
    notation,
  );
  if (!m) throw new Error(`Cannot read the move ${notation}`);
  const [, from, to, promotion, partner] = m;
  await page.locator(`[data-hit="${from}"]`).click();
  await page.locator(`[data-hit="${partner ?? to}"]`).click();
  if (promotion) {
    await page
      .getByRole('group', { name: 'Promote the pawn to' })
      .getByRole('button', { name: title(promotion), exact: true })
      .click();
  }
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

const watch = (label, name, page) => {
  page.on('pageerror', (e) => console.error(`${label} ${name} page error:`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error(`${label} ${name}:`, m.text()));
};

/** The creator opens the picker, chooses Play online for Good Practice, picks Dark and creates the room. */
async function createRoom(page, label, computer) {
  await page.goto(BASE);
  const card = page.locator('li.ruleset', { has: page.getByText(NAME, { exact: true }) });
  await card.getByRole('button', { name: 'Play online' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).first().click();
  if (computer) {
    await page
      .getByRole('group', { name: 'Computer plays' })
      .getByRole('button', { name: computer, exact: true })
      .click();
  }
  await page.getByRole('button', { name: 'Create room' }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: TIMEOUT });
  return page.url();
}

async function joinRoom(page, link, seat, label) {
  await page.goto(link);
  await page.getByText('Join a game').waitFor({ timeout: TIMEOUT });
  check(
    (await page.getByText(seat, { exact: false }).count()) > 0,
    `${label}: the preview offers the ${seat} seat`,
  );
  await page.getByRole('button', { name: `Take the ${seat} seat` }).click();
}

async function threePeople(browser, options, label) {
  const names = ['creator', 'light', 'dragon'];
  const pages = [];
  for (const name of names) {
    const page = await (await browser.newContext(options)).newPage();
    watch(label, name, page);
    pages.push(page);
  }
  const [a, b, c] = pages;
  const seats = { dark: a, light: b, dragon: c };

  const link = await createRoom(a, label);
  await a.getByText('Waiting for 2 more players to join').waitFor({ timeout: TIMEOUT });
  check(
    (await a.getByText('the 2 players still to join').count()) > 0,
    `${label}: the creator is told two players are still to join`,
  );
  await shot(a, `${label}-1-waiting`);
  await noSidewaysScroll(a, `${label} creator (waiting)`);

  await joinRoom(b, link, 'Light', label);
  await a.getByText('Waiting for 1 more player to join').waitFor({ timeout: TIMEOUT });
  await shot(b, `${label}-2-light-joined`);
  await joinRoom(c, link, 'Dragon', label);
  for (const page of pages)
    await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  await a.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
  check(
    (await b.getByText('Waiting for Dark to move').count()) > 0,
    `${label}: the joiners wait for Dark; the creator has the move`,
  );
  check(
    (await a.getByRole('button', { name: /draw/i }).count()) === 0,
    `${label}: no draw offer in a 3-seat room`,
  );
  for (const [seat, page] of Object.entries(seats)) {
    check(
      (await page.locator(`svg[aria-label^="Chess Nines board, ${seat} seat"]`).count()) > 0,
      `${label}: the ${seat} board is turned to its player`,
    );
    await noSidewaysScroll(page, `${label} ${seat} (playing)`);
  }
  await shot(c, `${label}-3-playing`);

  // A fourth visitor finds the room full.
  const fourth = await (await browser.newContext(options)).newPage();
  await fourth.goto(link);
  await fourth.getByText('This room is full').waitFor({ timeout: TIMEOUT });
  check(true, `${label}: a fourth visitor is told the room is full`);
  await fourth.context().close();

  const half = Math.floor(game.moves.length / 2);
  let outSeen = false;
  let lightPage = b;
  for (const [i, move] of game.moves.entries()) {
    if (i === half) {
      await lightPage.reload();
      await lightPage.waitForFunction(
        (n) => document.querySelectorAll('ol.moves span').length === n,
        half,
        { timeout: TIMEOUT },
      );
      await lightPage.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
      check(
        (await movesShown(lightPage)) === half && (await movesShown(a)) === half,
        `${label}: the Light player reloads after ${half} moves and resumes on the same position`,
      );
      await shot(lightPage, `${label}-4-reloaded`);
    }
    // Whoever the seat list says is to move makes the next move: a seat that is out is skipped.
    const side = await turnOf(a);
    await click(seats[side], move);
    for (const [seat, page] of Object.entries(seats)) {
      await page
        .waitForFunction((n) => document.querySelectorAll('ol.moves span').length === n, i + 1, {
          timeout: TIMEOUT,
        })
        .catch(async (e) => {
          const notice = await page.locator('.banner, [role="alert"]').allInnerTexts();
          throw new Error(
            `${label}: move ${i + 1} (${move}) by ${side}: the ${seat} page shows ` +
              `${await movesShown(page)} moves; notices: ${JSON.stringify(notice)}; ${e.message}`,
          );
        });
    }
    if (!outSeen && (await a.locator('[data-state="out"]').count()) > 0) {
      outSeen = true;
      const out = await a.locator('[data-state="out"]').first().getAttribute('data-seat');
      const outPage = seats[out];
      await outPage.getByText('You are out of this game').waitFor({ timeout: TIMEOUT });
      check(
        (await outPage.getByRole('button', { name: 'Resign' }).count()) === 0,
        `${label}: the ${out} seat is out after move ${i + 1}, sees the game, and cannot resign`,
      );
      await shot(outPage, `${label}-5-out`);
      await noSidewaysScroll(outPage, `${label} ${out} (out)`);
    }
  }
  check(outSeen, `${label}: a seat went out (a King was captured) and play went on without it`);
  for (const page of pages) {
    await page
      .locator('section[aria-label="Result"]')
      .getByText('The Dragon wins')
      .waitFor({ timeout: TIMEOUT });
  }
  check(
    true,
    `${label}: the ${game.moves.length}-move game ends with the Dragon's win on all three screens`,
  );
  check(
    (await c.locator('section[aria-label="Result"]').innerText()).includes('checkmated'),
    `${label}: the result card says how: ${(await c.locator('section[aria-label="Result"] p').innerText()).trim()}`,
  );
  await shot(a, `${label}-6-finished`);
  for (const [seat, page] of Object.entries(seats)) {
    await noSidewaysScroll(page, `${label} ${seat} (finished)`);
  }
  for (const page of pages) await page.context().close();
}

async function withComputer(browser, options, label) {
  const a = await (await browser.newContext(options)).newPage();
  const b = await (await browser.newContext(options)).newPage();
  watch(label, 'creator', a);
  watch(label, 'light', b);

  const link = await createRoom(a, label, 'Dragon');
  await a.getByText('Waiting for 1 more player to join').waitFor({ timeout: TIMEOUT });
  await joinRoom(b, link, 'Light', label);
  for (const page of [a, b])
    await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  for (const [name, page] of [
    ['creator', a],
    ['light', b],
  ]) {
    check(
      (await page.locator('.seat-bot').count()) === 1 &&
        (await page.locator('[data-seat="dragon"] .seat-bot').count()) === 1,
      `${label}: the ${name}'s screen marks the Dragon as the computer`,
    );
  }
  await a.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
  await shot(a, `${label}-1-computer-dragon`);

  await click(a, game.moves[0]);
  for (const page of [a, b]) {
    await page.waitForFunction(
      () => document.querySelectorAll('ol.moves span').length === 1,
      null,
      {
        timeout: TIMEOUT,
      },
    );
  }
  // The creator's tab is reloaded: it takes its seat back, and plays the computer's seat again.
  await a.reload();
  await a.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  await b.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
  check(
    (await movesShown(a)) === 1 &&
      (await a.locator('[data-seat="dragon"] .seat-bot').count()) === 1,
    `${label}: the creator reloads and is back in the room with the computer's seat`,
  );
  await click(b, game.moves[1]);
  // The computer answers by itself, from the creator's browser.
  for (const page of [a, b]) {
    await page.waitForFunction(
      () => document.querySelectorAll('ol.moves span').length === 3,
      null,
      {
        timeout: TIMEOUT,
      },
    );
  }
  await a.getByText(/Your move/).waitFor({ timeout: TIMEOUT });
  check(
    (await turnOf(b)) === 'dark',
    `${label}: the computer Dragon played the third move and the turn is Dark's`,
  );
  await shot(b, `${label}-2-computer-moved`);
  await noSidewaysScroll(a, `${label} creator (computer moved)`);
  await noSidewaysScroll(b, `${label} light (computer moved)`);

  // Light resigns (after a look at what it does), then Dark: the Dragon wins.
  await b.getByRole('button', { name: 'Resign', exact: true }).click();
  const prompt = await b.locator('.conduct .facts').innerText();
  check(
    /Light resigns\?/.test(prompt) && /play on/.test(prompt),
    `${label}: Resign says what it does: ${prompt}`,
  );
  await shot(b, `${label}-3-resign-prompt`);
  await b.getByRole('button', { name: 'Yes, resign' }).click();
  await a.locator('[data-seat="light"][data-state="out"]').waitFor({ timeout: TIMEOUT });
  await b.getByText('You are out of this game').waitFor({ timeout: TIMEOUT });
  check(true, `${label}: Light resigned; both screens show it out, and the game goes on`);
  await a.getByRole('button', { name: 'Resign', exact: true }).click();
  await a.getByRole('button', { name: 'Yes, resign' }).click();
  for (const page of [a, b]) {
    await page
      .locator('section[aria-label="Result"]')
      .getByText('The Dragon wins')
      .waitFor({ timeout: TIMEOUT });
  }
  check(true, `${label}: Dark resigned in the duel and the computer Dragon won`);
  await shot(a, `${label}-4-finished`);
  await noSidewaysScroll(a, `${label} creator (finished)`);
  await a.context().close();
  await b.context().close();
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    const sizes = [
      ['desktop', { viewport: { width: 1280, height: 900 } }],
      ['Pixel 7', { ...devices['Pixel 7'] }],
    ];
    for (const [name, options] of sizes) {
      await threePeople(browser, options, `${name} · three people`);
      await withComputer(browser, options, `${name} · computer Dragon`);
    }
    console.log('3-seat browser check passed');
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
