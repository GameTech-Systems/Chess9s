# Handoff

Updated 2026-11-03 by S82 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. The S81 screens of `heavy-limited3-3p` (Heads limited to 3) are committed in `docs/fairness/` with the comparison in decision 0022 (S82 section). All three runs have full game counts (400, 400, 149); none hit the cap.
- Range 3 overshoots: the Dragon falls to 15.3 / 32.8 / 22.5 (depths 1, 2, 3), dark leads at depths 1 and 2, light leads at depth 3. No depth has all three seats in the 28–38% band.

| Ruleset (dark / light / Dragon) | Depth 1 (400) | Depth 2 (400) | Depth 3 (~150) |
| --- | --- | --- | --- |
| `heavy-3p` | 36.6 / 28.6 / 34.8 | 27.5 / 10.5 / 62.0 | 24.5 / 24.8 / 50.7 |
| `heavy-limited-3p` (4) | 44.5 / 32.5 / 23.0 | 38.3 / 13.6 / 48.1 | 28.7 / 28.7 / 42.7 |
| `heavy-limited3-3p` (3) | 54.5 / 30.3 / 15.3 | 45.3 / 22.0 / 32.8 | 35.6 / 41.9 / 22.5 (149) |

## Next session
**S83 — Owner review of the Limited-to-3 screens** · Opus 5.5 · effort medium
Why: no build step is planned; the owner reads decision 0022 and chooses (range 4 or 3 kept, a range between, other rule changes, or stop screening), and Claude records it and plans the next steps.
Start with: `/start-session S83` (paste the owner's decision in the message)

## Decisions in effect for the next step
- D81: decided (range 3, Heavy-Handed only). D80: range 4 rulesets kept. D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- What next for the Limited Dragon: keep range 4 or 3, add a range between them (the registry has options 1 to 8, so 3 and 4 are the closest listed; no new option without you), or move on. No default; S83 waits for the answer.
- Carried over: the 3-player balance measure (depth 3 or higher), alternating the turn cycle's direction, a rule for the seat before the Dragon; re-running shard 5 of run 41346778144 (light-limited 380 games); the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- New ruleset files change the web ruleset list (alphabetical by file); run `pnpm rules:index` and update `session.test.ts`.
