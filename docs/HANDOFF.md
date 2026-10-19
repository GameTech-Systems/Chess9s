# Handoff

Updated 2026-10-19 by S14 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. King, Rook, Bishop, Knight, Queen and Pawn are tested from data on the real board. Queen and Pawn: 90 hand-checked positions in `packages/engine/test/fixtures/positions/queen-pawn.json`, run by `packages/engine/src/rules/queen-pawn.test.ts`. 615 tests pass.
- Every parameter the Queen and Pawn read is set to each option in a case (`queen.canEnterVoid`, `queen.canEnterCoast`, `queen.voidCrossings`, `pawn.initialDoubleStep`, `pawn.canEnterCenter`, `pawn.promotion.targets`, `center.occupants`, `center.passThrough`); a coverage test fails if a piece starts reading another parameter or an option loses its case.
- `pawn.promotion.targets` option `captured-piece` now has the owner's meaning: any piece type the side has lost (not Kings or pawns); none lost means the pawn stays a pawn. The generator takes a `Lost` list (side id to piece ids) as an extra argument to `movesFrom` and `generateMoves`, and refuses with a `RulesError` when such a promotion comes up without it.
- Data fix: `rules/pieces/queen.json` now has a separate sideways move group that never crosses e5, as docs/RULES.md says (found by the `queen.canEnterVoid` cases).

## Next session
**S15 — Pieces, batch 3: Sun and Moon pawns and Dragons in 2-player** · Sonnet 5.5 · effort high
Why: next step in the plan; same shape as S13 and S14 (fixture positions at every option).
Start with: `/start-session S15`

## Decisions in effect for the next step
- D3, D6: decided; applied in rule set v0.2.
- D1: applied; pieces are unverified seeds in `rules/pieces/`.

## Open questions for the owner
- `captured-piece` readings I chose provisionally (docs/decisions/rules-decisions-2026-10-19.md, section 5): (a) listed together with other targets, the lost pieces are added to them; (b) the game state, not the engine, decides whether a restored piece cancels the loss; (c) lost Coast pieces (Sun, Moon, Dragon Heads) are valid targets, as you said "coast piece". Tell me if any is wrong.
- Tetrahedron size, Ting Yang art, Sun and Moon promotion (`sunMoon.canPromote`), and whether the 3-player Tail passes an empty e5 (default: yes), still open. None blocking S15.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may be invoked by Claude directly.
- Fixture expected moves come from an independent geometry script, not the engine; keep that habit.
- Not yet expressed as engine features: castling, en passant, pawn safe zones (`pawn.safeZones`), queen pawn swap (`queen.pawnSwap`), Coast opening and exits. The game state (S16/S17) must supply the `Lost` list.
- Web imports engine types only; no runtime values from `@chess9s/engine` in `apps/web`.
- Notation: `e2-e4`, `e5xd6`, `d8-d9=queen`. Output is sorted by notation.
- Prettier formats `packages/engine/test/fixtures/` and `apps/web/src`; it ignores `rules/`, `docs/`, `*.md`.
