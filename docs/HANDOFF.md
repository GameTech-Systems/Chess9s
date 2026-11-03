# Handoff

Updated 2026-11-03 by S85 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S85 collected the `heavy-h3-3p` depth-3 screen (run 41573587391, 30 shards, 150 games, none capped): **33.7 / 35.3 / 31.0** dark / light / Dragon, all inside the 28-38% band ([decision 0023](decisions/0023-tail-range.md)). Docs only; no engine change.
- The Tail sweep (4 to 7) is skipped: the Dragon is not above the band (D82 item 4). Item 5 applies: a confirming run of about 450 games at depth 3 before the owner decides.
- Earlier depth-3 screens (dark / light / Dragon): `heavy-3p` 24.5 / 24.8 / 50.7; `heavy-limited-3p` 28.7 / 28.7 / 42.7; `heavy-limited3-3p` 35.6 / 41.9 / 22.5.

## Next session
**S86 — Dispatch and collect the 450-game confirming run of `heavy-h3-3p`** · Sonnet 5.5 · effort medium
Why: mechanical, as S82 and S85. Dispatch the Sim depth 2 workflow (depth 3, about 450 games, default order, `label` `depth3-confirm`), collect in a later session, then the owner decides. (Needs a BUILD-PLAN entry; the owner may prefer to review the 150-game result first.)
Start with: `/start-session S86`

## Decisions in effect for the next step
- D82: decided (decision 0023). Provisional readings: the name `tail.3p.range`, its default `same-as-heads`, about 150 games per screen, about 450 for the confirming run.
- D81, D80, D60 as before: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S86. The Tail is an enum (`same-as-heads`, 1 to 8) rather than an integer, so the default can follow the Heads; say if you would rather have a plain integer with a fixed default.
- Carried over: alternating the turn cycle's direction, a rule for the seat before the Dragon (both held as fallbacks); re-running shard 5 of run 41346778144 (moot, D82 item 9); the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- The Tail sweep uses the workflow's `set` input (`tail.3p.range=N`) on `heavy-h3-3p`, not new ruleset files. Dragon-first turn order stays a casual option (D82 item 7).
- A new parameter makes lock tests fail until `pnpm lock add-keys <id>[@version]` records it; new ruleset files need `pnpm rules:index` and `session.test.ts`. `pnpm worker:check` needs `pnpm build` first.
