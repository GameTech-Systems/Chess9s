# Handoff

Updated 2026-10-19 by S15 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. Every piece type now moves from data on the real board in 2-player: King, Rook, Bishop, Knight, Queen, Pawn (S13/S14) and Sun, Moon, both Dragon Heads and the Dragon Tail (S15). 725 tests pass.
- S15 fixtures: 87 hand-checked positions in `packages/engine/test/fixtures/positions/sun-moon-dragons.json`, run by `packages/engine/src/rules/sun-moon-dragons.test.ts`. They set `sunMoon.range`, `sunMoon.firstMoveDouble`, `sunMoon.capture`, `dragonHead.range`, `dragon.canJump`, `coast.returnAllowed`, `tail.2p.path`, `tail.2p.canCapture`, `tail.capturable`, `center.occupants` and `center.passThrough` to each option. The Coast is treated as open in them. A coverage test fails if a piece starts reading a parameter nobody tests.
- `dragons.2p.mode` (deprecated, D3): tested as refused as an override and read by no piece. `sunMoon.canPromote`: no piece reads it and Sun/Moon never promote at either value (provisional test; see questions).
- No engine or piece-data changes were needed; the independent geometry agreed on the first run.
- Your answers on `captured-piece` are recorded in `docs/decisions/rules-decisions-2026-10-19.md`, section 5.

## Next session
**S16 — Attack maps, check, checkmate, stalemate** · Opus 5.5 · effort high
Why: next step in the plan; check design needs the most care, and the Coast pieces' check flags (`coastPieces.2p.giveCheck`, `tail.canCheck`) land here.
Start with: `/start-session S16`

## Decisions in effect for the next step
- D3, D6: decided; applied in rule set v0.2. D1: pieces are unverified seeds in `rules/pieces/`.

## Open questions for the owner
- Answered 19 Oct (see rules-decisions section 5 and 6): promoting to a lost piece removes it from the list; Sun/Moon promotion targets given (not built); tetrahedron size and 3-player Tail over e5 confirmed. Still open: Ting Yang art (no content given).

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may be invoked by Claude directly.
- Fixture expected moves come from an independent geometry script, not the engine; keep that habit. The S15 script is not in the repo.
- Not yet expressed as engine features: castling, en passant, pawn safe zones, queen pawn swap, Coast opening (`coast.2p.initiation`), exits and capture on the Coast, `tail.repeatLimit`, either player moving the Tail, 3-player check and the Tail as the Dragon's King. The game state (S16/S17) must supply the `Lost` list.
- Web imports engine types only; no runtime values from `@chess9s/engine` in `apps/web`.
- Notation: `e2-e4`, `e5xd6`, `d8-d9=queen`. Output is sorted by notation. The Tail's side is `NEUTRAL`.
- Prettier formats `packages/engine/test/fixtures/` and `apps/web/src`; it ignores `rules/`, `docs/`, `*.md`.
