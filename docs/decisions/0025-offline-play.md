# 0025: Offline play

**Status:** Accepted for scope (owner, 20 Nov 2026, D88). The way it is built (D89) and the update flow (D90) are Claude's defaults, provisional until the owner decides in the ledger. Planned in S33; built in S96.

## Owner's request
"I'd also like for the game to be played offline (hot-seat and computer opponent only)."

## Decision
1. **Scope (D88, decided).** After one visit with a network, every hot-seat game and every game against the computer, for 2 and 3 players, with any bundled or saved ruleset, starts, plays, reloads and ends with no network. Online rooms stay online-only: making, joining and playing a room needs the network, as today.
2. **What works offline.** The home page, a game (hot-seat or computer, any seat), the rules pages of the bundled rulesets, How to play, Privacy, the builder (build, save, export and load a file; a share link opens if the app is cached), Save board image, and the game record. The computer's Web Worker is part of the cached app.
3. **What says so instead of failing.** Play online, Join a room and a room page show a short notice that they need a connection, and come back on their own when the browser is online again. A room game in progress is not moved offline; its own reconnect logic stays as it is.
4. **How it is built (D89, default).** A hand-written service worker (`apps/web/public/sw.js` or emitted by the build), with a precache list the build writes from Vite's output, so no new dependency. It precaches the app shell, every hashed asset under `/assets/`, the icons and the manifest; it answers page navigations with the cached `index.html` when the network fails; it never handles `/api/*` or WebSockets. Option: `vite-plugin-pwa` with Workbox (MIT), noted in NOTICE if chosen.
5. **Updates (D90, default).** A new version installs in the background and waits. When it is ready and no game is in progress on the page (or once the game ends), a notice offers "Reload for the new version"; the service worker never takes over a page mid-game. A game kept in the browser carries its ruleset and replays after an update, as it does today. Old caches are deleted when the new version takes over.
6. **Headers.** `sw.js` is served with `Cache-Control: no-cache` so browsers check it on each visit; the hashed assets keep their year-long `immutable` rule. The Content-Security-Policy already allows it (`worker-src 'self'`, `script-src 'self'`); nothing else changes.
7. **Privacy.** The privacy page adds one line: the browser keeps a copy of the app's own files (Cache Storage) so it can run offline; it holds no game data and clearing site data removes it. The page date changes.
8. **Recovery.** If a released service worker misbehaves, the fix is a new `sw.js` that deletes every Chess Nines cache, unregisters itself and reloads its pages; because `sw.js` is never cached long, every browser picks it up on its next visit. S96 keeps that file ready in the repo (not deployed) with a test.
9. **Installing.** The manifest already allows installing the app. No custom install button: browsers' own install prompts are enough for the launch.

## Checks (done-when for S96)
- Unit tests: the precache list covers every file in `dist/assets/` and the shell; the worker's routing (navigation fallback, `/api/*` untouched, cache-first for hashed assets) as plain functions.
- A Playwright script (`apps/web/scripts/e2e-offline.mjs`, after `pnpm build`): visit once, go offline with `context.setOffline(true)`, reload, then play a 2-player hot-seat game, a game against the computer, and a 3-player hot-seat game to a result; reload offline mid-game and find it kept; open Play online and see the notice; go online and see it clear. Desktop and Pixel 7 width.
- Widths: 320, 375 and 430 px, and a phone in landscape; private browsing (where the browser refuses a service worker, the app still runs online); cleared site data.
- An update test: build twice with a changed asset, see the second version wait during a game and take over after Reload.

## Not changed
Online rooms, the room protocol, the Worker's routes, rulesets, locks and fairness runs. Native apps (Capacitor) are a later Phase 7 track that will reuse this offline app.
