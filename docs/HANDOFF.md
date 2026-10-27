# Handoff

Updated 2026-10-26 by S55 (Opus 5.5 · high, owner with Claude in chat). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 4 is on hold by the owner's choice (S47 to S50). Standard's discussion: GitHub Discussions #39, closes 2026-11-15 (D20); link and dates in `apps/web/src/tournament.ts`.
- Phase 5 is planned (S51 to S54, defaults D50 to D54).
- Phase 6: S55 is done (docs only). Decision 0016 settles the 3-player rules (D55 to D57), adds three 3-player presets (`standard-3p`, `draft-3p` 0.3.0 as Good Practice, `easy-3p`, first checkmate wins, D65) and six new parameters for S56 to add. The computer Dragon starts greedy (D59): S58 is now greedy, S62 is the paranoid search, S64 is the 3-player builder (D64), S63 is 3-seat online rooms (D61 in the ledger). Time controls (D58, decision 0017): untimed by default, Apex-style presets for players to choose; S65 hot-seat clocks, S66 online clocks. Order: S56, S57, S58, S64, S65, S62, S59, S60, S61. 1460 tests pass.

## Next session
**S51 — Room logic and protocol** · Opus 5.5 · effort high
Why: it is the next buildable step in order. S56 is unblocked now and can run before or after it (Opus 5.5 · high, `/start-session S56`).
Start with: `/start-session S51`

## Decisions in effect for the next step
- D51: resign and draw by agreement; untimed (clocks come in S66), no takebacks, no forfeit for a disconnection (default).
- D52: the creator picks light, dark or random (random preselected); two seats; no spectators (default).
- D54: 6-character room codes without look-alikes; the seat token is the secret (default).

## Open questions for the owner
- D66 (what running out of time does) is a default from decision 0017. D50 to D54 and D60 are provisional until the ledger confirms them.
- Carried over: the Discussion form prefill check, the flag rule (decision 0013), how to read `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- Phase 5 gaps found in planning: the web reads `rules/` through Vite's `import.meta.glob`, which a Worker lacks; Workers forbid `eval`, so the server can't use Ajv; the engine has no resign or agreed-draw result. S51 handles all three.
- Phase 6: 3-player movement is already data. `newGame` refuses 3 players, `draw.3p.stalemate` is read by nothing, and S23's search is 2-player negamax. Records 0014 (S50) and 0015 (S59) are reserved; S55's rules are 0016, marked (notes) or (reading) per rule. The new parameters come from the owner's decision, so S56 adds them.
- Cloudflare: legacy version preview URLs skip a Worker with a Durable Object. Worker Previews (`wrangler preview`) reportedly give each preview its own namespace. S52 checks this first (D50).
- A lock is never edited by hand. For a new version: `pnpm lock archive <id>`, edit the file, then `pnpm lock write <id>`.
- Playwright works against `vite preview` on port 4173. Cloudflare Workers Builds deploys `main`.
