# Handoff

Updated 2026-10-25 by S32 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 4 is on hold by the owner's choice (S47 to S50). Standard's discussion: GitHub Discussions #39, closes 2026-11-15 (D20); link and dates in `apps/web/src/tournament.ts`.
- Phase 5 is planned (S51 to S54, defaults D50 to D54). Phase 6 is planned (S32, docs only): S55 the owner settles the 3-player rule gaps, S56 3-player game state and game end, S57 hot-seat in the browser, S58 computer opponent (paranoid search), S59 balance sims and sweep, S60 the owner's depth-2 run, S61 the owner's balance review. New entries D55 to D61. 1460 tests pass.

## Next session
**S51 — Room logic and protocol** · Opus 5.5 · effort high
Why: it is the first buildable step. S55 (Owner with Claude in chat) has to come before S56, and it can run at any time alongside Phase 5.
Start with: `/start-session S51`

## Decisions in effect for the next step
- D51: resign and draw by agreement; no clock, no takebacks, no forfeit for a disconnection (default).
- D52: the creator picks light, dark or random (random preselected); two seats; no spectators (default).
- D54: 6-character room codes without look-alikes; the seat token is the secret (default).

## Open questions for the owner
- D55 to D58 (the 3-player rule gaps and the timer) are rules, so they get no defaults. The questions are listed under S55 in `docs/BUILD-PLAN.md`. They block S56, not S51.
- D50 to D54 and D59 to D61 are provisional until the ledger confirms them.
- Carried over: the Discussion form prefill check, the flag rule (decision 0013), how to read `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- Phase 5 gaps found in planning: the web reads `rules/` through Vite's `import.meta.glob`, which a Worker lacks; Workers forbid `eval`, so the server can't use Ajv; the engine has no resign or agreed-draw result. S51 handles all three.
- Phase 6: 3-player movement is already data. `newGame` refuses 3 players, `draw.3p.stalemate` is read by nothing, and S23's search is 2-player negamax. Decision record 0014 is reserved for S50, so the 3-player balance measure is 0015 (S59).
- Cloudflare: legacy version preview URLs skip a Worker with a Durable Object. Worker Previews (`wrangler preview`) reportedly give each preview its own namespace. S52 checks this first (D50).
- A lock is never edited by hand. For a new version: `pnpm lock archive <id>`, edit the file, then `pnpm lock write <id>`.
- Playwright works against `vite preview` on port 4173. Cloudflare Workers Builds deploys `main`.
