# Handoff

Updated 2026-11-04 by S88 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- S88 applied the owner's decisions: `heavy-h3-3p` is the default 3-player ruleset (still experimental, D60) and `tail.3p.range` is an integer 1 to 8, default 8 (decision 0023, "Owner decision after the confirming run"). Four locks were edited by hand from `same-as-heads` to 8 with the owner's approval; the three Limited rulesets pin the Tail to their Heads' range.
- Phase 6. S87 collected the `heavy-h3-3p` confirming run (run 41701030465, 90 shards, **449** of 450 games, none capped): **33.2 / 32.3 / 34.5** dark / light / Dragon at depth 3, intervals 29.0–37.7, 28.1–36.8, 30.3–39.0. All point scores are inside the 28-38% band ([decision 0023](decisions/0023-tail-range.md)); the Dragon's interval ends just past it. Docs only, plus a test fix: `onlineStore.test.ts` passed no clock to `forgetSeat`, so it failed once its fixed date was 7 days old (CI red on S87).
- It agrees with the 150-game screen (33.7 / 35.3 / 31.0). The report's verdict reads "incomplete" because 449 games at depth 3 is below decision 0015's 2,000-game rule; 3-player rulesets stay experimental (D81, D60).
- Earlier depth-3 screens (dark / light / Dragon): `heavy-3p` 24.5 / 24.8 / 50.7; `heavy-limited-3p` 28.7 / 28.7 / 42.7; `heavy-limited3-3p` 35.6 / 41.9 / 22.5.

## Next session
No step is planned. The owner's brief opens the next one (for example a longer run of `heavy-h3-3p` at depth 3 toward the 2,000-game rule).
Start with: `/start-session S88` after a BUILD-PLAN entry exists.

## Decisions in effect for the next step
- D82: decided (decision 0023). Provisional readings: the name `tail.3p.range`, its default 8, about 150 games per screen, about 450 for the confirming run.
- D81, D80, D60 as before: every 3-player ruleset stays experimental.

## Open questions for the owner
- Carried over: alternating the turn cycle's direction, a rule for the seat before the Dragon (both held as fallbacks); re-running shard 5 of run 41346778144 (moot, D82 item 9); the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`. A shard that loses its runner still lets the merge job succeed, so check each report's game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- Dragon-first turn order stays a casual option (D82 item 7).
- A new parameter makes lock tests fail until `pnpm lock add-keys <id>[@version]` records it; new ruleset files need `pnpm rules:index` and `session.test.ts`. `pnpm worker:check` needs `pnpm build` first.
