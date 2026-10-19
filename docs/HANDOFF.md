# Handoff

Updated 2026-10-19 by S22 (Sonnet 5.5 · low). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. The game screen has an "Opponent" switch (Hot-seat / Computer). Against the computer, the player has the side that moves first and the computer replies at random (`game/bot.ts`) after 0.5 s; Undo takes back both moves. The game in progress is kept in `localStorage` (`game/guest.ts`: ruleset id and version, mode, moves; replayed through the engine on load; "New game" clears it). Lint, typecheck, `validate:rules`, build and 998 tests pass.
- Not checked in a browser: the bot delay and the restore on reload (tests render to markup).

## Next session
**S23 — Computer opponent v1** · Opus 5.5 · high
Why: next Phase 2 step; needs the speed task and the owner's call on the proposed draw-rules step below.
Start with: `/start-session S23`

## Proposed Phase 2 changes (for the owner's plan review)
- **Insert an engine step before S23: the missing 2-player rules** (threefold repetition, 50-move, insufficient material, castling, en passant, pawn safe zones, owner-listed Coast rules). Without draw rules, bot self-play (S24) may never end. Suggested: Opus 5.5 · high.
- **S23 / S22:** `playMove` takes about 6.5 ms (a full legal scan). Start S23 with a speed task (incremental attack maps); S22's random mover is fine.
- **S27:** the web bundle includes Ajv (130 kB gzip), which uses `new Function`; a strict CSP needs a pre-resolved ruleset.

## Decisions in effect for the next step
- D3, D6: applied in rule set v0.2. D1: pieces are unverified seeds. D34: dark's view is turned 180°. D36: tetrahedron on e5.

## Open questions for the owner
- Provisional (S22): against the computer the player has the first-moving side (Dark) and there is no side choice; the computer is a uniform random mover. A saved guest game is dropped if the ruleset version changes.
- Provisional (S21): sounds are synthesized with Web Audio (no CC0 files); say if you want recorded CC0 sounds. The rules dialog links to docs/RULES.md rather than restating rules.
- Provisional (S20): danger indicator off by default; undo takes back one move at a time with no limit. Defaults kept unless told otherwise.
- Keep the option `tail.2p.canCapture`? Default: kept; when on, the Tail takes only the other side's pieces.
- Is a closed Coast closed to Kings and Queens too? Default: yes. Confirm the opener's exception (a5-e5, then e5-i5 on the very next turn only). Default: as written.
- 3-player: "the Dragon could use a Coast piece to check from A5 only" vs RULES.md "Dragon pieces don't check". Default: not built, no change.
- Sun and Moon promotion targets, Tetrahedron size, Ting Yang art, and whether the 3-player Tail passes an empty e5 (default: yes) are still open.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- The hot-seat fixture `packages/engine/test/fixtures/games/hot-seat-mate.json` uses `x` for captures in its notation (`c5xb3`).
