# Handoff

Updated 2026-11-01 by S75 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. `heavy-3p` and `light-3p` 0.1.0 (experimental, playable) are screened: six 400-game `Sim depth 2` runs (D78) committed to `docs/fairness/` (`<ruleset>.md/.json`, `.light-dragon-dark`, `.dragon-dark-light`). No capped games.
- None screens inside 28–38% for every seat at both depths, so no full 2,000-game run was started (D78).
- Seat scores (dark / light / Dragon), depth 1 then depth 2:

| Ruleset · order | Depth 1 | Depth 2 |
| --- | --- | --- |
| heavy · dark-light-dragon | 36.6 / 28.6 / 34.8 | 27.5 / 10.5 / 62.0 |
| heavy · light-dragon-dark | 33.4 / 31.4 / 35.3 | 10.0 / 59.5 / 30.5 |
| heavy · dragon-dark-light | 37.6 / 34.3 / 28.1 | 60.8 / 27.9 / 11.4 |
| light · dark-light-dragon | 55.8 / 32.9 / 11.4 | 22.5 / 4.8 / 72.8 |
| light · light-dragon-dark | 32.8 / 9.9 / 57.4 | 5.8 / 73.0 / 21.3 |
| light · dragon-dark-light | 12.8 / 52.4 / 34.9 | 69.0 / 26.3 / 4.8 |

- Reading: Heavy-Handed is near the band at depth 1 in all three orders (best: dragon-dark-light, 37.6/34.3/28.1), but at depth 2 one seat falls to 10–11% in each order (light 10.5, dark 10.0, Dragon 11.4) while another takes about 60%: depth 2 turns the balance over. Light-Handed is far off at both depths (Dragon 4.8–72.8%). Draws are 26–36% of games.

## Next session
**S76 — Owner review of the S75 screens** · Opus 5.5 (chat) · effort medium
Why: the owner reads the six screens and picks what comes next, as in S73; Claude builds nothing unchosen.
Start with: `/start-session S76`

## Decisions in effect for the next step
- D60: every 3-player ruleset stays experimental. D78 applied: no full runs (none inside the band at both depths).

## Open questions for the owner
- Which ruleset or lever to take forward after the screens (S76).
- S74 readings (provisional): the lost turn is part of `tail.3p.stone` = where-it-stands, so it applies if that option is set under the full rules; a captured Tail with where-it-stands stays and the capturing piece doesn't move; `pieces-only` also requires `tail.capturable` off (D76.1).
- Carried over: the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports came from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`.
- The GitHub connector failed to connect in S74 and S75; `scripts/claude/ship.sh` uses `gh api`.
