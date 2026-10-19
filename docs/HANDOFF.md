# Handoff

Updated 2026-10-19 by S17 (Sonnet 5.5). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1 is built. `apps/web` plays a 2-player hot-seat game on draft-2p: click a piece to see its legal moves, click a target to move, pick a promotion piece, check/checkmate/stalemate end the game. 970 tests pass. An 80-move game to checkmate was also clicked through in Chromium with no console errors (Playwright script is not in the repo).
- `packages/engine/src/game/game.ts` is the game state: `newGame`, `playMove`, `findMove`, `gameRecord` (ruleset id and version, moves, result), `unbuiltFeatures`. It supplies `alsoMove`, `lost`, `allow`, `inert` and `lifts` to `legalMoves`/`gameStatus`. See RULES-FRAMEWORK, "Game state".
- Owner answers applied (decisions record, section 6): the Tail never captures a piece of the side moving it; Coast pieces give no check while the Coast is closed (they still block).
- The Coast is closed to every piece until the Tail lands on e5; the Tail follows `tail.repeatLimit`, with the opener's e5-to-i5 exception. A promotion removes one matching piece from the lost list.
- Fixture `packages/engine/test/fixtures/games/hot-seat-mate.json`: a full game to checkmate found by self-play (regression only, not independent geometry).
- The screen lists the rules it does not play yet ("Not in this build yet"): en passant, pawn-safe zones, and the three other draws at their defaults.

## Next session
**S18 — Phase 1 review** · Opus 5.5 · effort medium
Why: Phase 1 exit. Run everything, remove dead code, update docs, and propose Phase 2 changes.
Start with: `/start-session S18`

## Decisions in effect for the next step
- D3, D6: applied in rule set v0.2. D1: pieces are unverified seeds. D34: dark's view is turned 180°. D36: tetrahedron on e5.

## Open questions for the owner
- Answered 19 Oct 2026 (decisions record, section 7): `tail.2p.canCapture` stays as an option, off by default; the closed Coast is closed to Kings and Queens too. No code change needed.
- Confirm the opener's exception (a5-e5, then e5-i5 on the very next turn only). Default: as written.
- 3-player: Coast pieces give check only from A5 until they have emerged (needs an `emerged` marker per piece when 3-player is built). Did "emerge at E5" mean A5 (RULES.md)? And does this replace "Dragon pieces don't give check to Kings"? Default: A5; not built.
- Sun and Moon promotion targets, Tetrahedron size, Ting Yang art, and whether the 3-player Tail passes an empty e5 (default: yes) are still open.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- The web now imports engine runtime values (resolve and validate rules at start), so Ajv is in the bundle (130 kB gzip). Ajv builds code with `new Function`; a strict CSP would need a pre-resolved ruleset.
- `playMove` takes about 6.5 ms (a full legal scan). Fine for hot-seat; the search AI needs faster attack maps.
- Not engine features yet: castling, en passant, pawn safe zones, queen pawn swap, leaving the Coast by A5 only, no capture on the Coast, swapped King and Queen, threefold repetition, the 50-move rule, insufficient material, and 3-player check and game end (`newGame` refuses 3 players).
- No component tests click the board (no DOM library). S18 could add an e2e test if a Playwright dependency is approved.
