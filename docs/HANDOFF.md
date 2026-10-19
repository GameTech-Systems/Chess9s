# Handoff

Updated 2026-10-19 by S10 (Opus 5.5 in chat · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. The real board and pieces are in: `rules/boards/standard-9x9.json` and 11 files in `rules/pieces/` (king, queen, rook, bishop, knight, pawn, light-dragon-head, dark-dragon-head, sun, moon, dragon-tail). All are unverified seeds from `docs/RULES.md` v0.2 and the owner's board images.
- The board format gained display-only `color` on squares and `view` on sides (decision 0007, "S10 additions"). `packages/engine/src/rules/standard-board.test.ts` checks the data, both start positions and every parameter the pieces read at every option. 367 tests pass.
- Each piece's `notes` lists the rules it doesn't express yet (engine features: Coast opening and exits, Tail repeat limit, capture on the Coast, castling, en passant, Queen-pawn swap, safe zones, 3-player check and stone).

## Next session
**S12 — Board renderer** · Sonnet 5.5 · effort medium
Why: next step in the plan, and it can now render the real board instead of the fixture.
Start with: `/model sonnet`, `/effort medium`, then `/start-session S12`

## Decisions in effect for the next step
- D1: applied; render `rules/boards/standard-9x9.json`.
- Square colors: use each square's `color`; unlisted squares are black or white, b1 black. Draw the Ting Yang symbol on i5 and an arrow on e5 pointing toward i5 (placeholders, no art).
- Seat views: light `rotate: 0`; Dragon `rotate: 270` (Coast at the bottom, rank 9 on the left). Dark has no view yet: use 0 until the owner says.

## Open questions for the owner
- Dark's view: turned 180° as in regular chess? Default: no view (renderer uses 0).
- Sun and Moon promotion (`sunMoon.canPromote`): to which pieces, and on which rank in 3-player games? Default: no promotion in the data.
- Does the e5 arrow carry a rule? Default: display only.
- Does the Dragon Tail in 3-player games pass over an empty e5 like a Dragon Head? Default: yes (no restriction in the data).
- None blocking S12.

## Notes for Claude
- Use `scripts/claude/ship.sh` (`gh pr` and `gh issue` fail in cloud sessions). `/end-session` may be invoked by Claude directly.
- Notation: `e2-e4`, `e5xd6`, `d8-d9=queen`. Output is sorted by notation.
- `givesCheck` on Coast pieces reads the 2-player parameter; 3-player check (`dragon.3p.givesCheck`) needs an engine feature before S32.
- Prettier formats `packages/engine/test/fixtures/` (run `npx prettier --write` after editing fixtures); it ignores `rules/`, `docs/`, `*.md`.
