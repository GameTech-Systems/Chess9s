# Handoff

Updated 2026-11-05 by S89 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Updated 2026-11-05 by S89 (Sonnet 5.5 · medium). S89 is docs only: the owner keeps `heavy-h3-3p` (Heads 3, Tail 8) as the default 3-player ruleset (done in S88; experimental, D60) and asked for more games toward decision 0015's 2,000-game rule.
- **Dispatched: run 41946060760** (Sim depth 2 on `main`): `heavy-h3-3p`, depth 3, 256 shards, **2,200 games** (10% over, for games a shard cannot finish in 5 h 40 min), `turn.3p.order=dark-light-dragon`, `label` `depth3-full`. Expect many hours: S86's 5-game shards took 1.4 to 4.5 hours, these have about 8.6. It replays seeds 1 to 2,200, so it replaces the 449-game run rather than adding to it.
- Earlier depth-3 results (dark / light / Dragon): `heavy-h3-3p` screen 33.7 / 35.3 / 31.0 (150 games) and confirming run 33.2 / 32.3 / 34.5 (449 games, intervals 29.0–37.7, 28.1–36.8, 30.3–39.0); `heavy-3p` 24.5 / 24.8 / 50.7; `heavy-limited-3p` 28.7 / 28.7 / 42.7; `heavy-limited3-3p` 35.6 / 41.9 / 22.5.
- The merge job can succeed with shards missing; the report's game count is the check.
- Owner (5 Nov 2026): depth 2 is misleading for 3-player games, so **depth 3 alone is the measure for now**; the 2,000-game rule is read at depth 3 and no depth-1 or -2 runs are wanted. The report's verdict will still say "incomplete" (it counts depths 1 and 2, decision 0015) until 0015 gets a version that names depth 3; that is a doc and sim-measure change for the owner to ask for.

## Next session
S90, collect run 41946060760 once it has finished: download `fairness-report-heavy-h3-3p.depth3-full`, check at least 2,000 games and every shard reporting, commit the report, add the result to decision 0023 as dark / light / Dragon. If short of 2,000, report the count and ask the owner before dispatching the missing seeds.
Start with: `/start-session S90`.

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
