# Handoff

Updated 2026-10-19 by S22a (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. Every rule draft-2p switches on is now built (`unbuiltFeatures` is empty at the defaults; only `queen.pawnSwap` and `setup.swapKingQueen` remain). This includes en passant, castling (`f1-h1/i1-g1`; in the web game, click the King and then the Rook), pawn-safe zones, `coast.2p.exit` and `coast.2p.capturable`, and the draws: insufficient material, threefold repetition and fifty moves.
- All of it is data. New fields: square rules `capturable`/`outside`/`owner`/`homeFile`, moves `passable`/`inPassing`, pieces `castle`/`irreversible`, and `PlacedPiece.home` (decision 0007, S22a additions). Tests: `special-rules.test.ts`, `draws.test.ts`.
- `playMove` takes about 0.7 ms (was 0.6 ms). Four bot-vs-bot games at 300 nodes all ended: 2 mates, a fifty-move draw and a repetition draw. 1165 tests pass.

## Next session
**S24 — Simulation harness and fairness report** · Opus 5.5 · effort high
Why: games now end, so self-play can measure seat balance (D12).
Start with: `/start-session S24`

## Proposed Phase 2 changes
- **S25 or S27:** move the search to a Web Worker (the page is blocked about 0.4 s per computer move).
- **S27:** the web bundle includes Ajv (130 kB gzip), which uses `new Function`; a strict CSP needs a pre-resolved ruleset.

## Decisions in effect for the next step
- D12: first-player score 47–53% over at least 2,000 games at two depths (default). D3, D6 applied in v0.2. D1: pieces are unverified seeds.

## Open questions for the owner
- Provisional (S22a): insufficient material = no piece but a King could give check. Chess's lone Bishop or Knight is not counted, since nobody has shown it can't mate on this board. Default: as built.
- Provisional (S22a): draws by repetition and fifty moves are automatic, not claimed. Default: automatic.
- Provisional (S22a): en passant is always on, with no parameter. Add `pawn.enPassant`? Default: no.
- Provisional (S22a): `pawn.safeZones = any-colored-square` means any colored square on the opponent's half. Default: yes.
- Provisional (S22a): `coast.2p.exit` and `coast.2p.capturable` apply to Coast pieces only, not to Kings or Queens on the Coast. Default: yes.
- Earlier, still open: the computer's heuristics and 800 nodes (S23); the player has Dark against the computer (S22); danger indicator off, undo unlimited (S20); keep `tail.2p.canCapture`; is a closed Coast closed to Kings and Queens; the opener's Tail exception; 3-player check from A5; the Sun and Moon promotion targets, the Tetrahedron and the 3-player Tail.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- Quick benchmarks outside Vitest: `node node_modules/.pnpm/rolldown@*/node_modules/rolldown/bin/cli.mjs x.ts --platform node --format esm --file x.mjs`. Vitest hides `console.log`.
- `newGame` with only Kings (plus the Tail) is drawn at once. Tests that need such positions set `draw.insufficientMaterial: false`.
