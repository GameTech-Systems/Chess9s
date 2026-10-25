# Handoff

Updated 2026-10-25 by S46 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 4. S44 and S46 are done. Standard's discussion: GitHub Discussions #39, opened 2026-10-25, closes 2026-11-15 (D20). It lives in `apps/web/src/tournament.ts`.
- `/tournament` (`Tournament.tsx`) says: Official rulesets only (D46); Standard is a Candidate under discussion (link and both dates); how a ruleset becomes Official; hot-seat or over the board until Phase 5; no conduct rules, the organizer announces them (D47). It shows the Official ruleset instead once one exists. Linked from every footer, the rules page, the builder note and the tournament invitation mail.
- Save game record / Open game record (Game panel, `game/record.ts`): JSON with ruleset id and version, overrides, turn order, moves, result, date; no names. Opening replays through the engine (S45 lookup) and refuses an illegal move or a mismatched result. Privacy page updated. 1460 tests pass.

## Next session
**S47 — Close the discussion** · Opus 5.5 · effort high · owner with Claude in chat
Why: the discussion closes 2026-11-15; S47 is the next step and cannot start before then.
Start with: `/start-session S47`

## Decisions in effect for the next step
- D47, D48, D49: decided in the ledger (defaults kept). D48: the ratified version stays 0.1.0. D49: no new discussion if Standard changes; re-check at both depths, then ratify.
- S50 (ratification) has no default; it stays blocked until the owner decides after the close.

## Open questions for the owner
- Nothing blocks S47 beyond the date. Option: S47 gives the owner the choice to ratify, change (S48), or extend.
- Carried over: Discussion form prefill check, the flag rule (decision 0013), `coast.openToAll` reading, I34 contact address, favicon and Ting Yang art.

## Notes for Claude
- When Standard becomes Official (S50): `Tournament.tsx` already names an Official 2-player ruleset when one exists; update its tests and the discussion copy then.
- A game record's custom ruleset is named by its id (the name is not stored). Records do not carry the opponent mode.
- A lock is never edited by hand. New version: `pnpm lock archive <id>`, edit the file, `pnpm lock write <id>`.
- Playwright works against `vite preview` on port 4173. Cloudflare Workers Builds deploys `main`.
