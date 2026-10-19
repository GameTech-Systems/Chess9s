# Handoff

Updated 2026-10-19 by S23 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. S23 ran before S22a at the owner's request; S22a is still `todo`.
- Speed: `legalMoves` walks each enemy piece once per turn and walks it again only when a move can change its attacks (`moves/check.ts`, `staysOutOfCheck`). `playMove` takes about 0.57 ms (was 4.8 ms). `legal-incremental.test.ts` checks it against the old full scan under every 2-player parameter option.
- Computer opponent v1: `packages/engine/src/ai/search.ts` provides `bestMove`, which uses negamax with alpha-beta, iterative deepening and a capture-only quiescence search. It stops on a node budget and breaks ties with a random source passed in. `evaluate` is material plus 5 hundredths per legal move of the side to move. `pieceValues` is each piece's average reach on an empty board under the resolved ruleset; royal pieces and the Tail are worth 0. It checkmated the random mover in 4/4 games (about 0.5 s and depth 2 at 1000 nodes in Node).
- Web: `game/bot.ts` `computerMove` plays at 800 nodes on the main thread after the 0.5 s pause. Lint, typecheck, `validate:rules`, build and 1107 tests pass. Not checked in a browser.

## Next session
**S22a — Missing 2-player rules** · Opus 5.5 · effort high
Why: the owner placed it before S24's self-play, which needs repetition and 50-move draws to end games.
Start with: `/start-session S22a`

## Proposed Phase 2 changes
- **S25 or S27:** move the search to a Web Worker so the page stays responsive while the computer thinks (about 0.4 s blocked now).
- **S27:** the web bundle includes Ajv (130 kB gzip), which uses `new Function`; a strict CSP needs a pre-resolved ruleset.

## Decisions in effect for the next step
- D3, D6: applied in rule set v0.2. D1: pieces are unverified seeds. D34: dark's view is turned 180°. D36: tetrahedron on e5.

## Open questions for the owner
- Provisional (S23): the computer's piece values and mobility term are playing heuristics derived from movement data, not rules; budget 800 nodes, no difficulty setting.
- Provisional (S22): against the computer the player has the first-moving side (Dark), with no side choice. A saved guest game is dropped if the ruleset version changes.
- Provisional (S21): sounds are synthesized with Web Audio (no CC0 files). The rules dialog links to docs/RULES.md.
- Provisional (S20): danger indicator off by default; undo has no limit.
- Keep the option `tail.2p.canCapture`? Default: kept.
- Is a closed Coast closed to Kings and Queens too? Default: yes. Confirm the opener's exception (a5-e5, then e5-i5 on the very next turn only). Default: as written.
- 3-player: "the Dragon could use a Coast piece to check from A5 only" vs RULES.md "Dragon pieces don't check". Default: not built.
- Sun and Moon promotion targets, Tetrahedron size, Ting Yang art, and whether the 3-player Tail passes an empty e5 (default: yes) are still open.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- Without repetition draws, `bestMove` can shuffle in level positions; S22a's draw rules end such games and S24 needs them.
- For quick benchmarks outside Vitest, bundle a script with `node node_modules/.pnpm/rolldown@*/node_modules/rolldown/bin/cli.mjs x.ts --platform node --format esm --file x.mjs`.
