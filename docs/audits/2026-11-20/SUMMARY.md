# Launch-readiness audits, 20 Nov 2026 (S33)

Three outside readings and Claude's own checks, with each finding verified against the code. S95 fixes the rows marked **fix in S95**; S96, S97 and S98 take the rows marked with their step; **later** rows become issues; **no** rows were checked and are wrong or already handled.

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
| 3 | No rate limit on making rooms; the Origin check is not a defense | Claude (and Kimi, see its report) | Yes | High | **fix in S95** (a per-address limit in the Worker, such as Cloudflare's rate-limiting binding) and S98 (a rate-limit rule in the Cloudflare dashboard if the binding is not available on the plan) |
| 4 | One 503 KB script for every page; rules pages, builder and rooms could load on demand | Nemotron, Claude | Yes | Medium | **fix in S95** (lazy-load Builder, OnlineRoom and its screens, RulesPage, HowToPlay, Privacy; keep the game and board in the first script). It also shapes S96's precache list |
| 5 | No public contact address (`CONTACT_ADDRESS` is empty) | Nemotron | Yes (I34) | Medium | S98 (D92) |
| 6 | No skip link to the board | Nemotron | Yes | Low | **fix in S95** |
| 7 | Board squares are reachable by Tab and work with Enter and Space, but there are no arrow keys | Nemotron said the board was not keyboard-playable | Partly: it is playable by keyboard | Low | later (arrow keys between squares) |
| 8 | The plain error screen does not set the tab title | Nemotron | Yes | Low | **fix in S95** |
| 9 | `share.png` has no cache rule | Nemotron | Yes | Low | **fix in S95** (a day, like the icons: its address is fixed) |
| 10 | Unknown paths show the home page with status 200 | Nemotron | Yes, by design (the host's single-page fallback, canonical to `/`) | Low | later (a "not found" page; the Worker cannot set 404 for the SPA fallback without running first on every path) |
| 11 | Active seat could carry `aria-current` | Nemotron | Yes | Low | **fix in S95** |
| 12 | Warm up the computer's worker when a computer game opens | Nemotron | Plausible | Low | later |
| 13 | Manifest shortcuts | Nemotron | Optional | Low | later |
| 14 | Favicon path broken, icons missing, sitemap ids missing, asset names not hashed, clocks spam a live region | Nemotron | No: the build rewrites the favicon path, the icons are in `public/`, every sitemap id exists, assets are hashed, the clocks are not in a live region | — | no |
| 15 | A first-visit welcome banner | Nemotron | Not needed: the home page already says what the game is and has How to play | — | no |
| 16 | Settle the launch decisions before writing the posts; a bigger soft launch with quotas; holiday-safe dates; a service-worker kill switch; manual accessibility checks; more phone widths; a pinned feedback thread and a 72-hour answer rule; success signals | Ernie | Yes | — | Adopted in `docs/LAUNCH.md`, decision 0025 and S95 to S98 |
| 17 | Make the 3-player mode the front door | Ernie | Already there: the home page shows 2 players and 3 players as two cards | — | no; the press page and posts lead with it (S97) |
| 18 | An aggregate Worker counter of rooms | Ernie | A choice, it changes "nothing is logged" | — | D94 option |

The security report's own findings are listed below with the same treatment.

## Security report (Kimi)
| # | Finding | Verified | Severity | Where it goes |
|---|---|---|---|---|
| K1 | Room making, sockets across rooms and room-info requests have no per-address limit; the Origin check is not a defense | Yes (row 3) | Blocker for the public launch | **fix in S95**: a per-address limit in the Worker keyed by `CF-Connecting-IP` (Cloudflare's rate-limiting binding), about 10 rooms a minute, 30 socket opens a minute and 60 room-info requests a minute, answered with a secured `429` and `Retry-After`; S98: the owner adds a dashboard rate-limit rule and usage alerts if the plan allows |
| K2 | A socket may send messages without limit; the 24 KB cap is checked after the message arrives; binary frames are answered, not closed | Yes (no per-socket rate limit; junk does not write storage) | Medium | **fix in S95**: a per-socket token bucket (about 20 a second, burst 40), close with 1009 for an oversized message and 1003 for binary, 1008 for a repeat offender |
| K3 | Expired seat records in the browser are skipped on read but stay in local storage until the next write | Yes (`onlineStore.ts` `read` does not write back) | Medium (privacy page accuracy) | **fix in S95**: purge on read |
| K4 | A rejected room probe would stop reconnecting | Partly: `fetchRoom` catches network errors, so the probe does not reject today | Low | **fix in S95**: a catch in `connection.ts` that schedules the next try, with a test |
| K5 | An exception in a Durable Object call escapes `handle()` without the app's secured JSON error | Yes (no top-level catch) | Medium | **fix in S95**: a catch around `/api/*` returning a secured `503` problem; sockets close with 1011 |
| K6 | No service worker; the privacy page's "no network requests" line needs a qualifier once one exists | Yes | — | S96 (decision 0025, items 6 and 7) |
| K7 | Local development origins are accepted by the production Worker | Yes | Low | **fix in S95**: accept `localhost` only when the Worker itself runs on `localhost` |
| K8 | README is out of date | Yes (row 2) | High | S97 |
| — | CSP needs no new directive for a same-origin service worker; `sw.js` gets `Cache-Control: no-cache` | Agrees with decision 0025 | — | S96 |

Kimi also lists what is done well: capped request bodies, strict message validation, 256-bit seat tokens kept out of URLs and room info, `no-store` on API responses, a tight CSP, per-room socket caps and idle timeouts, retention as the privacy page states, and a correct `wrangler.jsonc`.

## Launch blockers after verification
1. Offline play (D88): S96.
2. Per-address limits on making rooms and opening sockets (K1, row 3): S95, with the dashboard rule in S98.
3. README and front door (row 2, K8): S97.
