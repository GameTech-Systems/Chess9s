# Handoff

Updated 2026-10-20 by S24 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. `packages/sim` plays the engine search against itself on worker threads and writes fairness reports (JSON and Markdown) to `docs/fairness/`: `pnpm sim [--games --depths --sweep --set id=value --report file]`. The measures are decision 0008 (D12), committed before any run.
- draft-2p at depth 1 **passes**: first player (Dark) 49.0% over 2,000 games (95% interval 46.8–51.2%), 40.6% draws (mostly repetition), 123 plies on average. Depth 2 has only 29 games (56.9%, interval 39–73%), so the verdict is `incomplete`.
- A 40-game depth-1 sweep of 59 one-parameter changes flags nothing (2 skipped: unbuilt). 40 games only catch an imbalance of about 15 points. 1202 tests pass.

## Next session
**S25 — Mobile layout** · Sonnet 5.5 · effort medium
Why: the harness is done. S26 (Candidate) waits on the depth-2 run below, which needs compute rather than a session.
Start with: `/start-session S25`

## Proposed Phase 2 changes
- **Before S26:** 2,000 depth-2 games take about 32 hours on 4 cores (230 s each, about 410 plies). Run `pnpm sim --depths 2` on a many-core machine, or first add a step to speed up the search (transposition table, move ordering).
- **S25 or S27:** move the search to a Web Worker (the page is blocked about 0.4 s per computer move).
- **S27:** the web bundle includes Ajv (130 kB gzip), which uses `new Function`; a strict CSP needs a pre-resolved ruleset.

## Decisions in effect for the next step
- D12 → decision 0008 v2 (default; depths 1 and 2, 100,000 positions per move, 4 random opening plies, provisional). D1: pieces are unverified seeds.

## Open questions for the owner
- Depth-2 run: who runs 32 core-hours of games, and where? Default: the owner runs `pnpm sim --depths 2` on a bigger machine before S26.
- 0008 v2 (S24): a screening sweep run is flagged only when its 95% interval misses 47–53%. Default: as built.
- The 100,000-position budget doesn't always let depth 2 finish (shallowest search: depth 1). Raise it? Default: no.
- Ting Yang art (two images shared in S24 chat: silver and gold, and red and blue): the owner says they are free to use (made with their own generator). They arrived only as chat images, so nothing is committed. Which is the 2-player one, and should they be released into `assets/` (All Rights Reserved) for the board? Default: a placeholder until the owner commits the files.
- Provisional from S22a: insufficient material, automatic repetition and fifty-move draws, en passant always on, `pawn.safeZones` meaning, Coast-only `coast.2p.exit/capturable`.
- Earlier, still open: the computer's heuristics and 800 nodes (S23); Dark against the computer (S22); danger indicator off, undo unlimited (S20); keep `tail.2p.canCapture`; a closed Coast and Kings and Queens; the opener's Tail exception; 3-player check from A5; the Sun and Moon promotion targets, the Tetrahedron and the 3-player Tail.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- `pnpm sim` bundles with Vite and runs `packages/sim/dist/cli.js`. Run the bundle from inside the repo, since `ajv` resolves from `node_modules`. Ctrl-C (SIGINT to the node process) writes the games played so far. Don't `pkill -f` a pattern that matches your own shell.
- `newGame` with only Kings (plus the Tail) is drawn at once. Tests that need such positions set `draw.insufficientMaterial: false`.
