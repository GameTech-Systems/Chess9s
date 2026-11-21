// Press screenshots (S97), made from the built app: the 2-player board, the 3-player board, the
// how-to-play page and the ruleset builder, at desktop and Pixel 7 width. No art is made here; the
// pictures are the app as it renders. Run after `pnpm build` (needs Playwright, not a dependency):
//   node apps/web/scripts/press-shots.mjs      (writes docs/launch/screenshots/)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const dist = join(root, 'apps/web/dist');
const out = join(root, 'docs/launch/screenshots');
const PORT = Number(process.env.E2E_PORT ?? 4176);
const BASE = `http://127.0.0.1:${PORT}`;
if (!existsSync(join(dist, 'index.html'))) {
  console.error('Build the app first (pnpm build).');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, BASE).pathname);
  let file = normalize(join(dist, path));
  if (!file.startsWith(dist) || !existsSync(file) || path === '/') file = join(dist, 'index.html');
  try {
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch();
const views = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  phone: { ...devices['Pixel 7'] },
};
for (const [name, opts] of Object.entries(views)) {
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const shot = async (path, file, action) => {
    await page.goto(BASE + path);
    await page.waitForSelector('main');
    if (action) await action(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${file}-${name}.png`) });
  };
  await shot('/', 'home');
  await shot('/', 'two-player', async (p) => {
    await p.getByRole('button', { name: 'Play', exact: true }).first().click();
  });
  await shot('/', 'three-player', async (p) => {
    await p
      .getByRole('button', { name: /3 players/i })
      .first()
      .click();
    await p.getByRole('button', { name: 'Play', exact: true }).first().click();
  });
  await shot('/how-to-play', 'how-to-play');
  await shot('/build', 'builder');
  await ctx.close();
}
await browser.close();
server.close();
console.log('Saved to', out);
