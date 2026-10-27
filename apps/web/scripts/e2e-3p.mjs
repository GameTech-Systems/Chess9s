// Browser check of 3-player hot-seat play (S57), run after `pnpm build`: serves the built app
// (vite preview), opens Chromium and plays three recorded games from the start by clicking
// squares, each on a desktop viewport and at Pixel 7 width, where the page must not scroll
// sideways:
//   Good Practice (draft-3p): the Dragon captures a King, then checkmates the other.
//   Good Practice (draft-3p): one Kinged player checkmates the other.
//   Easy Start (easy-3p): a Kinged player wins by checkmating the Tail.
// Then a hot-seat game against a computer Dragon (S58): two people click their moves and the
// greedy Dragon answers each round; then it is switched to the Search level (S62) and answers a
// round looking ahead; undo takes its reply back too. Desktop and Pixel 7 width.
// Then a game in which Light resigns (S67): a cancelled and a confirmed Resign, a reload, and Dark
// and the Dragon play on to the Dragon's checkmate; the saved record opens again with the
// resignation in it. Desktop and Pixel 7 width.
// Then a 3-player ruleset built from Standard (3-player) in the builder (S64): changed, played
// hot-seat with a computer Dragon, exported, loaded back and opened from its share link.
// Desktop and Pixel 7 width.
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
const resigned = read('apps/web/scripts/draft-3p-resigned.json');

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
  const level = page.getByRole('group', { name: 'Dragon computer level' });
  const pressed = (name) =>
    level.getByRole('button', { name, exact: true }).getAttribute('aria-pressed');
  check(
    (await pressed('Greedy')) === 'true' && (await pressed('Search')) === 'false',
    `${label}: the computer Dragon starts on the Greedy level, Search on offer`,
  );
  await shot(page, `${size.replace(/\W+/g, '')}-computer-dragon-1-start`);

  // Three rounds at Greedy, then one at Search, or until the game ends: the people click, the
  // Dragon answers by itself.
  let played = 0;
  let dragonMoves = 0;
  let searchMoves = 0;
  while (played < 12 && (await page.getByRole('region', { name: 'Result' }).count()) === 0) {
    if (played === 9) {
      await level.getByRole('button', { name: 'Search', exact: true }).click();
      check((await pressed('Search')) === 'true', `${label}: the Dragon is switched to Search`);
    }
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
      if (played >= 9) searchMoves++;
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
  if (played === 12) {
    check(searchMoves === 1, `${label}: the computer Dragon moved at the Search level`);
  }
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

/** Light resigns after three moves; the other two play on to the end of a recorded game. */
async function playResignation(browser, options, size) {
  const label = `${size} · Light resigns`;
  const slug = `${size.replace(/\W+/g, '')}-resign`;
  const context = await browser.newContext({ ...options, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error(`${label} page error:`, e.message));
  await page.goto(BASE);
  const card = page.locator('li.ruleset', {
    has: page.getByText('Good Practice (3-player)', { exact: true }),
  });
  await card.getByRole('button', { name: 'Play', exact: true }).click();
  await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  const moveCount = () => page.locator('ol.moves span').count();
  const played = async (n) =>
    page.waitForFunction((k) => document.querySelectorAll('ol.moves span').length === k, n, {
      timeout: TIMEOUT,
    });

  const { after } = resigned.resigns;
  for (const [i, move] of resigned.moves.slice(0, after).entries()) {
    await click(page, move);
    await played(i + 1);
  }

  // A resignation waits for its confirm step, and "Keep playing" drops it.
  const resign = page.getByRole('group', { name: 'Resign' });
  check(
    (await resign.getByRole('button').count()) === 3,
    `${label}: a Resign button for each of the three seats`,
  );
  await resign.getByRole('button', { name: 'Resign as Light' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Confirm resignation' });
  check(
    (await confirm.innerText()).startsWith('Light resigns? Its King leaves the board'),
    `${label}: the confirm step says what a resignation does`,
  );
  await shot(page, `${slug}-1-confirm`);
  await noSidewaysScroll(page, `${label} (confirm step)`);
  await confirm.getByRole('button', { name: 'Keep playing' }).click();
  check(
    (await confirm.count()) === 0 &&
      (await page.locator('[data-seat="light"]').getAttribute('data-state')) === 'active',
    `${label}: "Keep playing" leaves Light in the game`,
  );
  await resign.getByRole('button', { name: 'Resign as Light' }).click();
  await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.locator('[data-seat="light"][data-state="out"]').waitFor({ timeout: TIMEOUT });
  check(
    (await page.locator('[data-seat="light"] .seat-note').innerText()).includes('out · resigned') &&
      (await page.getByText('Light resigned.').count()) === 1 &&
      (await page.locator('.phase').innerText()).startsWith('The duel: Dark against the Dragon.') &&
      (await resign.getByRole('button').count()) === 2,
    `${label}: Light is out, the notice and the duel are shown, two Resign buttons are left`,
  );
  await shot(page, `${slug}-2-resigned`);
  await noSidewaysScroll(page, `${label} (after the resignation)`);

  // Light has no turn from now on; the board turns to Dark and the Dragon.
  const rest = resigned.moves.slice(after);
  for (const [i, move] of rest.entries()) {
    const to = await page.locator('[data-seat][data-turn="true"]').getAttribute('data-seat');
    if (to === 'light') throw new Error(`${label}: move ${after + i + 1}: Light was given a turn`);
    const board = await page.locator('svg.board').getAttribute('aria-label');
    if (!board.includes(`${to} seat`)) {
      throw new Error(
        `${label}: move ${after + i + 1}: the board shows "${board}" on ${to}'s turn`,
      );
    }
    await click(page, move);
    await played(after + i + 1);
    if (i === 1) {
      // The game is kept in the browser with the resignation in it.
      // The app opens on the picker; playing the same ruleset again resumes the saved game.
      await page.reload();
      await card.getByRole('button', { name: 'Play', exact: true }).click();
      await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
      check(
        (await page.locator('[data-seat="light"] .seat-note').innerText()).includes('resigned') &&
          (await moveCount()) === after + 2,
        `${label}: a reload keeps the game and Light's resignation`,
      );
    }
  }
  check(
    (await moveCount()) === resigned.moves.length,
    `${label}: Dark and the Dragon played on by clicking, ${rest.length} moves`,
  );

  const result = page.getByRole('region', { name: 'Result' });
  await result.waitFor({ timeout: TIMEOUT });
  const heading = await result.getByRole('heading').innerText();
  check(heading === 'The Dragon wins', `${label}: the result screen says "${heading}"`);
  check(
    (await page.getByRole('group', { name: 'Resign' }).count()) === 0,
    `${label}: no Resign buttons once the game is over`,
  );
  await shot(page, `${slug}-3-finished`);
  await noSidewaysScroll(page, `${label} (finished)`);

  // The record keeps the resignation and opens again as the same game.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save game record' }).click(),
  ]);
  const path = await download.path();
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  check(
    saved.players === 3 &&
      saved.resignations?.length === 1 &&
      saved.resignations[0].side === 'light' &&
      saved.resignations[0].after === after &&
      saved.moves.length === resigned.moves.length,
    `${label}: the record holds Light's resignation after move ${after}`,
  );
  await page.getByLabel('Game record file').setInputFiles(path);
  await page.getByRole('region', { name: 'Result' }).waitFor({ timeout: TIMEOUT });
  check(
    (await page.getByRole('region', { name: 'Result' }).getByRole('heading').innerText()) ===
      'The Dragon wins' &&
      (await page.locator('[data-seat="light"] .seat-note').innerText()).includes('out · resigned'),
    `${label}: opening the record shows the same game, Light still out`,
  );
  await context.close();
}

/** Build a 3-player ruleset, play it with a computer Dragon, export it, load it, open its link. */
async function playBuilt(browser, options, size) {
  const label = `${size} · built 3-player ruleset`;
  const context = await browser.newContext({ ...options, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error(`${label} page error:`, e.message));
  await page.goto(`${BASE}/build`);
  await page.getByRole('button', { name: '3 players', exact: true }).click();
  check(
    (await page
      .getByRole('button', { name: 'Standard (3-player)' })
      .getAttribute('aria-pressed')) === 'true',
    `${label}: Standard (3-player) is the starting preset`,
  );
  await page.getByLabel('Ruleset name').fill('Quick Dragon');
  await page.getByRole('button', { name: 'Raise Dragon Head range' }).waitFor();
  await page.getByRole('button', { name: 'Lower Dragon Head range' }).click();
  await page
    .locator('[data-setting="endings.3p"]')
    .getByRole('radio', { name: 'The first checkmate wins' })
    .click();
  check(
    (await page.locator('[data-held="dragon.3p.givesCheck"]').innerText()).includes('stays on'),
    `${label}: first-checkmate turns the Dragon's check on and says why`,
  );
  check(
    (await page.getByText('A 3-player ruleset cannot be submitted').count()) === 1 &&
      (await page.getByText('Submit for consideration').count()) === 0,
    `${label}: Submit is not offered for 3 players`,
  );
  await noSidewaysScroll(page, `${label} (builder)`);
  await shot(page, `${size.replace(/\W+/g, '')}-built-1-builder`);

  // Export, then the link.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export as file' }).click(),
  ]);
  const path = await download.path();
  const file = JSON.parse(readFileSync(path, 'utf8'));
  check(
    file.players === 3 &&
      file.overrides['endings.3p'] === 'first-checkmate' &&
      file.overrides['dragon.3p.givesCheck'] === true &&
      file.overrides['dragonHead.range'] === 7,
    `${label}: the exported file is a 3-player ruleset with the changes`,
  );
  const link = await page.getByLabel('Share link').inputValue();

  // Play it.
  await page.getByRole('button', { name: 'Save and play', exact: true }).click();
  await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  const seats = page.getByRole('group', { name: 'Computer seats' });
  await seats.getByRole('button', { name: 'Dragon', exact: true }).click();
  let played = 0;
  let dragonMoves = 0;
  while (played < 6 && (await page.getByRole('region', { name: 'Result' }).count()) === 0) {
    const to = await page.locator('[data-seat][data-turn="true"]').getAttribute('data-seat');
    if (to !== 'dragon') await anyMove(page, to);
    else dragonMoves++;
    played++;
    await page.waitForFunction(
      (n) => document.querySelectorAll('ol.moves span').length >= n,
      played,
      {
        timeout: TIMEOUT,
      },
    );
  }
  check(dragonMoves > 0, `${label}: the computer Dragon moved ${dragonMoves} times`);
  await shot(page, `${size.replace(/\W+/g, '')}-built-2-played`);

  // The saved ruleset loads back from the file, in a fresh browser.
  const fresh = await browser.newContext(options);
  const other = await fresh.newPage();
  other.on('pageerror', (e) => console.error(`${label} page error:`, e.message));
  await other.goto(`${BASE}/build`);
  await other.getByLabel('Ruleset file').setInputFiles(path);
  await other.getByRole('button', { name: '3 players', exact: true }).waitFor();
  check(
    (await other.getByLabel('Ruleset name').inputValue()) === 'Quick Dragon' &&
      (await other
        .getByRole('button', { name: '3 players', exact: true })
        .getAttribute('aria-pressed')) === 'true' &&
      (await other.locator('[data-diff="dragonHead.range"]').count()) === 1,
    `${label}: the file loads back as the same 3-player ruleset`,
  );
  const third = await fresh.newPage();
  await third.goto(link);
  check(
    (await third.getByLabel('Ruleset name').inputValue()) === 'Quick Dragon' &&
      (await third
        .getByRole('button', { name: '3 players', exact: true })
        .getAttribute('aria-pressed')) === 'true' &&
      (await third.locator('[data-diff="endings.3p"]').count()) === 1,
    `${label}: the share link opens the same 3-player ruleset`,
  );
  await fresh.close();
  await context.close();
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch();
  try {
    if (process.env.ONLY === 'build') {
      await playBuilt(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
      await playBuilt(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
      console.log('3-player browser check passed');
      return;
    }
    if (process.env.ONLY === 'resign') {
      await playResignation(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
      await playResignation(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
      console.log('3-player browser check passed');
      return;
    }
    for (const spec of process.env.ONLY === 'computer' ? [] : GAMES) {
      await play(browser, { viewport: { width: 1280, height: 900 } }, 'desktop', spec);
      await play(browser, { ...devices['Pixel 7'] }, 'Pixel 7', spec);
    }
    await playComputerDragon(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
    await playComputerDragon(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
    await playResignation(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
    await playResignation(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
    await playBuilt(browser, { viewport: { width: 1280, height: 900 } }, 'desktop');
    await playBuilt(browser, { ...devices['Pixel 7'] }, 'Pixel 7');
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
