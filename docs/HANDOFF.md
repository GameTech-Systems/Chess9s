# Handoff

Updated 2026-10-19 by S11 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. Move generator: `packages/engine/src/moves/generate.ts` (`generateMoves`, `movesFrom`, `startPosition`, `toNotation`). Pseudo-legal only; no piece-specific code.
- Position cases are data in `packages/engine/test/fixtures/positions/` (41 cases, expected lists worked out by hand). 219 tests pass.
- Semantics are documented in `docs/RULES-FRAMEWORK.md`, "Move generation".

## Next session
**S12 — Board renderer** · Sonnet 5.5 · effort medium
Why: next step in the plan; S13 to S15 wait for the real data (S10), and S12 can render the fixture.
Start with: `/model sonnet`, `/effort medium`, then `/start-session S12`
S10 (real board and pieces) is still an owner step in chat; its data must pass `pnpm validate:rules`.

## Decisions in effect for the next step
- D1: render the neutral fixture if S10 isn't done (default).
- Owner instruction (S11): Claude writes its plan in the reply and goes ahead without waiting for approval (CLAUDE.md, start-session skill).

## Open questions for the owner
- Provisional move-generator choices (S11). Say if any should change:
  1. When several square rules apply, any `false` wins (a move-level `stop: true` can't override a piece-level `stop: false`).
  2. `pass: false` ends the line on that square, but the piece may still stop there if stopping is allowed.
  3. Neutral pieces can be captured by any side when `capturable`.
  4. An empty promotion target list means no promotion.
- Still open from S8: an override set to null is rejected; an `extends` parent must have the same player count. Dependencies beyond D21: `ajv`, `ajv-formats` (MIT), `@types/*`, TypeScript ~6.0.
- None blocking S12.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may be invoked by Claude directly.
- Notation: `e2-e4`, `e5xd6`, `d8-d9=slider`. Output is sorted by notation.
- S16 (attack maps) should reuse `movesFrom` and not duplicate the movement rules.
- Prettier formats `packages/engine/test/fixtures/` (run `npx prettier --write` after editing fixtures); it ignores `rules/`, `docs/`, `*.md`.
