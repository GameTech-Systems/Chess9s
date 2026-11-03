# Handoff

Updated 2026-11-03 by S83 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S83 recorded the owner's D82 in [decision 0023](decisions/0023-tail-range.md): depth 3 is the 3-player balance measure (no more depth 1 and 2 screens), the Tail gets its own range, Light-Handed is dropped from simulations. Docs only; nothing built. 2,632 tests pass.
- Latest screens (dark / light / Dragon, depth 3): `heavy-3p` 24.5 / 24.8 / 50.7; `heavy-limited-3p` (4) 28.7 / 28.7 / 42.7; `heavy-limited3-3p` (3) 35.6 / 41.9 / 22.5 (149 games).

## Next session
**S84 — Tail range parameter and `heavy-h3-3p`** · Sonnet 5.5 · effort medium
Why: build `tail.3p.range` (options 1 to 8, default = `dragonHead.range`) and the experimental `heavy-h3-3p` (`heavy-3p` + Heads 3 + Tail 8), with tests, then dispatch the depth-3 screen.
Start with: `/start-session S84`

## Decisions in effect for the next step
- D82: decided (decision 0023). Provisional readings: the parameter name `tail.3p.range`, its default, and about 150 games per screen (30 shards, default order, `label` `depth3`).
- D81, D80, D60 as before: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S84. After S85 the owner picks from the Tail screens and the 450-game confirming run.
- Carried over: alternating the turn cycle's direction, a rule for the seat before the Dragon (both held as fallbacks); re-running shard 5 of run 41346778144 (light-limited, now moot, D82 item 9); the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- New ruleset files change the web ruleset list (alphabetical by file); run `pnpm rules:index` and update `session.test.ts`.
- Tail sweep (S85) uses the workflow's `set` input (`tail.3p.range=N`), not new ruleset files. Dragon-first turn order stays a casual option (D82 item 7).
