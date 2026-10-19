# Handoff

Updated 2026-10-19 by S16 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. Every piece type moves from data (S13 to S15). The engine now has attack maps, check, legal moves, checkmate and stalemate (`packages/engine/src/moves/check.ts`), plus turn order for any number of seats (`src/game/turns.ts`). 895 tests pass.
- Attacks use the same walk as moves (`attacksFrom` in `generate.ts`), so `king.range`, `king.canJump` and square rules shape them. A side is in check from any other side, the neutral Tail included, when the attacker's `givesCheck` holds. `gameStatus` reads `draw.stalemate` only when a stalemate happens.
- Fixtures: `test/fixtures/positions/check-mate.json` has 112 cases (each of the 18 positions at every `king.range` option, with `king.canJump`, `coastPieces.2p.giveCheck`, `tail.canCheck`, `tail.2p.canCapture` and `draw.stalemate` at every option) and 17 attack maps. The expected results come from an independent geometry script (not in the repo); the engine matched them on the first run.
- Board setups gain `turnOrder` (schema, `standard-9x9` 0.2.0): dark, light for 2 players; dark, light, Dragon for 3 players. `turn.firstMove` picks who starts. `nextSide` skips seats that are out.
- `parameterInteractions(registry, players)` lists pairs of parameters whose `affects` overlap, for the simulation harness.

## Next session
**S17 — Hot-seat game** · Sonnet 5.5 · effort high
Why: last Phase 1 step. It must build game state (opening the Coast, moving the Tail, the lost-piece list), which is about correctness, not just UI.
Start with: `/start-session S17`

## Decisions in effect for the next step
- D3, D6: decided; applied in rule set v0.2. D1: pieces are unverified seeds in `rules/pieces/`. D34: dark's seat view is turned 180°.

## Open questions for the owner
- Can a side use the Tail (when `tail.2p.canCapture` is on) to capture one of its own pieces? The engine lets the Tail capture any non-neutral piece. Default: allowed until you say otherwise. Not blocking S17, which keeps the default (no Tail captures).
- Promoting to a lost piece: if the restored piece leaves the lost list, can a second pawn promote to it again? Default: the game state removes it from the list once the piece is back on the board.
- Sun and Moon promotion targets, Tetrahedron size, Ting Yang art, and whether the 3-player Tail passes an empty e5 (default: yes) are still open.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions).
- S17 must supply what `legalMoves` and `gameStatus` take as inputs: `alsoMove: ['neutral']` only on turns when the Tail may move (the Coast is open and `tail.repeatLimit` allows it), and the `Lost` list. Coast pieces can't move until the Coast opens. Attacks treat the Coast as open, so decide whether a closed-Coast piece gives check: the rules say no Coast piece moves, which suggests no check.
- Not yet engine features: castling, en passant, pawn safe zones, queen pawn swap, Coast opening and exits, capture on the Coast, `tail.repeatLimit`, threefold repetition, the 50-move rule, insufficient material, and 3-player check and game end (a Coast piece's `givesCheck` names a 2-player parameter and is refused in 3-player games).
- `legalMoves` runs a full attack scan per move. That is fine for hot-seat play; the search AI step will want something faster.
- Web imports engine types only; no runtime values from `@chess9s/engine` in `apps/web`. Notation: `e2-e4`, `e5xd6`, `d8-d9=queen`.
