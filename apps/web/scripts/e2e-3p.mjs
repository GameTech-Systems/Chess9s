// Browser check of 3-player hot-seat play (S57), run after `pnpm build`: serves the built app
// (vite preview), opens Chromium and plays three recorded games from the start by clicking
// squares, each on a desktop viewport and at Pixel 7 width, where the page must not scroll
// sideways:
//   Good Practice (draft-3p): the Dragon captures a King, then checkmates the other.
//   Good Practice (draft-3p): one Kinged player checkmates the other.
//   Easy Start (easy-3p): a Kinged player wins by checkmating the Tail.
// Then a hot-seat game against a computer Dragon (S58): two people click their moves and the
// greedy Dragon answers each round; undo takes its reply back too. Desktop and Pixel 7 width.
// Needs Playwright with Chromium (not a dependency of this repo):
//   pnpm build && node apps/web/scripts/e2e-3p.mjs      (SHOTS=<directory> saves screenshots)
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const ends = read('packages/engine/test/fixtures/games/three-player-ends.json').games;
const fromEnds = (ruleset, row) => ends.find((g) => g.ruleset === ruleset && g.rows.includes(row));
const dragonMates = read('apps/web/scripts/draft-3p-dragon-mates.json');

const GAMES = [
  {
    label: 'Good Practice, the Dragon captures a King then checkmates the other',
    name: 'Good Practice (3-player)',
    game: dragonMates,
    heading: 'The Dragon wins',
    duel: true,
  },
  {
    label: 'Good Practice, one Kinged player checkmates the other',
    name: 'Good Practice (3-player)',
    game: fromEnds('draft-3p', 'kinged-checkmates-king'),
    heading: 'Dark wins',
    detail: "Dark checkmated Light's King.",
  },
  {
    label: 'Easy Start, checkmating the Tail',
    name: 'Easy Start (3-player)',
    game: fromEnds('easy-3p', 'kinged-checkmates-tail'),
    heading: 'Dark wins',
    detail: "Dark checkmated the Dragon's Tail.",
  },
];

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE = `http://127.0.0.1:${PORT}`;
const TIMEOUT = 20_000;

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

const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SEATS = ['dark', 'light', 'dragon'];

/**
 * Click a move: the from-square, the to-square (a castling move by the partner's square), then
 * each question the move asks: a promotion piece, the piece that checkmates the Tail (`#c9`), and
 * the piece a swapped pawn becomes (`#=queen`).
 */
async function click(page, notation) {
  const m =
    /^([a-i][1-9])[-x]([a-i][1-9])(?:=([a-z-]+))?(?:\/([a-i][1-9])-[a-i][1-9])?(?:#([a-i][1-9])?(?:=([a-z-]+))?)?$/.exec(
      notation,
    );
  if (!m) throw new Error(`Cannot read the move ${notation}`);
  const [, from, to, promotion, partner, mateBy, swap] = m;
  await page.locator(`[data-hit="${from}"]`).click();
  // Castling is chosen by clicking the partner piece's square.
  await page.locator(`[data-hit="${partner ?? to}"]`).click();
  if (promotion) {
    await page
      .getByRole('group', { name: 'Promote the pawn to' })
      .getByRole('button', { name: title(promotion), exact: true })
      .click();
  }
  if (mateBy) {
    await page
      .getByRole('group', { name: 'Which piece checkmates the Tail' })
      .getByRole('button', { name: new RegExp(`^${mateBy} `) })
      .click();
  }
  if (swap) {
    await page
      .getByRole('group', { name: 'The pawn becomes' })
      .getByRole('button', { name: title(swap), exact: true })
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

async function play(browser, options, size, spec) {
  const label = `${size} · ${spec.label}`;
  const context = await browser.newContext({ ...options, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error(`${label} page error:`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error(`${label}:`, m.text()));
  const slug = `${size.replace(/\W+/g, '')}-${spec.game.ruleset}-${spec.heading.replace(/\W+/g, '')}`;

  await page.goto(BASE);
  const card = page.locator('li.ruleset', { has: page.getByText(spec.name, { exact: true }) });
  await card.getByRole('button', { name: 'Play', exact: true }).click();
  await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  check(
    (await page.locator('[data-seat]').count()) === 3 &&
      (await card.count()) === 0 &&
      (await page.getByRole('button', { name: 'Computer' }).count()) === 0,
    `${label}: a 3-player hot-seat game opens with three seats`,
  );
  await shot(page, `${slug}-1-start`);
  await noSidewaysScroll(page, `${label} (start)`);

  let turnsSeen = 0;
  let sawDuel = false;
  for (const [i, move] of spec.game.moves.entries()) {
    // The board is turned to the side to move: the seat in the board's label is the one whose
    // turn the seat list marks.
    const to = await page.locator('[data-seat][data-turn="true"]').getAttribute('data-seat');
    const board = await page.locator('svg.board').getAttribute('aria-label');
    if (!board.includes(`${to} seat`)) {
      throw new Error(`${label}: move ${i + 1}: the board shows "${board}" on ${to}'s turn`);
    }
    if (i < 3)
      check(to === SEATS[i], `${label}: move ${i + 1} is ${SEATS[i]}'s, board turned to it`);
    turnsSeen++;
    await click(page, move);
    await page.waitForFunction(
      (n) => document.querySelectorAll('ol.moves span').length === n,
      i + 1,
      { timeout: TIMEOUT },
    );
    if (spec.duel && !sawDuel && (await page.locator('.phase').count()) > 0) {
      const text = await page.locator('.phase').innerText();
      sawDuel = /^The duel: \w+ against the Dragon\./.test(text);
      if (sawDuel) await shot(page, `${slug}-duel`);
    }
    if (i === Math.floor(spec.game.moves.length / 2)) {
      await shot(page, `${slug}-2-middle`);
      await noSidewaysScroll(page, `${label} (middle)`);
    }
  }
  check(
    turnsSeen === spec.game.moves.length,
    `${label}: played all ${turnsSeen} moves by clicking`,
  );

  const result = page.getByRole('region', { name: 'Result' });
  await result.waitFor({ timeout: TIMEOUT });
  const heading = await result.getByRole('heading').innerText();
  check(heading === spec.heading, `${label}: the result screen says "${heading}"`);
  if (spec.detail) {
    check(
      (await result.getByText(spec.detail).count()) === 1,
      `${label}: the result screen says "${spec.detail}"`,
    );
  }
  if (spec.duel) {
    check(sawDuel, `${label}: the panel said the duel had begun after the King was captured`);
  }
  check(
    (await page.locator('[data-seat][data-turn="true"]').count()) === 0,
    `${label}: nobody is to move once the game is over`,
  );
  await shot(page, `${slug}-3-finished`);
  await noSidewaysScroll(page, `${label} (finished)`);

  // Save game record works for a 3-player game.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save game record' }).click(),
  ]);
  const saved = JSON.parse(readFileSync(await download.path(), 'utf8'));
  check(
    saved.players === 3 &&
      saved.ruleset.id === spec.game.ruleset &&
      saved.moves.length === spec.game.moves.length &&
      saved.result.status === 'win',
    `${label}: Save game record downloads the 3-player game (${download.suggestedFilename()})`,
  );
  await context.close();
}

/**
 * A person's move, whatever the computer has done: select a pawn that has a move (other pieces
 * if none does), then one of its targets.
 */
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

/** A Good Practice game with the Dragon handed to the computer. */
async function playComputerDragon(browser, options, size) {
  const label = `${size} · computer Dragon`;
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error(`${label} page error:`, e.message));
  await page.goto(BASE);
  const card = page.locator('li.ruleset', {
    has: page.getByText('Good Practice (3-player)', { exact: true }),
  });
  await card.getByRole('button', { name: 'Play', exact: true }).click();
  await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  const seats = page.getByRole('group', { name: 'Computer seats' });
  check(
    (await seats.getByRole('button').count()) === 3 &&
      (await seats.locator('[aria-pressed="true"]').count()) === 0,
    `${label}: three seats can go to the computer, none do at first`,
  );
  await seats.getByRole('button', { name: 'Dragon', exact: true }).click();
  check(
    (await seats
      .getByRole('button', { name: 'Dragon', exact: true })
      .getAttribute('aria-pressed')) === 'true' &&
      (await page.locator('[data-seat="dragon"] .seat-bot').count()) === 1,
    `${label}: the Dragon seat is marked as the computer's`,
  );
  await shot(page, `${size.replace(/\W+/g, '')}-computer-dragon-1-start`);

  // Three rounds, or until the game ends: the people click, the Dragon answers by itself.
  let played = 0;
  let dragonMoves = 0;
  while (played < 9 && (await page.getByRole('region', { name: 'Result' }).count()) === 0) {
    const to = await page.locator('[data-seat][data-turn="true"]').getAttribute('data-seat');
    if (to !== 'dragon') {
      const board = await page.locator('svg.board').getAttribute('aria-label');
      check(
        board.includes(`${to} seat`),
        `${label}: move ${played + 1}: the board is turned to ${to}`,
      );
      await anyMove(page, to);
    } else {
      dragonMoves++;
    }
    played++;
    await page
      .waitForFunction((n) => document.querySelectorAll('ol.moves span').length >= n, played, {
        timeout: TIMEOUT,
      })
      .catch((e) => {
        throw new Error(`${label}: move ${played} (${to}) never appeared: ${e.message}`);
      });
    if (to === 'dragon') {
      // The board stays on the person who moved last while the computer thinks, and the Dragon's
      // own move never turns it.
      const board = await page.locator('svg.board').getAttribute('aria-label');
      check(
        !board.includes('dragon seat'),
        `${label}: the board did not turn to the computer Dragon`,
      );
    }
  }
  check(dragonMoves > 0, `${label}: the computer Dragon moved ${dragonMoves} times by itself`);
  await noSidewaysScroll(page, `${label} (after ${played} moves)`);
  await shot(page, `${size.replace(/\W+/g, '')}-computer-dragon-2-played`);

  if ((await page.getByRole('region', { name: 'Result' }).count()) === 0) {
    const before = await page.locator('ol.moves span').count();
    await page.getByRole('button', { name: 'Undo' }).click();
    const left = await page.locator('ol.moves span').count();
    check(
      left < before && (await page.locator('[data-seat="dragon"][data-turn="true"]').count()) === 0,
      `${label}: undo takes the computer's moves back too, to a person's turn (${before} to ${left} moves)`,
    );
  }
  await context.close();
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    for (const spec of process.env.ONLY === 'computer' ? [] : GAMES) {
      await play(browser, { viewport: { width: 1280, height: 900 } }, 'desktop', spec);
      await play(browser, { ...devices['Pixel 7'] }, 'Pixel 7', spec);
    }
    await playComputerDragon(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
    await playComputerDragon(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
    console.log('3-player browser check passed');
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
