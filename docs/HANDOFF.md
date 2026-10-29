# Handoff

Updated 2026-10-29 by S69 (Opus 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. S69 committed the 3-player balance reports on the A5 Coast exit (decision 0019), from the owner's `Sim depth 2` runs on main at `dc1f7f9`: `standard-3p` 0.2.0 at depths 1 and 2 (2,000 games each), its 40-game sweep, the greedy-Dragon run, and the `draft-3p` 0.4.0 and `easy-3p` 0.2.0 screens (400 games). They are the plain `docs/fairness/<report>.*` files; the 0.1.0 ones stay as `<report>@<version>`.
- Comparison with 0.1.0 (same seeds), seat scores dark / light / Dragon:
  - Depth 1: 32.6 / 36.7 / 30.7% (was 26.3 / 38.3 / 35.4%). **Every seat is in the 28–38% band now.**
  - Depth 2: 22.9 / 5.7 / 71.4% (was 21.2 / 3.0 / 75.7%). **Light still collapses**: its King is captured in 1,331 of 2,000 games (was 1,528); the Dragon wins 1,366, 860 of them by King capture. Verdict still fail.
  - Sweep (depth 1, 40 games): `coast.3p.exit=a5-always` 46 / 34 / 20%, `any-legal-move` 26 / 54 / 20% (flagged, light); 12 combinations flagged, `dragon.canJump=true` the strongest for the Dragon (64–89%).
  - Screens: Good Practice 44 / 45 / 11% (was 48 / 42 / 10%); Easy Start 72 / 28 / 0% (was 71 / 28 / 2%), 11 plies on average. Greedy Dragon 17 / 42 / 41% (was 20 / 41 / 39%).
- So the A5 exit fixed depth 1 but not depth 2: at depth 2 the Dragon still takes Light's King, and the exit is not the cause.

## Next session
**S70 — 3-player defaults after the A5 runs** · Opus 5.5 · effort high · owner in chat
Why: the numbers are in; the owner decides the 3-player defaults, as in S61.
Start with: `/start-session S70`. Read the S70 section of `docs/BUILD-PLAN.md`, `docs/fairness/standard-3p.md` and decisions 0015 and 0019.

## Decisions in effect for the next step
- Decision 0019 (owner): the A5 exit is the 3-player default; `any-legal-move` is an option.
- D60 (decision 0015): measures unchanged. Every 3-player ruleset stays experimental.

## Open questions for the owner
- The 3-player defaults given the depth-2 result (light 5.7%). Default: keep the presets experimental as they are, as at S61.
- Easy Start keeps the A5 exit, as written. Default: keep it. (Its Dragon still scores 0%.)
- Carried over: the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65/S66), the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- A new `Sim depth 2` merge for `standard-3p` now picks up `docs/fairness/standard-3p.json` (0.2.0); a run on another version is refused, so rename the file to `@<version>` first, as S68 did.
- Pass the rules to `applyMove(position, move, rules)`, or a piece's `left` is not recorded.
