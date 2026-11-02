# Handoff

Updated 2026-11-02 by S81 (Opus 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. The owner reviewed the S80 screens: the Dragon is still too strong. Owner's call (D81): one more Heavy-Handed screen with the Dragon Heads limited to 3 squares a move.
- Built as data: `heavy-limited3-3p` "Heavy-Handed Dragon, Limited to 3" 0.1.0 = `heavy-3p` + `dragonHead.range` 3 (the Tail reads the same parameter, so it is capped too). `heavy-limited-3p` (range 4) is unchanged. Tests, RULES.md, decision 0022 (D81).
- Screens dispatched on `main` after the merge (Actions → **Sim depth 2**): `heavy-limited3-3p` at depths `1,2`, 400 games, 20 shards; and depth `3`, 150 games, 30 shards, `set turn.3p.order=dark-light-dragon`, `label depth3`. Expect about 16 hours for the depth-3 run (S79's took 16–17).

Results to compare with (dark / light / Dragon):

| Ruleset | Depth 1 (400) | Depth 2 (400) | Depth 3 (~150) |
| --- | --- | --- | --- |
| `heavy-3p` | 36.6 / 28.6 / 34.8 | 27.5 / 10.5 / 62.0 | 24.5 / 24.8 / 50.7 |
| `heavy-limited-3p` | 44.5 / 32.5 / 23.0 | 38.3 / 13.6 / 48.1 | 28.7 / 28.7 / 42.7 |

## Next session
**S82 — Collect the Limited-to-3 screens** · Opus 5.5 · effort medium
Why: commit the two reports and add the comparison to decision 0022 once the runs finish.
Start with: `/start-session S82`

## Decisions in effect for the next step
- D81: decided (range 3, Heavy-Handed only). D80: range 4 rulesets kept. D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S82. Provisional: the Tail is capped at 3 too (as D80 item 2). Carried over: the 3-player balance measure (depth 3 or higher), alternating the turn cycle's direction, a rule for the seat before the Dragon; re-running shard 5 of run 41346778144 (light-limited 380 games); the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- New ruleset files change the web ruleset list (alphabetical by file); run `pnpm rules:index` and update `session.test.ts`.
