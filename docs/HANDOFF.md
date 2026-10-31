# Handoff

Updated 2026-10-31 by S72 (Opus 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. The four S72 screens are committed (400 games each, depths 1 and 2, `docs/fairness/standard-3p.md`, `standard-3p.checkmate-only`, `.turn-order`, `.old-rules`). Seat scores, dark / light / Dragon, band 28–38%:

  | Screen | Depth 1 | Depth 2 |
  | --- | --- | --- |
  | Old rules (0.2.0) | 31.9 / 37.3 / 30.9 | 23.6 / 5.9 / 70.5 |
  | Coast rule (0.3.0) | 54.0 / 37.5 / 8.5 | 45.8 / 34.9 / 19.4 |
  | Checkmate only | 31.1 / 24.5 / 44.4 | 23.8 / 6.6 / 69.6 |
  | Turn order dark → Dragon → light | 37.4 / 30.5 / 32.1 | 5.6 / 69.8 / 24.6 |

- Reading: the old-rules screen matches S69 (Dragon 71.4% at depth 2), so the screens are sound. None passes alone at depth 2, so no full 2,000-game run. The Coast rule is the only lever that breaks the Dragon (King captured far less often: light's King captured in 99 of 400 depth-2 games, from 261 under the old rules), but it overshoots at depth 1 (Dragon 8.5%) and dark leads. Checkmate only changes little. The turn order moves the collapse from light to dark: the seat that answers the Dragon second loses.
- Engine fix: with Dragon check on, one move could checkmate two Kings; the first put dark out and the second, by dark's King, read an empty square. Later checkmates are now judged again on the position the first left (`three.ts`, settleMove). Only `dragon.3p.givesCheck` = true outside the duel reaches it. The checkmate-only screen was run again after the fix (run 17, this branch).

## Next session
**S73 — Owner review of the S72 screens** · Opus 5.5 · effort medium
Why: no lever passes alone; the owner picks what to combine or change next.
Start with: `/start-session S73`. Read the S73 section of `docs/BUILD-PLAN.md` and this table.

## Decisions in effect for the next step
- D70 to D74 (decided, decision 0020). D60 (decision 0015): measures unchanged; every 3-player ruleset stays experimental.

## Open questions for the owner
- What to screen next. Default if unanswered: the Coast rule with the turn order (`standard-3p` with `turn.3p.order=dark-dragon-light`), then the Coast rule with checkmate only, 400 games each.
- Carried over: the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- `gh` had an invalid token in S72: `scripts/claude/ship.sh` failed, so the PR went through the GitHub connector. Artifacts download through the connector's download link with `curl`.
- A screen is a `Sim depth 2` run with `set` and `label`; a combination is one run with every `set` pair.
