# Handoff

Updated 2026-11-01 by S79 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S77 merged (PR 69): `heavy-3p` at depth 3 is 24.5 / 24.8 / 50.7 (dark / light / Dragon) against 27.5 / 10.5 / 62.0 at depth 2. Light recovers to dark's level, the Dragon stays far over the band, so depth 2 misleads for 3 players (`docs/fairness/heavy-3p.depth3.md`, 149 games, a screen).
- S79 built D80 as data (decision 0022): `heavy-limited-3p` "Heavy-Handed Dragon, Limited" and `light-limited-3p` "Light-Handed Dragon, Limited", each 0.1.0 experimental = its base + `dragonHead.range` 4 (the Light Tail reads it too). No engine change. Tests: ruleset diffs, a Head and the Tail capped at 4, four recorded greedy games (`three-player-limited.json`); 2,622 tests green.
- Screens dispatched from Actions → **Sim depth 2** after the merge (see the PR thread / Actions list): depth 3 about 150 games, default order, of `light-3p`, `heavy-limited-3p`, `light-limited-3p`; 400 games at depths 1 and 2 of both Limited rulesets.

## Next session
**S80 — Collect and compare the Limited screens** · Opus 5.5 · effort medium
Why: commit the five-plus reports as in S77 and compare with S75 and `heavy-3p` depth 3.
Start with: `/start-session S80`

## Decisions in effect for the next step
- D80: decided (Heads move at most 4; both Heavy and Light; `light-3p` depth-3 baseline). D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S80. Carried over: the 3-player balance measure (depth 3 or higher), alternating the turn cycle's direction, a rule for the seat before the Dragon; the S74 readings (D76.1), the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- New ruleset files change the web ruleset list (alphabetical by file); run `pnpm rules:index` and update `session.test.ts`.
