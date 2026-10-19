# Handoff

Updated 2026-10-19 by S13 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. King, Rook, Bishop and Knight are tested from data on the real board: 91 hand-checked positions in `packages/engine/test/fixtures/positions/standard-pieces.json`, run by `packages/engine/src/rules/standard-pieces.test.ts`. 505 tests pass.
- Every parameter these pieces read (`king.range` 1-4, `king.canJump`, `king.canEnterCoast`, `center.occupants`, `center.passThrough` per option) is set to each option in a case; a coverage test fails if a piece starts reading another parameter or an option loses its case.
- No engine or piece data changed: the S10 seeds and S11 generator already behaved as docs/RULES.md says. Expected moves come from plain geometry, not the engine.
- Behavior the tests now pin: `king.canJump` ignores `center.passThrough` and an occupied e5 (jumps ignore no-passing, decision 2026-10-19). Rooks, Bishops and Knights cannot capture on e5 or the Coast.

## Next session
**S14 — Pieces, batch 2: Queen and Pawn** · Sonnet 5.5 · effort high
Why: next step in the plan; the Queen (void, Coast gateways) and Pawn parameters are the remaining standard-ish pieces.
Start with: `/model sonnet`, `/effort high`, then `/start-session S14`

## Decisions in effect for the next step
- D2: decided; promotion targets queen, rook, bishop, knight.
- D1: applied; pieces are unverified seeds in `rules/pieces/`.

## Open questions for the owner
- `pawn.promotion.targets` has an option `captured-piece` with no description. The generator would emit a bogus `=captured-piece` move. Default for S14: refuse with a RulesError when a promotion happens under that option (never guess a meaning), and record it. What does it mean (the piece just captured, or any piece the side has lost)?
- Tetrahedron size (phi/2 of a square, provisional), Ting Yang art, Sun and Moon promotion (`sunMoon.canPromote`), and whether the 3-player Tail passes an empty e5 (default: yes), all still open from S12.
- None blocking S14.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may be invoked by Claude directly.
- Not yet expressed as engine features: castling (`castling.enabled`), en passant, pawn safe zones, queen pawn swap, Coast opening and exits. S14 covers Queen and Pawn movement only.
- Web imports engine types only; no runtime values from `@chess9s/engine` in `apps/web`.
- Notation: `e2-e4`, `e5xd6`, `d8-d9=queen`. Output is sorted by notation.
- Prettier formats `packages/engine/test/fixtures/` and `apps/web/src`; it ignores `rules/`, `docs/`, `*.md`.
