# Handoff

Updated 2026-10-19 by S12 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. `apps/web` renders the real board (`rules/boards/standard-9x9.json`): all 81 squares, every special square type, edge coordinates, the 2- or 3-player start position as placeholder discs (letter from each piece's data), Ting Yang placeholder on i5 (turns 90° cw in 3-player), and a tetrahedron symbol on e5 (D36, replaces the arrow). A small `App` switches players (2/3) and seat (light, dark, Dragon). Checked at 1280 px and 375 px: no horizontal scroll.
- View logic is pure and tested in `apps/web/src/board/view.ts`; the SVG is `Board.tsx`. 402 tests pass.
- Board data is now version 0.1.1: dark has `view: {rotate: 180}` (D34).

## Next session
**S13 — Pieces, batch 1: King and the standard-movement pieces** · Sonnet 5.5 · effort high
Why: next step in the plan; the board and move generator are both in.
Start with: `/model sonnet`, `/effort high`, then `/start-session S13`

## Decisions in effect for the next step
- D1: applied; pieces are the unverified seeds in `rules/pieces/`.
- D34: decided; dark view turned 180°. D36: decided; e5 symbol is a tetrahedron, no rule.

## Open questions for the owner
- Tetrahedron size: base side is phi/2 of a square (provisional; "phi significant" was the brief). Is another phi relation intended?
- Ting Yang symbol is a plain placeholder (ring, dot, pointer). Art comes from the owner.
- Sun and Moon promotion (`sunMoon.canPromote`): to which pieces, and on which rank in 3-player games? Default: no promotion in the data.
- Does the Dragon Tail in 3-player games pass over an empty e5 like a Dragon Head? Default: yes.
- None blocking S13.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may be invoked by Claude directly.
- Web imports engine types only. Don't import runtime values from `@chess9s/engine` in `apps/web` (it pulls Ajv into the bundle; the bundle is 248 kB without it).
- The board data lists only the 29 special squares; the renderer fills the other 52 as checkered.
- Notation: `e2-e4`, `e5xd6`, `d8-d9=queen`. Output is sorted by notation.
- Prettier formats `packages/engine/test/fixtures/` and `apps/web/src`; it ignores `rules/`, `docs/`, `*.md`.
