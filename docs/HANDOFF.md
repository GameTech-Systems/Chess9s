# Handoff

Updated 2026-10-25 by S31 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 4 is on hold by the owner's choice (S47 to S50, 25 Oct 2026). Standard's discussion: GitHub Discussions #39, closes 2026-11-15 (D20); link and dates in `apps/web/src/tournament.ts`.
- Phase 5 is planned (S31, docs only): S51 room logic and protocol (`packages/online`), S52 rooms on a Cloudflare Worker with a Durable Object, S53 play online in the browser, S54 the owner's go-live. New defaults D50 to D54. 1460 tests pass.

## Next session
**S32 — Phase 6 planning (3-player Dragon mode)** · Opus 5.5 · effort high
Why: the owner asked for S32 in its own session; it replaces the Phase 6 placeholder with detailed steps, as S30 and S31 did.
Start with: `/start-session S32`

## Decisions in effect for the next step
- D4: straight-line squares for all 5 Coast pieces, no corner option (decided, rule set v0.2).
- D5: superseded; Coast piece parameters are tagged per mode (rule set v0.2).
- D14: the full 3-player rules are public in rule set v0.2 (`docs/RULES.md`, `draft-3p`).

## Open questions for the owner
- D50 to D54 (Phase 5 defaults) are provisional until the ledger confirms them; none blocks S32 or S51.
- Carried over: Discussion form prefill check, the flag rule (decision 0013), `coast.openToAll` reading, I34 contact address, favicon and Ting Yang art.

## Notes for Claude
- Phase 5 gaps found in planning: the web reads `rules/` through Vite's `import.meta.glob` (no Worker equivalent); Workers forbid `eval`, so no Ajv on the server; the engine has no resign or agreed-draw result. S51 handles all three.
- Cloudflare: legacy version preview URLs skip Workers with a Durable Object; the newer Worker Previews (`wrangler preview`, beta since Sep 2026) reportedly give each preview its own namespace. S52 checks this first (D50).
- When Standard becomes Official (S50): `Tournament.tsx` already names an Official 2-player ruleset when one exists; update its tests and the discussion copy then.
- A lock is never edited by hand. New version: `pnpm lock archive <id>`, edit the file, `pnpm lock write <id>`.
- Playwright works against `vite preview` on port 4173. Cloudflare Workers Builds deploys `main`.
