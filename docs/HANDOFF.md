# Handoff

Updated 2026-11-21 by S95 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 7. Every "fix in S95" row of `docs/audits/2026-11-20/SUMMARY.md` is fixed and answered there. The Worker limits each address per minute to 10 rooms, 30 socket opens and 60 room-info requests (rate-limiting bindings in `wrangler.jsonc`, secured 429). It answers a secured 503 when a room throws, and accepts `localhost` origins only on a local Worker. A room socket gets a 40-message burst, then 20 a second; binary closes 1003, oversized 1009, repeat floods 1008, errors 1011.
- Browser: stale seat records are purged on read, and a failed room probe keeps reconnecting. The seat to move has `aria-current`. There is a skip link to the board. Both error screens set the tab title, and `share.png` has a cache rule. Six pages load on demand (first visit 452 KB of script, 132 KB compressed, was 503/142). Resign confirm steps keep keyboard focus, and reduced motion turns off transitions. 3-player reports print seats as dark, light, dragon (I37).
- Gate 1 manual accessibility pass is in SUMMARY.md: a keyboard-only game to checkmate, dialogs, 200% zoom, 320/430/landscape, reduced motion. Not run: Safari, Firefox, a screen reader.
- The four "later" rows are issues 96 to 99. The privacy page now says room requests are counted by IP address for one minute and the address is never stored (still dated 21 November 2026).
- `worker:check`, `worker:e2e` (with a 429 check) and all six browser scripts pass. Typecheck, lint and validate:rules are green; 3,071 tests pass.

## Next session
**S98 — Launch decisions** · Owner with Claude in chat · Opus 5.5 · effort medium
Why: S97's materials wait on D91 to D94, and S95's Cloudflare settings need the owner.
Start with: `/start-session S98`

## Decisions in effect for the next step
- D88: offline play for hot-seat and computer games only (decided).
- D89, D90: applied as their defaults; provisional until the ledger brief says otherwise.
- D92: GameTypeBrand@gmail.com on the privacy page (decided).
- S95's limits (10/30/60 a minute per address; 20 messages a second, burst 40, tenth drop closes) are provisional, from the S33 security reading.
- D91, D93, D94: decided in the ledger per the owner, values not yet in the repo; defaults apply.

## Open questions for the owner
- Cloudflare (S98): confirm the rate-limiting binding works on the account's plan after the first deploy (a 429 on the 11th room in a minute). Add a dashboard rate-limit rule and usage alerts if the plan allows.
- Paste the ledger brief for D89 to D91, D93 and D94. Defaults apply until then.
- Should GameTypeBrand@gmail.com also go in `security.txt` and SECURITY.md? Default: no.
- Carried over: OpenRouter credits, S2 (GitHub security settings), turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, `coast.openToAll`, favicon, Ting Yang art, the "hollow tetrahedral bases" line, larger source PNGs, security.txt renewal before 2027-11-01.

## Notes for Claude
- workerd refuses a number (or string) export from `apps/worker/src/index.ts`; a test checks that it exports only functions and objects.
- Pages that render the app in tests need `beforeAll(preloadPages)` (`apps/web/src/pages.tsx`); add new on-demand pages to `ON_DEMAND`.
- Room tests run on frozen time: advance it between bursts of messages, or the per-socket limit drops them.
- Browser scripts share one `dist`: rebuild only when none is running.
