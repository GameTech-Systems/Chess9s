# Handoff

Updated 2026-11-21 by S96 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 7. Offline play works (decision 0025, "Built" section). After one visit, 2- and 3-player hot-seat and computer games play, reload and end with no network. Play online, Join a room and room pages say they need a connection. A new version waits and is offered only when no game is in progress. Code: `apps/web/src/offline/`; `dist/sw.js` is written by the build.
- `apps/web/scripts/e2e-offline.mjs` passes (desktop, Pixel 7, 320/375/430 px, landscape, blocked workers, cleared site data, update). The clock, 3-player and room browser scripts still pass with the worker in place. Chromium only: Safari and Firefox were not run.
- The contact address GameTypeBrand@gmail.com is on the privacy page (D92 decided, public ledger entry). The privacy page is dated 21 November 2026.
- S95 was skipped at the owner's request and is still `todo`. Typecheck, lint, validate:rules green; 3,048 tests pass.

## Next session
**S95 — Launch-readiness fixes from the S33 audits** · Opus 5.5 · effort high
Why: room limits (K1, K2) and the Worker's error boundary are security work on the live site, and the last launch blocker in code.
Start with: `/start-session S95`

## Decisions in effect for the next step
- D88: offline play for hot-seat and computer games only (decided, built in S96).
- D89, D90: applied as their defaults (hand-written worker; the update waits for no game in progress). Provisional until the ledger brief says otherwise.
- D92: GameTypeBrand@gmail.com on the privacy page (decided, owner, 21 Nov 2026).
- D91, D93, D94: the owner says they are decided in the ledger, but the values have not reached the repo; the table still shows the defaults.

## Open questions for the owner
- Paste the ledger brief for D89 to D91, D93 and D94, so the table and S97's drafts use your choices. Defaults apply until then.
- Should GameTypeBrand@gmail.com also go in `security.txt` and SECURITY.md as a second contact? Default: no; security reports stay with GitHub private reporting.
- Carried over: OpenRouter credits, S2 (GitHub security settings), turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, `coast.openToAll`, favicon, Ting Yang art, the "hollow tetrahedral bases" line, larger source PNGs, security.txt renewal before 2027-11-01.

## Notes for Claude
- S95: read only `SUMMARY.md`'s rows marked "fix in S95" (rows 3, 4, 6, 8, 9, 11 and K1 to K5, K7) and I37. The precache list follows Vite's output, so code-splitting needs no change in `offline/`. Run `e2e-offline.mjs` after it.
- Shipping the recovery worker also means removing the registration in `main.tsx`; otherwise pages reload without end (decision 0025, Built).
- `pnpm dev` registers no worker; offline behaviour needs `pnpm build` and the e2e script (its own server, port 4175).
- Outside readings: `curl` or Python to `integrate.api.nvidia.com` and `openrouter.ai` (the proxy adds the keys).
- A new parameter makes lock tests fail until `pnpm lock add-keys`; new ruleset files need `pnpm rules:index`.
