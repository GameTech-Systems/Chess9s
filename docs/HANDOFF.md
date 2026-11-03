# Handoff

Updated 2026-11-03 by S84 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S84 built [decision 0023](decisions/0023-tail-range.md) as data: `tail.3p.range` (`same-as-heads` default, or 1 to 8) and the experimental `heavy-h3-3p` 0.1.0 (`heavy-3p` + `dragonHead.range` 3 + `tail.3p.range` 8). No engine change; no earlier ruleset's moves changed. 2,696 tests pass.
- The depth-3 screen of `heavy-h3-3p` (about 150 games, 30 shards, `set` `turn.3p.order=dark-light-dragon`, `label` `depth3`) is dispatched after the merge; see the log row for the run id if it was sent.
- Earlier depth-3 screens (dark / light / Dragon): `heavy-3p` 24.5 / 24.8 / 50.7; `heavy-limited-3p` 28.7 / 28.7 / 42.7; `heavy-limited3-3p` 35.6 / 41.9 / 22.5.

## Next session
**S85 — Collect the Tail-8 screen** · Sonnet 5.5 · effort medium
Why: collecting and committing a report is mechanical (S82 did the same on Sonnet), then the sweep follows decision 0023 item 4.
Start with: `/start-session S85`

## Decisions in effect for the next step
- D82: decided (decision 0023). Provisional readings: the name `tail.3p.range`, its default `same-as-heads`, about 150 games per screen (30 shards, default order, `label` `depth3`).
- D81, D80, D60 as before: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S85. The Tail is an enum (`same-as-heads`, 1 to 8) rather than an integer, so the default can follow the Heads; say if you would rather have a plain integer with a fixed default.
- Carried over: alternating the turn cycle's direction, a rule for the seat before the Dragon (both held as fallbacks); re-running shard 5 of run 41346778144 (moot, D82 item 9); the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- The Tail sweep uses the workflow's `set` input (`tail.3p.range=N`) on `heavy-h3-3p`, not new ruleset files. Dragon-first turn order stays a casual option (D82 item 7).
- A new parameter makes lock tests fail until `pnpm lock add-keys <id>[@version]` records it; new ruleset files need `pnpm rules:index` and `session.test.ts`. `pnpm worker:check` needs `pnpm build` first.
