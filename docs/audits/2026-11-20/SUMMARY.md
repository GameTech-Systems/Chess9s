# Launch-readiness audits, 20 Nov 2026 (S33)

Three outside readings and Claude's own checks, with each finding verified against the code. S95 fixed the rows marked **Fixed in S95** (21 Nov 2026); S96, S97 and S98 take the rows marked with their step; **later** rows become issues; **no** rows were checked and are wrong or already handled.

## What was run
| Reading | Model and route | What it read | Report |
|---|---|---|---|
| Product and offline readiness | NVIDIA Nemotron 3 Ultra, NVIDIA API | README, ROADMAP, `index.html`, manifest, robots, sitemap, `_headers`, Vite config, `main.tsx`, `App.tsx`, `links.ts`, error screens, the computer's worker and client, `session.ts`, `Game.tsx` | `product-nemotron.md` |
| Security, privacy and operations | Kimi K3.1 Pro, NVIDIA API | `wrangler.jsonc`, `_headers`, `index.html`, the Worker (`index.ts`, `room.ts`), `protocol.ts`, the browser's connection, room store and guest store, the privacy page, SECURITY.md, security.txt | `security-kimi.md` |
| The launch plan | Baidu Ernie 5.5 Flash, OpenRouter (free tier) | The first draft of `docs/LAUNCH.md`, decision 0025, the Phase 7 steps, D88 to D94 | `plan-ernie.md` |
| Claude's checks | Chromium (Playwright) with axe-core 4.10, on the built app | Seven pages at 1280 and 375 px; offline reload; bundle sizes; the Worker's limits | this file |

Routes: OpenRouter's account is on the free tier with no credits, so only free models ran there (the paid models were refused). Two NVIDIA models (Mistral Large 4, GLM 5.3 Flash) timed out on the security packet; Kimi answered once the request was streamed with low reasoning effort. No secrets or personal information were sent: the repo is public, and the owner's name was replaced in the files sent.

## Claude's checks
- **Accessibility:** axe-core found no violations on the home page, How to play, a rules page, Privacy, the builder, Play online and an unknown path, at 1280 and 375 px. No horizontal overflow at 375 px; no console errors.
- **Offline:** no service worker is registered; with the network off, a reload fails (`ERR_INTERNET_DISCONNECTED`). Expected: S96.
- **Size:** one script of 503 KB (142 KB compressed) loads every page; the computer's worker is 146 KB (32 KB). The whole build is 1.5 MB, most of it 2x art and the 219 KB share image.
- **Rooms:** `POST /api/rooms` checks only the `Origin` header, which a script can set, and has no rate limit, so one client can make rooms as fast as the Worker answers; each room is a Durable Object kept up to 7 days (D53). Junk messages on an open socket do not write storage (unchanged saves are skipped), and sockets per room are capped.

## Findings and what happens to them
| # | Finding | From | Verified | Severity | Where it goes |
|---|---|---|---|---|---|
| 1 | No service worker: no offline play, no full install | Nemotron, Claude | Yes | Blocker for D88 | S96 |
| 2 | README says "Phase 1 built" and "Play (coming soon)" | Nemotron, Claude | Yes | High | S97 |
| 3 | No rate limit on making rooms; the Origin check is not a defense | Claude (and Kimi, see its report) | Yes | High | **Fixed in S95**: see K1. S98: the dashboard rule and usage alerts if the plan allows |
| 4 | One 503 KB script for every page; rules pages, builder and rooms could load on demand | Nemotron, Claude | Yes | Medium | **Fixed in S95**: Builder, CreateRoom, OnlineRoom, RulesPage, HowToPlay and Privacy are their own scripts (`apps/web/src/pages.tsx`). The first visit loads 452 KB of script (132 KB compressed) instead of 503 KB (142 KB): the engine and rules data the game needs are most of it. The offline worker precaches every script, so the pages open offline |
| 5 | No public contact address (`CONTACT_ADDRESS` is empty) | Nemotron | Yes (I34) | Medium | S98 (D92) |
| 6 | No skip link to the board | Nemotron | Yes | Low | **Fixed in S95**: "Skip to the board" is first in the tab order on the game and room pages and moves focus to the board; hidden where no board is drawn |
| 7 | Board squares are reachable by Tab and work with Enter and Space, but there are no arrow keys | Nemotron said the board was not keyboard-playable | Partly: it is playable by keyboard (S95 played the 80-move game by keyboard alone) | Low | later: [issue 96](https://github.com/GameTech-Systems/Chess9s/issues/96) |
| 8 | The plain error screen does not set the tab title | Nemotron | Yes | Low | **Fixed in S95**: both error screens set "Something went wrong · Chess Nines" |
| 9 | `share.png` has no cache rule | Nemotron | Yes | Low | **Fixed in S95**: a day, like the icons |
| 10 | Unknown paths show the home page with status 200 | Nemotron | Yes, by design (the host's single-page fallback, canonical to `/`) | Low | later: [issue 97](https://github.com/GameTech-Systems/Chess9s/issues/97) (a "not found" page; the Worker cannot set 404 for the SPA fallback without running first on every path) |
| 11 | Active seat could carry `aria-current` | Nemotron | Yes | Low | **Fixed in S95**: the seat to move carries `aria-current` in every seat and clock list |
| 12 | Warm up the computer's worker when a computer game opens | Nemotron | Plausible | Low | later: [issue 98](https://github.com/GameTech-Systems/Chess9s/issues/98) |
| 13 | Manifest shortcuts | Nemotron | Optional | Low | later: [issue 99](https://github.com/GameTech-Systems/Chess9s/issues/99) |
| 14 | Favicon path broken, icons missing, sitemap ids missing, asset names not hashed, clocks spam a live region | Nemotron | No: the build rewrites the favicon path, the icons are in `public/`, every sitemap id exists, assets are hashed, the clocks are not in a live region | — | no |
| 15 | A first-visit welcome banner | Nemotron | Not needed: the home page already says what the game is and has How to play | — | no |
| 16 | Settle the launch decisions before writing the posts; a bigger soft launch with quotas; holiday-safe dates; a service-worker kill switch; manual accessibility checks; more phone widths; a pinned feedback thread and a 72-hour answer rule; success signals | Ernie | Yes | — | Adopted in `docs/LAUNCH.md`, decision 0025 and S95 to S98 |
| 17 | Make the 3-player mode the front door | Ernie | Already there: the home page shows 2 players and 3 players as two cards | — | no; the press page and posts lead with it (S97) |
| 18 | An aggregate Worker counter of rooms | Ernie | A choice, it changes "nothing is logged" | — | D94 option |

The security report's own findings are listed below with the same treatment.

## Security report (Kimi)
| # | Finding | Verified | Severity | Where it goes |
|---|---|---|---|---|
| K1 | Room making, sockets across rooms and room-info requests have no per-address limit; the Origin check is not a defense | Yes (row 3) | Blocker for the public launch | **Fixed in S95**: three rate-limiting bindings (`wrangler.jsonc`) keyed by `CF-Connecting-IP`: 10 rooms, 30 socket opens and 60 room-info requests a minute per address, answered with a secured `429` and `Retry-After: 60` (checked on `wrangler dev` by `pnpm worker:e2e`). Cloudflare counts per location, so they are a ceiling, not an exact count. The privacy page says requests are counted by IP address for a minute and the address is never stored. S98: the owner adds a dashboard rate-limit rule and usage alerts if the plan allows |
| K2 | A socket may send messages without limit; the 24 KB cap is checked after the message arrives; binary frames are answered, not closed | Yes (no per-socket rate limit; junk does not write storage) | Medium | **Fixed in S95**: a per-socket bucket of 40, refilled at 20 a second, kept through hibernation; messages over it are dropped unanswered and the tenth closes the socket with 1008. A binary frame closes with 1003 and a message over 24,000 bytes with 1009, before parsing. The cap itself is Cloudflare's: a message has arrived by the time the room sees it |
| K3 | Expired seat records in the browser are skipped on read but stay in local storage until the next write | Yes (`onlineStore.ts` `read` does not write back) | Medium (privacy page accuracy) | **Fixed in S95**: a read writes expired and malformed entries out of storage |
| K4 | A rejected room probe would stop reconnecting | Partly: `fetchRoom` catches network errors, so the probe does not reject today | Low | **Fixed in S95**: a failed probe counts as "try again"; the next failed try waits longer, as after any drop |
| K5 | An exception in a Durable Object call escapes `handle()` without the app's secured JSON error | Yes (no top-level catch) | Medium | **Fixed in S95**: `/api/*` answers a secured `503` with `Retry-After` when a room throws; a room socket whose message fails closes with 1011 and its seat turns away |
| K6 | No service worker; the privacy page's "no network requests" line needs a qualifier once one exists | Yes | — | S96 (decision 0025, items 6 and 7) |
| K7 | Local development origins are accepted by the production Worker | Yes | Low | **Fixed in S95**: local origins are accepted only when the Worker runs on `localhost` or `127.0.0.1` |
| K8 | README is out of date | Yes (row 2) | High | S97 |
| — | CSP needs no new directive for a same-origin service worker; `sw.js` gets `Cache-Control: no-cache` | Agrees with decision 0025 | — | S96 |

Kimi also lists what is done well: capped request bodies, strict message validation, 256-bit seat tokens kept out of URLs and room info, `no-store` on API responses, a tight CSP, per-room socket caps and idle timeouts, retention as the privacy page states, and a correct `wrangler.jsonc`.

## Launch blockers after verification
1. Offline play (D88): S96.
2. Per-address limits on making rooms and opening sockets (K1, row 3): done in S95; the dashboard rule is S98.
3. README and front door (row 2, K8): S97.

## Gate 1 manual accessibility pass (S95)
Chromium on the built app, 21 Nov 2026.
- **Keyboard alone:** the 80-move hot-seat game played to checkmate with Tab and Enter only (about 3,100 Tab presses, since there are no arrow keys yet: issue 96). The rules dialog takes focus, keeps Tab inside, closes on Escape and gives focus back. Fixed: the resign confirm steps (3-player hot-seat and online rooms) left focus on the page when they opened and when "Keep playing" closed them; they now focus "Keep playing" and give focus back to the Resign button (`e2e-3p.mjs` checks it). Not run: an online room's resign step by keyboard (the same code as hot-seat).
- **200% zoom** (1280 × 800 at 200%, 640 × 400 CSS pixels): no sideways scroll on the home, how-to-play, rules, builder, privacy, room and unknown pages or in a game; the board is 256 px.
- **Widths 320 and 430 px, and landscape** (844 × 390): no sideways scroll on the same pages; the board is 304, 414 and 280 px. `e2e-offline.mjs` checks 320, 375, 430 and landscape on every run.
- **Reduced motion:** fixed. The home page's cards and the builder's switches kept their 0.15 s transitions; with `prefers-reduced-motion: reduce` every transition and animation is now off.
- Not run: Safari and Firefox, and a screen reader.
