# Handoff

Updated 2026-11-02 by S80 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S80 collected the S79 screens (five reports in `docs/fairness/`, results table in decision 0022). Seats are dark / light / Dragon:

| Ruleset | Depth 1 (400) | Depth 2 (400) | Depth 3 (~150) |
| --- | --- | --- | --- |
| `heavy-3p` | 36.6 / 28.6 / 34.8 | 27.5 / 10.5 / 62.0 | 24.5 / 24.8 / 50.7 |
| `heavy-limited-3p` | 44.5 / 32.5 / 23.0 | 38.3 / 13.6 / 48.1 | 28.7 / 28.7 / 42.7 |
| `light-3p` | 55.8 / 32.9 / 11.4 | 22.5 / 4.8 / 72.8 | 22.8 / 16.0 / 61.2 |
| `light-limited-3p` | 55.9 / 33.6 / 10.5 (380) | 34.6 / 8.6 / 56.8 (380) | 23.6 / 20.3 / 56.1 |

- Range 4 lowers the Dragon clearly at depth 2 (Heavy 62.0 to 48.1, Light 72.8 to 56.8) but at depth 3 the drop is inside the intervals. `heavy-limited-3p` at depth 3 is the closest to 28–38% so far (dark 28.7, light 28.7, Dragon 42.7 [35.0–50.7]). At depth 1 Heavy overshoots (Dragon 23.0, dark 44.5). The light seat is still last at depth 2 in both. `light-limited-3p` stays far from the band at depth 3.
- The `light-limited-3p` depth 1 and 2 report has 380 games each: shard 5 of run 41346778144 lost its runner and the merge ran on 19 shards. "Re-run failed jobs" on that run would give 400. All are screens (D60).

## Next session
**S81 — Owner review of the Limited screens** · Opus 5.5 · effort medium
Why: the results need the owner's call (stop here, test more, or change a rule); Claude builds nothing unchosen.
Start with: `/start-session S81`

## Decisions in effect for the next step
- D80: decided (range 4, both Heavy and Light). D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S81. For S81: a larger depth-3 run of `heavy-limited-3p` (default: no, until you choose), a different range (only options 1 to 8 in the registry), or another lever. Carried over: the 3-player balance measure (depth 3 or higher), alternating the turn cycle's direction, a rule for the seat before the Dragon; the S74 readings (D76.1), the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- New ruleset files change the web ruleset list (alphabetical by file); run `pnpm rules:index` and update `session.test.ts`.
