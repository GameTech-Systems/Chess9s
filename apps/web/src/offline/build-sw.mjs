// Writes dist/sw.js after `vite build` (decision 0025, D89: a hand-written service worker with a
// precache list made at build time, no dependency). vite.config.ts runs it once the build has
// written every file; apps/web/scripts/e2e-offline.mjs runs it again on a changed copy of dist to
// make a second version.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** The fixed-address files the app needs besides index.html and assets/. */
const APP_FILES = [
  'favicon.ico',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'site.webmanifest',
  'third-party-licenses.txt',
];

/**
 * The paths to precache, sorted, from the built files (paths relative to dist): the shell ("/",
 * which serves index.html), every file under assets/, and the APP_FILES that exist. Not the files
 * that are not part of the app (robots.txt, sitemap.xml, share.png, _headers, .well-known/,
 * sw.js).
 */
export function precacheList(files) {
  const names = files.map((f) => f.split(sep).join('/'));
  if (!names.includes('index.html')) throw new Error('precache: dist has no index.html');
  const assets = names.filter((f) => f.startsWith('assets/'));
  if (assets.length === 0) throw new Error('precache: dist has no assets/');
  const fixed = APP_FILES.filter((f) => names.includes(f));
  return ['/', ...[...assets, ...fixed].map((f) => `/${f}`).sort()];
}

function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.push(relative(dir, p));
    }
  };
  walk(dir);
  return out;
}

const here = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

/**
 * Writes `<dist>/sw.js` and returns its version and precache list. The version is a hash of every
 * precached file's path and content, so sw.js changes (and browsers install it) when, and only
 * when, a file of the app changes.
 */
export function writeServiceWorker(dist) {
  const files = precacheList(filesUnder(dist));
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path);
    hash.update('\0');
    hash.update(readFileSync(join(dist, path === '/' ? 'index.html' : path.slice(1))));
    hash.update('\0');
  }
  const version = hash.digest('hex').slice(0, 16);
  const routes = here('./routes.js').replace(/^export /gm, '');
  const worker = here('./worker.js');
  const code = [
    '// Chess Nines service worker (decision 0025), written by apps/web/src/offline/build-sw.mjs.',
    `const VERSION = ${JSON.stringify(version)};`,
    `const PRECACHE = ${JSON.stringify(files, null, 1)};`,
    routes,
    worker,
  ].join('\n');
  if (/^\s*(import|export)\s/m.test(code)) throw new Error('sw.js must be a plain script');
  writeFileSync(join(dist, 'sw.js'), code);
  return { version, files };
}
