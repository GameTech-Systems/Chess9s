// Browser check of offline play (S96, decision 0025), run after `pnpm build`. Serves the built app
// from a small server here (so it can switch to a second version), opens Chromium, visits once
// with the network, then goes offline (context.setOffline) and, at desktop and Pixel 7 width:
//   reloads, and plays a 2-player hot-seat game to checkmate by clicking (the recorded 80-move
//     game, with a reload at move 40 that keeps it);
//   plays a game against the computer (its Web Worker comes from the cache) until a flag falls;
//   plays a 3-player hot-seat game to a result (moves, a reload that keeps them, two resignations);
//   sees Play online, Join a room and a room page say they need a connection, and the notices
//     clear when the browser is online again.
// Then: the widths 320, 375 and 430 and a phone in landscape load offline with no sideways scroll;
// a browser that refuses service workers still plays online; cleared site data starts over; and an
// update: a second build with a changed asset waits during a game, is offered once the game ends,
// and takes over after "Reload for the new version".
// Needs Playwright with Chromium (not a dependency of this repo):
//   pnpm build && node apps/web/scripts/e2e-offline.mjs      (SHOTS=<directory> saves screenshots)
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeServiceWorker } from '../src/offline/build-sw.mjs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = fileURLToPath(new URL('../../../', import.meta.url));
const dist = join(root, 'apps/web/dist');
const PORT = Number(process.env.E2E_PORT ?? 4175);
const BASE = `http://127.0.0.1:${PORT}`;
const TIMEOUT = 20_000;

if (!existsSync(join(dist, 'sw.js'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}

const mate = JSON.parse(
  readFileSync(join(root, 'packages/engine/test/fixtures/games/hot-seat-mate.json'), 'utf8'),
);
const mateName = JSON.parse(
  readFileSync(join(root, `rules/rulesets/${mate.ruleset.id}.json`), 'utf8'),
).name;

// ---- A static server like the site's: files, the app shell for any other path, /api is down.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.xml': 'application/xml',
};
let serving = dist;
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, BASE).pathname);
  if (path.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end('{"error":"no rooms in this check"}');
  }
  let file = join(serving, normalize(path));
  if (!file.startsWith(serving) || !existsSync(file) || path.endsWith('/'))
    file = join(serving, 'index.html');
  const cache = path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': cache,
  });
  res.end(readFileSync(file));
});

const check = (ok, what) => {
  if (!ok) throw new Error(what);
  console.log(`ok   ${what}`);
};

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

const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const moveCount = (page) => page.locator('ol.moves span').count();
const played = (page, n) =>
  page.waitForFunction((k) => document.querySelectorAll('ol.moves span').length >= k, n, {
    timeout: TIMEOUT,
  });

/** Click a recorded move: from-square, to-square (castling: the partner's square), promotion. */
async function click(page, notation) {
  const [main, castle] = notation.split('/');
  const [path, promotion] = main.split('=');
  const [from, to] = path.split(/[-x]/);
  await page.locator(`[data-hit="${from}"]`).click();
  await page.locator(`[data-hit="${castle ? castle.split('-')[0] : to}"]`).click();
  if (promotion) await page.getByRole('button', { name: title(promotion) }).click();
}

/** A person's move: a pawn that has a move (another piece if none does), then its first target. */
async function anyMove(page, side) {
  const squares = await page
    .locator(`svg.board [data-piece][data-side="${side}"]`)
    .evaluateAll((els) =>
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

/** A home-page preset of a player count: its card's button. */
async function preset(page, players, name, button = 'Play') {
  await page.locator(`button.mode[data-players="${players}"]`).click();
  const card = page.locator('li.ruleset', { has: page.getByText(name, { exact: true }) });
  await card.getByRole('button', { name: button, exact: true }).click();
}

/** Waits until the service worker controls the page: the app is kept for offline use. */
async function kept(page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: TIMEOUT,
  });
}

/** A new browser context with console errors collected (a dropped request offline is expected). */
async function open(browser, options, label) {
  const context = await browser.newContext(options);
  const errors = [];
  context.on('weberror', (e) => errors.push(`${label}: ${e.error().message}`));
  context.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text()))
      errors.push(`${label}: ${m.text()}`);
  });
  const page = await context.newPage();
  return { context, page, errors };
}

async function hotSeat2(page, label, slug) {
  await page.goto(`${BASE}/rules/${mate.ruleset.id}`);
  await page.getByRole('button', { name: `Play ${mateName}`, exact: true }).click();
  await page.locator('svg.board').waitFor({ timeout: TIMEOUT });
  for (const [i, move] of mate.moves.entries()) {
    if (i === 40) {
      await page.reload();
      await page.goto(`${BASE}/rules/${mate.ruleset.id}`);
      await page.getByRole('button', { name: `Play ${mateName}`, exact: true }).click();
      await played(page, 40);
      check(
        (await moveCount(page)) === 40,
        `${label}: an offline reload at move 40 keeps the game`,
      );
    }
    await click(page, move);
    await played(page, i + 1);
  }
  const status = await page.locator('p.status').innerText();
  check(
    status === 'Checkmate · Light wins',
    `${label}: 2-player hot-seat plays to checkmate offline ("${status}")`,
  );
  await shot(page, `${slug}-2p-mate`);
}

async function computer(context, label, slug) {
  // A second tab, opened offline, with a clock the script can move.
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(BASE);
  await preset(page, 2, 'Standard');
  await page
    .getByRole('group', { name: 'Opponent' })
    .getByRole('button', { name: 'Computer' })
    .click();
  await page.locator('select[aria-label="Time control"]').selectOption('3+2');
  await anyMove(page, 'dark');
  await page.clock.runFor(2_000);
  await played(page, 2);
  check(true, `${label}: the computer answers offline (its worker came from the cache)`);
  await page.clock.runFor(4 * 60_000);
  const status = await page.locator('p.status').innerText();
  check(
    status === 'Out of time · Light wins',
    `${label}: the game against the computer plays to a result offline ("${status}")`,
  );
  await shot(page, `${slug}-computer`);
  await page.close();
}

async function hotSeat3(page, label, slug) {
  await page.goto(BASE);
  await preset(page, 3, 'Standard');
  await page.locator('ul[aria-label="Seats"]').waitFor({ timeout: TIMEOUT });
  for (const [i, side] of ['dark', 'light', 'dragon'].entries()) {
    await anyMove(page, side);
    await played(page, i + 1);
  }
  await page.reload();
  await preset(page, 3, 'Standard');
  await played(page, 3);
  check((await moveCount(page)) === 3, `${label}: an offline reload keeps the 3-player game`);
  await resignTwice(page);
  const result = page.getByRole('region', { name: 'Result' });
  await result.waitFor({ timeout: TIMEOUT });
  check(
    (await result.getByRole('heading').innerText()).length > 0,
    `${label}: 3-player hot-seat plays to a result offline ("${await result.getByRole('heading').innerText()}")`,
  );
  await shot(page, `${slug}-3p-result`);
  await noSidewaysScroll(page, `${label} (3-player result)`);
}

/** Light, then Dark resign: the Dragon is left, and the game is over. */
async function resignTwice(page) {
  const resign = page.getByRole('group', { name: 'Resign' });
  for (const seat of ['Light', 'Dark']) {
    await resign.getByRole('button', { name: `Resign as ${seat}` }).click();
    await page
      .getByRole('alertdialog', { name: 'Confirm resignation' })
      .getByRole('button', { name: 'Confirm' })
      .click();
  }
}

async function onlineOnly(context, page, label, slug) {
  const notice = page.getByText(/^You are offline\. Online rooms need a connection/);
  await page.goto(BASE);
  await page.locator(`button.mode[data-players="2"]`).click();
  check(
    (await page.getByRole('button', { name: 'Join', exact: true }).isDisabled()) &&
      (await notice.count()) === 1,
    `${label}: Join a room says it needs a connection`,
  );
  await preset(page, 2, 'Standard', 'Play online');
  check(
    (await page.getByRole('button', { name: 'Create room' }).isDisabled()) &&
      (await notice.count()) === 1,
    `${label}: Play online says it needs a connection and cannot make a room`,
  );
  await shot(page, `${slug}-play-online-offline`);
  await noSidewaysScroll(page, `${label} (Play online offline)`);
  await context.setOffline(false);
  await notice.waitFor({ state: 'detached', timeout: TIMEOUT });
  check(
    !(await page.getByRole('button', { name: 'Create room' }).isDisabled()),
    `${label}: back online, the notice clears and Create room can be pressed`,
  );
  await context.setOffline(true);
  await page.goto(`${BASE}/room/K7RX2M`);
  await notice.waitFor({ timeout: TIMEOUT });
  check(true, `${label}: a room page opens offline and says it needs a connection`);
  await shot(page, `${slug}-room-offline`);
}

async function offlineRun(browser, options, size) {
  const label = `${size} · offline`;
  const slug = size.replace(/\W+/g, '');
  const { context, page, errors } = await open(browser, options, label);
  await page.goto(BASE);
  await kept(page);
  check(true, `${label}: one visit keeps the app (the service worker controls the page)`);
  await context.setOffline(true);
  await page.reload();
  await page.locator('li.ruleset').first().waitFor({ timeout: TIMEOUT });
  check(
    await page.evaluate(() => navigator.onLine === false),
    `${label}: the home page loads with the network off`,
  );
  await shot(page, `${slug}-home-offline`);
  await noSidewaysScroll(page, `${label} (home)`);
  await hotSeat2(page, label, slug);
  await computer(context, label, slug);
  await hotSeat3(page, label, slug);
  for (const path of [
    '/how-to-play',
    '/privacy',
    '/rules/standard-3p',
    '/third-party-licenses.txt',
  ]) {
    const res = await page.goto(`${BASE}${path}`);
    check(res.ok(), `${label}: ${path} opens offline`);
  }
  await onlineOnly(context, page, label, slug);
  check(
    errors.length === 0,
    `${label}: no errors on the page${errors.length ? `\n${errors.join('\n')}` : ''}`,
  );
  await context.close();
}

/** The widths of decision 0025: each loads offline, a game opens, and nothing scrolls sideways. */
async function widths(browser) {
  const sizes = [
    ['320 px', { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }],
    ['375 px', { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true }],
    ['430 px', { viewport: { width: 430, height: 900 }, isMobile: true, hasTouch: true }],
    ['Pixel 7 landscape', devices['Pixel 7 landscape']],
  ];
  for (const [size, options] of sizes) {
    const label = `${size} · offline`;
    const { context, page, errors } = await open(browser, options, label);
    await page.goto(BASE);
    await kept(page);
    await context.setOffline(true);
    await page.reload();
    await noSidewaysScroll(page, `${label} (home)`);
    await preset(page, 2, 'Standard');
    await anyMove(page, 'dark');
    await played(page, 1);
    await noSidewaysScroll(page, `${label} (game)`);
    await page.goto(`${BASE}/privacy`);
    await noSidewaysScroll(page, `${label} (privacy)`);
    check(
      errors.length === 0,
      `${label}: no errors${errors.length ? `\n${errors.join('\n')}` : ''}`,
    );
    await context.close();
  }
}

async function noServiceWorker(browser) {
  const label = 'no service worker (as in some private windows)';
  const { context, page, errors } = await open(
    browser,
    { serviceWorkers: 'block', viewport: { width: 1280, height: 900 } },
    label,
  );
  await page.goto(BASE);
  await preset(page, 2, 'Standard');
  await anyMove(page, 'dark');
  await played(page, 1);
  check(
    (await page.evaluate(() => navigator.serviceWorker?.controller ?? null)) === null,
    `${label}: the app runs online with no worker`,
  );
  check(errors.length === 0, `${label}: no errors${errors.length ? `\n${errors.join('\n')}` : ''}`);
  await context.close();
}

async function clearedSiteData(browser) {
  const label = 'cleared site data';
  const { context, page, errors } = await open(
    browser,
    { viewport: { width: 1280, height: 900 } },
    label,
  );
  await page.goto(BASE);
  await kept(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' });
  check(
    (await page.evaluate(() => caches.keys())).length === 0,
    `${label}: clearing site data removes the copy of the app`,
  );
  await page.reload();
  await kept(page);
  await page.waitForFunction(async () => (await caches.keys()).length === 1, null, {
    timeout: TIMEOUT,
  });
  check(true, `${label}: the next visit keeps the app again`);
  check(errors.length === 0, `${label}: no errors${errors.length ? `\n${errors.join('\n')}` : ''}`);
  await context.close();
}

/** A second version: a copy of dist with a changed stylesheet, and its own sw.js. */
function secondVersion() {
  const dir = mkdtempSync(join(tmpdir(), 'chess9s-v2-'));
  cpSync(dist, dir, { recursive: true });
  const css = readdirSync(join(dir, 'assets')).find((f) => f.endsWith('.css'));
  writeFileSync(
    join(dir, 'assets', css),
    `${readFileSync(join(dir, 'assets', css), 'utf8')}\nbody{--c9-version:"v2"}\n`,
  );
  return { dir, ...writeServiceWorker(dir) };
}

async function update(browser) {
  const label = 'update';
  const v1 = readFileSync(join(dist, 'sw.js'), 'utf8').match(/const VERSION = "(\w+)"/)[1];
  const v2 = secondVersion();
  const { context, page, errors } = await open(
    browser,
    { viewport: { width: 1280, height: 900 } },
    label,
  );
  const marker = () =>
    page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--c9-version').trim());
  const notice = page.getByRole('button', { name: 'Reload for the new version' });
  try {
    await page.goto(BASE);
    await kept(page);
    await preset(page, 3, 'Standard');
    await anyMove(page, 'dark');
    await played(page, 1);

    // The site now serves version 2; the browser finds it while the game is in progress.
    serving = v2.dir;
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await page.waitForFunction(
      () =>
        navigator.serviceWorker.getRegistration().then((r) => r?.waiting?.state === 'installed'),
      null,
      { timeout: TIMEOUT },
    );
    await page.waitForTimeout(500);
    check(
      (await notice.count()) === 0 && (await marker()) === '',
      `${label}: version 2 has installed and waits; nothing is offered during the game`,
    );
    check(
      (await page.evaluate(() => caches.keys())).includes(`chess9s-${v1}`),
      `${label}: version 1 still serves the page`,
    );

    // The game ends: the update is offered, and takes over after Reload.
    await resignTwice(page);
    await notice.waitFor({ timeout: TIMEOUT });
    check(true, `${label}: once the game ends, "Reload for the new version" is offered`);
    await shot(page, 'update-offered');
    await Promise.all([page.waitForEvent('load'), notice.click()]);
    await page.waitForFunction(
      () => getComputedStyle(document.body).getPropertyValue('--c9-version').trim() === '"v2"',
      null,
      { timeout: TIMEOUT },
    );
    await page.waitForFunction(
      (name) => caches.keys().then((k) => k.length === 1 && k[0] === name),
      `chess9s-${v2.version}`,
      { timeout: TIMEOUT },
    );
    check(true, `${label}: after Reload the page runs version 2 and version 1's cache is gone`);
    check((await notice.count()) === 0, `${label}: no update is offered after taking over`);
    check(
      errors.length === 0,
      `${label}: no errors${errors.length ? `\n${errors.join('\n')}` : ''}`,
    );
  } finally {
    serving = dist;
    await context.close();
    rmSync(v2.dir, { recursive: true, force: true });
  }
}

async function main() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    for (const [size, options] of [
      ['desktop', { viewport: { width: 1280, height: 900 } }],
      ['Pixel 7', { ...devices['Pixel 7'] }],
    ]) {
      await offlineRun(browser, options, size);
    }
    await widths(browser);
    await noServiceWorker(browser);
    await clearedSiteData(browser);
    await update(browser);
    console.log('Offline browser check passed');
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
