// Fail if the built web app could not run under the strict Content-Security-Policy in
// apps/web/public/_headers (no runtime code generation, no inline script, headers under the limit),
// or would ship bundled packages without their license notices.
// Usage: node scripts/check-dist.mjs [dist-dir]   (run after `pnpm build`)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'apps/web/dist';
const problems = [];

const jsFiles = readdirSync(join(dist, 'assets')).filter((n) => n.endsWith('.js'));
for (const name of jsFiles) {
  const code = readFileSync(join(dist, 'assets', name), 'utf8');
  if (/new Function\(|\beval\(/.test(code))
    problems.push(`assets/${name}: builds code at runtime (new Function or eval)`);
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) problems.push('index.html: inline script');
if (/<style[\s>]/.test(html) || /\sstyle="/.test(html)) problems.push('index.html: inline style');

const headers = readFileSync(join(dist, '_headers'), 'utf8');
const rules = headers.split('\n').filter((l) => /^\S/.test(l) && !l.startsWith('#')).length;
if (rules > 100) problems.push(`_headers: ${rules} rules, the limit is 100`);
const csp = /Content-Security-Policy:\s*(.*)/.exec(headers)?.[1] ?? '';
if (/unsafe-(eval|inline)/.test(csp))
  problems.push('_headers: CSP allows unsafe-eval or unsafe-inline');
if (!/worker-src 'self'/.test(csp)) problems.push("_headers: CSP lacks worker-src 'self'");

// The bundles carry no license comments, so the notices of every bundled package must ship in
// this file (Vite's build.license), and React's must be among them.
const licensesFile = join(dist, 'third-party-licenses.txt');
let licenses = '';
try {
  licenses = readFileSync(licensesFile, 'utf8');
} catch {
  problems.push('third-party-licenses.txt: missing (vite build.license)');
}
for (const pkg of ['react', 'react-dom', 'scheduler']) {
  if (licenses && !new RegExp(`^## ${pkg} - `, 'm').test(licenses))
    problems.push(`third-party-licenses.txt: no notice for ${pkg}`);
}

if (problems.length > 0) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(`ok   ${jsFiles.length} scripts, ${rules} header rules`);
