# Handoff

Updated 2026-10-31 by S76 (Opus 5.5 · chat · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S76 done in chat: the owner reviewed the S75 screens and chose D79 (a depth-3 screen before any rule change).
- Correction: S75's table copied four rows in the reports' turn-order column order. Seat scores, dark / light / Dragon, depth 1 then depth 2:

| Ruleset · order | Depth 1 | Depth 2 |
| --- | --- | --- |
| heavy · dark-light-dragon | 36.6 / 28.6 / 34.8 | 27.5 / 10.5 / 62.0 |
| heavy · light-dragon-dark | 35.3 / 33.4 / 31.4 | 30.5 / 10.0 / 59.5 |
| heavy · dragon-dark-light | 34.3 / 28.1 / 37.6 | 27.9 / 11.4 / 60.8 |
| light · dark-light-dragon | 55.8 / 32.9 / 11.4 | 22.5 / 4.8 / 72.8 |
| light · light-dragon-dark | 57.4 / 32.8 / 9.9 | 21.3 / 5.8 / 73.0 |
| light · dragon-dark-light | 52.4 / 34.9 / 12.8 | 26.3 / 4.8 / 69.0 |

- Reading: at depth 2 light is last in all six (Dragon takes light's King 216–293 times per 400 games, dark's 72–83). Every clockwise order seats light just before the Dragon; S72's reversed order moved the collapse to dark (`standard-3p.turn-order` 5.6 / 24.6 / 69.8 against `.old-rules` 23.6 / 5.9 / 70.5). It follows the seat, not the color. At depth 1 the seat after the Dragon loses its King more, so the depth-2 search horizon (a seat's move and the next seat's reply, never the third seat's) likely drives much of it.

## Next session
**S77 — Depth-3 diagnostic screen of Heavy-Handed Dragon** · Opus 5.5 · effort medium
Why: tells the search horizon from the seat itself (D79). The workflow run is dispatched from chat; S77 collects the report, commits it and compares it with `heavy-3p` at depth 2.
Start with: `/start-session S77`

## Decisions in effect for the next step
- D79: depth-3 screen first, no rule change. D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- After S77 (S78): the 3-player balance measure, alternating the turn cycle's direction, or a rule for the seat before the Dragon.
- Carried over: the S74 readings (D76.1), the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from the workflow artifacts (`fairness-report-<name>`); `gh api repos/.../actions/artifacts/<id>/zip`.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
