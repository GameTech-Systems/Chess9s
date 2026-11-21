# Handoff

Updated 2026-11-21 by the S95/S96 ledger review (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 7. S96 (offline play, PR 95) and S95 (launch-readiness fixes, PR 100) are both done and merged, in that order. They work together: the precache takes every file under `assets/`, so the six on-demand pages work offline, and `/api/*` skips the service worker, so 429 and 503 answers are never cached.
- The ledger is read straight from the repo now: `docs/decisions/LEDGER-SNAPSHOT.md` (made by `scripts/claude/ledger-snapshot.mjs` from an export). S95 and S96 are synced into the ledger: I34, I37, I39 to I41 and I43 to I45 resolved; I46 to I50 and D95 to D98 added from their sync blocks.
- D89, D90, D91 and D94 are decided as their defaults, so S95 and S96 built what the owner chose. D93 is the owner's own answer (see below).
- `/end-session` now lists every fixed issue and, when the session has `ArtifactData` and the ledger link, syncs the ledger and regenerates the snapshot itself.
- Typecheck, lint, validate:rules and build are green; 3,071 tests pass. Outside audit of the S95+S96 diff: `docs/audits/2026-11-21/`.

## Next session
**S97 — Front door and launch materials** · Sonnet 5.5 · effort medium
Why: D91 to D94 are settled, so S97 no longer waits on S98; S98's owner items can run alongside.
Start with: `/start-session S97`

## Decisions in effect for the next step
- D91: the owner posts, one channel a day, in the `docs/LAUNCH.md` order; Claude drafts, never posts (decided, default).
- D93: "The sooner the better. As soon as it's ready we can decide the exact date." No fixed launch day in the drafts (decided).
- D94: no analytics script (decided, default). D92: GameTypeBrand@gmail.com (decided).
- D98: the privacy page's IP-counting wording stays as written (open, default).

## Open questions for the owner
- D7 and D10 in the ledger conflict with the repo: D7 says "Claude pushes straight to main" and D10 says opusplan, but CLAUDE.md requires PRs, green CI and rebase merges, and `.claude/settings.json` pins Sonnet. CLAUDE.md and the step's model apply until you settle them.
- D44's owner text ("same as Good Practice") may not match `coast.openToAll` as built in S40. Worth a look; no change made.
- S98 (owner): S2 GitHub settings, the Cloudflare rate-limit check after deploy (D96), the pinned "Launch feedback" Discussion (S97's footer link waits on it), and testers.
- D95: GameTypeBrand@gmail.com in `security.txt` and SECURITY.md? Default: no.
- Carried over: OpenRouter credits, turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, favicon, Ting Yang art, the "hollow tetrahedral bases" line, larger source PNGs, security.txt renewal before 2027-11-01.

## Notes for Claude
- Read `docs/decisions/LEDGER-SNAPSHOT.md` for decisions; its precedence line says what wins.
- workerd refuses a number (or string) export from `apps/worker/src/index.ts`; a test checks that it exports only functions and objects.
- Pages that render the app in tests need `beforeAll(preloadPages)` (`apps/web/src/pages.tsx`); add new on-demand pages to `ON_DEMAND`.
- Room tests run on frozen time: advance it between bursts of messages, or the per-socket limit drops them.
