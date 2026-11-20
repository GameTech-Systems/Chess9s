# Outside audit: product and offline readiness

Model: NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b`) through NVIDIA's API, 20 Nov 2026, S33. It read 18 files (listed in SUMMARY.md) and the facts in the prompt. Kept as it answered, unedited; Claude's verification of each finding is in SUMMARY.md. Some findings are about files it was not shown and are wrong (see SUMMARY.md).



## Routing & Page Structure

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **medium** | `apps/web/src/App.tsx:112` (`pageOf`) | Unknown paths fall back to `'game'` (home). A typo like `/rulez/standard-2p` silently shows the picker instead of 404. | Add a catch-all 404 page component; make `pageOf` return `'not-found'` for unrecognized patterns and render a friendly page with "Back to the game" link. |
| **low** | `apps/web/src/App.tsx:138` (`canonicalOf`) | Room pages and builder return home canonical (`/`). Correct for SEO (not indexable), but `link[rel=canonical]` still points to `/` on those pages. | Keep as-is; it's correct. No action needed. |
| **low** | `apps/web/src/App.tsx:200` (`screen` key) | Scroll-to-top triggers on every state change (ruleset, room, record). Owner requested this (3 Nov 2026). | Verified intentional. No action needed. |

## First-Visit Flow

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **high** | `apps/web/src/App.tsx` + `RulePicker` (not shown) | No onboarding, no "first visit" hint. A new user sees a ruleset picker with 6+ options and "Change ruleset" before understanding the game. | Add a one-time localStorage flag `seenWelcome`. On first load, show a dismissible banner: "Welcome to Chess Nines — pick a ruleset to start" with a link to `/how-to-play`. |
| **medium** | `apps/web/src/App.tsx:173` (`subtitle`) | Home page subtitle says "Play in your browser · no account needed" but doesn't mention computer opponent or hot-seat explicitly. | Change to: "Play against the computer or a friend · no account needed". |
| **low** | `apps/web/src/links.ts:18` (`CONTACT_ADDRESS`) | Empty string; privacy page (not shown) likely falls back to Discussions link. | Fill in a project email (e.g., `hello@chess9s.com`) before launch; update privacy page to use it. |

## Metadata / SEO

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **high** | `apps/web/public/sitemap.xml` | Lists `/rules/standard-2p`, `/rules/easy-2p`, `/rules/draft-2p`, `/rules/heavy-h3-3p`, `/rules/easy-3p`, `/rules/draft-3p`. **Verify these IDs exist in `rules/rulesets/`** — if any are missing, Google will crawl 404s. | Run `ls rules/rulesets/` and diff against sitemap. Remove or add entries to match exactly. |
| **medium** | `apps/web/index.html:14` | `<link rel="icon" type="image/svg+xml" href="../../assets/brand/favicon.svg" />` — path goes up two levels from `apps/web/public/` but Vite serves from `public/`. This 404s in production. | Change to `/favicon.svg` and place `favicon.svg` in `apps/web/public/` (or keep in assets and use `/assets/brand/favicon.svg` with correct _headers rule). |
| **medium** | `apps/web/public/site.webmanifest:11-12` | Icons `/icon-192.png` and `/icon-512.png` referenced but **not confirmed to exist in `apps/web/public/`**. _headers caches them for 1 day. | Add both PNGs to `apps/web/public/` (generate from SVG). Verify `pnpm build` copies them to `dist/`. |
| **low** | `apps/web/index.html:31` | `<meta property="og:image" content="https://chess9s.com/share.png" />` — 219 KB PNG. Large for social previews; consider a 1200×630 WebP <100 KB. | Optimize `share.png` (or add `og:image:webp` if supported) to <100 KB. |
| **low** | `apps/web/public/robots.txt:4` | `Disallow: /room/` — correct (rooms are private). But `/api/` is also disallowed; Worker serves `/api/*` for room creation. No issue. | Verified correct. No action needed. |

## PWA Installability

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **blocker** | **Missing entirely** | **No service worker registered.** `site.webmanifest` declares `display: standalone` but without a SW the app won't work offline and won't pass PWA install criteria (Chrome requires SW + fetch handler). | Implement a hand-written service worker (see Offline Plan below). Register it in `main.tsx` after root render. |
| **high** | `apps/web/public/site.webmanifest` | No `shortcuts` for quick actions (e.g., "New game", "Play computer"). | Add shortcuts array: `[{name: "New game", url: "/", icons: [...]}, {name: "Play computer", url: "/?mode=computer", ...}]`. |
| **medium** | `apps/web/index.html:15` | `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` — file not confirmed in `public/`. | Add 180×180 PNG to `public/`. |
| **low** | `apps/web/public/_headers:22-24` | Icons and manifest cached 1 day (`max-age=86400`). For PWA, manifest should update faster when SW changes. | Keep 1 day; SW will handle its own updates. No action needed. |

## Accessibility (App Shell)

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **high** | `apps/web/src/Game.tsx:340` (`<Board ... onSquareClick=...>`) | **Board component not shown.** If it renders `<svg>` or `<canvas>` without keyboard support, the game is not keyboard-playable. | Verify `Board.tsx` implements: `tabIndex=0`, arrow-key navigation between squares, `Enter`/`Space` to select/move, `aria-label` on each square, focus indicator. If missing, add before launch. |
| **high** | `apps/web/src/App.tsx:230` (`<main className="page">`) | No **skip link** for keyboard users to bypass masthead and go to game/panel. | Add `<a href="#game" className="skip-link">Skip to game</a>` at top of `main`; add `id="game"` to the board/panel container. |
| **medium** | `apps/web/src/Game.tsx:180` (`<p className="status" role="status" ...>`) | Status line updates on every move/clock tick. `role="status"` is polite; good. But **clock updates every 250ms** (`tick` interval) — may cause excessive announcements. | Add `aria-live="off"` to clock `<span>` elements; keep `role="status"` only on the main status line. |
| **medium** | `apps/web/src/Game.tsx:200` (`<ul className="seats" aria-label="Seats">`) | Seat list uses `data-seat`, `data-turn`, `data-state` for styling. Screen readers won't announce turn changes. | Add `aria-current="true"` to the active seat's `<li>`; move turn announcement to status line (already there). |
| **low** | `apps/web/src/ErrorScreen.tsx:10` | Error screen has `role="alert"` but no `tabIndex=-1` + `focus()` to move focus there. | In `ErrorScreen` `useEffect`, `document.querySelector('[role=alert]')?.focus()`. |
| **low** | `apps/web/src/Game.tsx:400` (`<details className="missing">`) | `<summary>` not focusable in some browsers without `tabIndex=0`. | Add `tabIndex=0` to `<summary>`. |

## Performance (Bundle, Code Splitting, Images)

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **high** | `apps/web/vite.config.ts` | **No code splitting.** Single 503 KB (142 KB gzip) main bundle. Rules pages, builder, online room, privacy, how-to-play all loaded upfront. | Add `build: { rollupOptions: { output: { manualChunks: { 'rules': ['./src/RulesPage.tsx', './src/RulesScreen.tsx'], 'builder': ['./src/Builder.tsx'], 'online': ['./src/OnlineRoom.tsx', './src/CreateRoom.tsx', './src/JoinByCode.tsx'], 'static': ['./src/Privacy.tsx', './src/HowToPlay.tsx'] } } } }`. Lazy-load with `React.lazy` in `App.tsx`. |
| **high** | `apps/web/src/Game.tsx:15` | `import { Board } from './board/Board'` — Board likely imports heavy SVG/piece assets. Not code-split. | Move Board to its own chunk: `const Board = React.lazy(() => import('./board/Board'))` with `<Suspense fallback={<div className="board-loading" />}>`. |
| **medium** | `apps/web/public/_headers:18` | `/assets/*` cached 1 year immutable — **correct for hashed files**. But Vite must emit hashes. Verify `build: { assetsDir: 'assets' }` (default) and filenames contain hashes. | Run `pnpm build` and check `dist/assets/*.[hash].js`. If no hashes, add `build: { rollupOptions: { output: { entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash].[ext]' } } }`. |
| **medium** | `apps/web/index.html:31` + `public/_headers` | `share.png` 219 KB, no `Cache-Control` rule (falls to default). Should be long-cached. | Add `/share.png  Cache-Control: public, max-age=31536000, immutable` to `_headers`. |
| **low** | `apps/web/src/game/botClient.ts:28` | Bot worker created lazily on first search. Good. But worker script (146 KB) loads on first computer move — noticeable delay on slow mobile. | Preload worker on Game mount: `const worker = new Worker(new URL('./bot.worker.ts', import.meta.url))` in `useEffect` with `worker.postMessage({type: 'warmup'})` (add handler in worker). |
| **low** | `apps/web/vite.config.ts:22` | `license: { fileName: 'third-party-licenses.txt' }` — good, but file not linked in UI except footer. | Verified footer links to `/third-party-licenses.txt`. No action needed. |

## Error States

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **medium** | `apps/web/src/errorFallback.ts:25` | `showPlainError` replaces `#root` content but **does not set `document.title`** — tab still says "Chess Nines: a 9×9 chess variant". | Add `document.title = 'Error · Chess Nines'` in `showPlainError`. |
| **low** | `apps/web/src/Game.tsx:380` | `recordProblem` state shows parse error but no "Try again" button — user must re-click "Open game record". | Add `<button onClick={() => setRecordProblem(null)}>Dismiss</button>` next to error. |
| **low** | `apps/web/src/ErrorScreen.tsx:12` | "A game in progress is kept in this browser." — only true for hot-seat/computer (localStorage). Online games are in Durable Objects. | Change to: "A local game in progress is kept in this browser. Online games are saved on the server." |

## README (Public Front Door)

| Severity | File/Area | Finding | Fix |
|----------|-----------|---------|-----|
| **blocker** | `README.md:5-6` | **"Play (coming soon): chess9s.com" and "Status: Phase 1 built"** — contradicts launch. Visitors will think it's not live. | Update to: **"Play now: [chess9s.com](https://chess9s.com)"** and **"Status: Public launch — Phase 3 complete"**. |
| **high** | `README.md:8` | "Story and lore (coming soon): chessnines.com" — if not ready, remove or mark clearly. | If chessnines.com isn't live, change to "Story and lore: [chessnines.com](https://chessnines.com) (coming soon)" or remove line. |
| **medium** | `README.md:33` | "Run it: Node 22 and pnpm 10, then `pnpm install` and `pnpm dev`." — **no mention of `wrangler dev` for online play**. | Add: "For online rooms: `pnpm --filter @chess9s/worker dev` (or `wrangler dev` from `apps/worker`)." |
| **low** | `README.md:13-18` | PolyForm Shield License summary — good. But "The license text controls; this summary is not legal advice" should be more prominent. | Move disclaimer to top of license section. |

---

## OFFLINE PLAN

### 1. Service Worker: Hand-Written vs Library

**Decision: Hand-written SW (no new dependency).**  
Rationale: Only 3 routes need offline (`/`, `/how-to-play`, `/privacy`, `/rules/*`, `/build`); assets are static; update logic is simple. A 150-line SW is maintainable and avoids Workbox's 8 KB runtime.

### 2. Routes & Assets to Precaching

| Category | Entries | Strategy |
|----------|---------|----------|
| **HTML entry** | `/` (index.html) | **Network-first, fallback to cache** (SPA shell). |
| **Static pages** | `/how-to-play`, `/privacy`, `/rules/*`, `/build` | **Cache-first** (immutable after build). |
| **JS/CSS chunks** | All `dist/assets/*.js`, `*.css` | **Cache-first** (hashed filenames). |
| **Images** | `/icon-192.png`, `/icon-512.png`, `/apple-touch-icon.png`, `/favicon.ico`, `/favicon.svg`, `/share.png` | **Cache-first**. |
| **Manifest** | `/site.webmanifest` | **Stale-while-revalidate** (1 day max-age in _headers; SW revalidates). |
| **Bot worker** | `/assets/bot.worker.[hash].js` | **Cache-first** (loaded on demand). |
| **Third-party licenses** | `/third-party-licenses.txt` | **Cache-first**. |
| **API / rooms** | `/api/*`, `/room/*` | **Network-only** (never cached; online-only). |

### 3. Cache Strategy & Update Flow

```typescript
// sw.js — key logic
const CACHE = 'chess9s-v1'; // bump on each deploy
const PRECACHE = [
  '/', '/how-to-play', '/privacy', '/build',
  // rules pages added dynamically from sitemap or manifest
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => 
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache API or room WebSocket
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/room/')) return;

  // HTML pages: network-first (gets fresh shell), fallback to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put('/', copy));
        return r;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => 
      cached || fetch(e.request).then((r) => {
        if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
        return r;
      })
    )
  );
});
```

**Update flow:** On deploy, `CACHE` version changes → `activate` deletes old cache → new `install` precaches fresh assets. User gets update on next navigation (network-first for `/`).

### 4. SPA Fallback Offline

- `index.html` cached as `/` in `install`.
- `fetch` handler for `mode: navigate` falls back to `caches.match('/')` when offline.
- React Router (client-side `pageOf`) takes over — all routes render from cached JS.
- **Critical:** `App.tsx` must not crash when `fetch` fails for dynamic imports (lazy chunks). Wrap `React.lazy` in retry + fallback to cached chunk.

### 5. localStorage Saved Games

- `apps/web/src/game/guest.ts` (not shown) uses `localStorage` for hot-seat/computer games.
- **Behavior offline:** Unchanged — `localStorage` works offline. `saveGuest`/`loadGuest` in `Game.tsx` continue to function.
- **Conflict:** If user plays offline, then online, then offline again — last write wins. Acceptable for guest-only.
- **Quota:** ~5 MB. A game record is ~2 KB. No action needed.

### 6. UI Marking Online-Only Features When Offline

| Feature | Current | Offline Indicator |
|---------|---------|-------------------|
| "Play online" button (Game.tsx:410) | Shows when `ruleset.online && onPlayOnline` | Disable + tooltip "Online play requires internet" |
| "Join by code" (Game.tsx:415) | `<JoinByCode />` | Hide entirely |
| RulePicker "Play online" | `onPlayOnline` prop | Disable button |
| Room page (`/room/:code`) | `OnlineRoom` component | Show "You're offline. Reconnect to join." with reload button |

**Implementation:** Add `navigator.onLine` listener in `App.tsx` → context → components read `isOnline`. Update `OnlineRoom` to detect offline and show banner.

### 7. Playwright Offline Testing

```typescript
// tests/offline.spec.ts
import { test, expect } from '@playwright/test';

test('hot-seat game works offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('.status'); // game loaded
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toContainText('Chess Nines');
  await page.locator('button:has-text("Standard 2-player")').click();
  await expect(page.locator('.status')).toContainText('Light to move');
  // Make a move
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e4"]').click();
  await expect(page.locator('.status')).toContainText('Dark to move');
});

test('computer game works offline', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('button:has-text("Computer")').click();
  await page.locator('button:has-text("Standard 2-player")').click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.status')).toContainText('Light to move');
  // Computer move should still work (bot worker cached)
  await page.waitForSelector('.status:has-text("Dark to move")', { timeout: 10000 });
});

test('online room shows offline banner', async ({ page, context }) => {
  await page.goto('/room/ABC123');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('text=You are offline')).toBeVisible();
});

test('PWA install prompt works', async ({ page, context }) => {
  await page.goto('/');
  // Check manifest + SW registered
  const sw = await page.evaluate(() => navigator.serviceWorker.ready.then(r => r.active?.scriptURL));
  expect(sw).toContain('sw.js');
});
```

---

## Launch Blockers

1. **No service worker** — PWA install fails, offline play impossible.
2. **README says "coming soon"** — public front door misrepresents launch status.
3. **Board keyboard accessibility unverified** — if `Board.tsx` lacks arrow-key navigation, game fails WCAG 2.1 AA.
4. **Sitemap ruleset IDs unverified** — may contain dead links.
5. **Favicon SVG path broken** (`../../assets/brand/favicon.svg` from `public/`).

## Top 5 Before Launch

1. **Write and register service worker** (hand-written, ~150 lines) with precache list above; test offline hot-seat + computer games with Playwright.
2. **Update README**: "Play now: chess9s.com", "Status: Public launch", add `wrangler dev` instruction.
3. **Verify Board keyboard accessibility** — add arrow keys, focus ring, `aria-label` per square; test with screen reader.
4. **Fix favicon paths** — move `favicon.svg` to `public/`, add `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`; verify `pnpm build` copies them.
5. **Enable code splitting** — lazy-load RulesPage, Builder, OnlineRoom, Board; verify gzip < 80 KB initial.