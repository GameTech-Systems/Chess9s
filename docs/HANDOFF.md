# Handoff

Updated 2026-10-29 by S71 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S71 built the owner's S70 calls ([decision 0020](decisions/0020-three-player-coast-attacks.md), D70 to D74):
  - `coast.3p.attackFrom` (allowed, blocked): with blocked, a Coast piece on a Coast square captures nothing, gives no check and guards nothing, but still blocks. It's built with the new piece field `moveOnly`.
  - `turn.3p.order` (dark-light-dragon, dark-dragon-light).
  - `standard-3p` 0.3.0 = 0.2.0 + `coast.3p.attackFrom` blocked + `coast.3p.capturable` on (only Kings and Queens can enter the Coast, so only they capture there).
  - Checkmate only (D72) is the existing `dragon.3p.givesCheck` = true.
  - Registry 0.5.0. Good Practice and Easy Start are unchanged (D74).
- `standard-3p` 0.2.0 is archived with a lock (`pnpm lock keep`), and its S69 reports are renamed `docs/fairness/<report>@0.2.0`. The Standard end-table games and the bench positions were played again; the 0.2.0 games replay from `three-player-ends-before-s71.json`.
- The computer Dragon counts a piece as developed only off the Coast when attacks are blocked. The greedy Tail rates its ways out with `reachFrom`.
- `Sim depth 2` has `set` and `label` inputs. After the merge, S71 started the S72 screens on main (400 games, depths 1,2, 40 shards each). Labels and `set` values:
  - (none): `standard-3p`, the Coast rule.
  - `checkmate-only`: `coast.3p.attackFrom=allowed coast.3p.capturable=false dragon.3p.givesCheck=true`
  - `turn-order`: `coast.3p.attackFrom=allowed coast.3p.capturable=false turn.3p.order=dark-dragon-light`
  - `old-rules`: `coast.3p.attackFrom=allowed coast.3p.capturable=false` (the 0.2.0 baseline).

## Next session
**S72 — 3-player balance screens on the Coast rule** · Opus 5.5 · effort medium
Why: commit the four screens' reports and compare them; the owner then picks defaults.
Start with: `/start-session S72`. Read the S72 section of `docs/BUILD-PLAN.md` and decision 0020.

## Decisions in effect for the next step
- D70, D71, D74 (decided): the Coast rule is in `standard-3p` 0.3.0 only.
- D72, D73 (decided): checkmate only and dark → Dragon → light are options, screened alone.
- D60 (decision 0015): measures unchanged. Every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S72. Readings in decision 0020 (A5 counts as the Coast; a piece off the Coast may still capture onto it) are marked **(reading)**. Default: keep them.
- Carried over: the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65/S66), the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- The four screens run as separate workflow runs: download each `fairness-report-<name>` artifact. A full 2,000-game run of a variant is a new run with the same `set` and `label`; its merge picks up the committed `docs/fairness/<name>.json`.
- Pass the rules to `applyMove(position, move, rules)`, or a piece's `left` is not recorded.
