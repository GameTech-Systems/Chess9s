# Handoff

Updated 2026-10-19 by S9 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. Board and piece formats exist: `rules/schema/board.schema.json`, `rules/schema/piece.schema.json`, decision 0007, documented in `docs/RULES-FRAMEWORK.md`.
- `packages/engine/src/rules/formats.ts`: `validateBoard`, `validatePiece`, `validateBoardAndPieces` (cross-checks beyond the schema). Neutral fixture in `packages/engine/test/fixtures/` (board, 5 pieces, own registry).
- `validate:rules` also checks `rules/boards/` and `rules/pieces/` when present (`--boards`, `--pieces`). 166 tests pass.
- `main` ruleset is active (PR, `ci` check, rebase only, no force-push or deletion).

## Next session
**S11 — Move generator** · Opus 5.5 · effort high
Why: correctness-critical engine core; it runs on the neutral fixture, so it need not wait for S10.
Start with: `/model opus`, `/effort high`, then `/start-session S11`
S10 (real board and pieces) is an owner step in chat and can happen any time; its data must validate with `pnpm validate:rules`.

## Decisions in effect for the next step
- D1: formats built against the neutral fixture; real data arrives in S10 (default).
- Owner confirmed: Knights are never stopped from passing the center, so `knight` in `center.passThrough` has no effect (leapers cross no squares).
- Owner accepts lowercase coordinates in data (`e5`); docs keep uppercase.

## Open questions for the owner
- Provisional loader choices (S8): an override set to null is rejected; an `extends` parent must have the same player count. Say if either should change.
- Dependencies beyond the D21 list (S8): `ajv`, `ajv-formats` (MIT) in `packages/engine`; `@types/*`; TypeScript ~6.0.
- None blocking S11.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may now be invoked by Claude directly.
- Move semantics for S11 are in decision 0007 and RULES-FRAMEWORK: vectors are relative to the side's forward; square rules apply to every stepped-through square, even when jumping; `targets` moves ignore squares in between.
- Not yet in the format (add as minor schema versions when built): en passant, castling, pawn swap, safe zones, Coast opening, Tail repeat limit, stone, capture-by-class, per-mode royal, setup variants.
- Prettier ignores `rules/`, `docs/`, `*.md`; engine fixtures are formatted by Prettier.
