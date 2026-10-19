# Handoff

Updated 2026-10-19 by S18 (Sonnet 5.5 · medium; the step asked for Opus 5.5). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1 is done and reviewed. `apps/web` plays a 2-player hot-seat game on draft-2p. Lint, typecheck, `validate:rules`, build and 969 tests pass. The 80-move fixture game was replayed by clicking in Chromium: it ends in "Checkmate · Light wins" with no console errors (script run from outside the repo).
- S18 changes: removed the placeholder `ENGINE_NAME` export and its test, added a blank favicon (the page logged a 404), updated the README status and repository map. No rules or engine behavior changed.
- Dead-code scan found nothing else to cut. Engine exports used only by tests (`attackMap`, `assertPlayable`, `gameRecord`, `parameterInteractions`) are kept for Phase 2 (danger indicator, sim, rule picker).
- Not engine features yet: castling, en passant, pawn safe zones, queen pawn swap, leaving the Coast by A5 only, no capture on the Coast, swapped King and Queen, threefold repetition, the 50-move rule, insufficient material, 3-player check and game end. The screen lists them under "Not in this build yet".

## Next session
**S19 — Rule picker** · Sonnet 5.5 · medium
Why: first Phase 2 step; the owner's plan changes below do not block it.
Start with: `/start-session S19`

## Proposed Phase 2 changes (for the owner's plan review)
- **Insert an engine step before S23: the missing 2-player rules** (threefold repetition, 50-move, insufficient material, castling, en passant, pawn safe zones, and the owner-listed Coast rules). Without draw rules, bot self-play (S24) may never end, and a fairness report on incomplete rules says little. Suggested: Opus 5.5 · high.
- **S19:** only `draft-2p` plays (`newGame` refuses 3 players). List `draft-3p` as "not playable yet". `apps/web/src/game/rules.ts` resolves draft-2p at import time; make it a function of the chosen ruleset.
- **S20:** last-move highlight already exists in the board; drop it from the step. Undo is cheap: `playMove` returns a new immutable state, so keep a stack of states (no engine change). The danger indicator can use the exported `attackMap`.
- **S23 / S22:** `playMove` takes about 6.5 ms (a full legal scan). Start S23 with a speed task (incremental attack maps); S22's random mover is fine as is.
- **E2E test:** a Playwright dependency would let CI click a full game. It is not on the D21 list (Apache-2.0). Suggest adding it in S25 once the layout settles.
- **S27:** the web bundle includes Ajv (130 kB gzip), which uses `new Function`; a strict CSP needs a pre-resolved ruleset.

## Decisions in effect for the next step
- D3, D6: applied in rule set v0.2. D1: pieces are unverified seeds. D34: dark's view is turned 180°. D36: tetrahedron on e5.

## Open questions for the owner
- Approve Playwright as a dev dependency (for the e2e test above)? Default: no; none added.
- Keep the option `tail.2p.canCapture`? Default: kept; when on, the Tail takes only the other side's pieces.
- Is a closed Coast closed to Kings and Queens too? Default: yes. Confirm the opener's exception (a5-e5, then e5-i5 on the very next turn only). Default: as written.
- 3-player: "the Dragon could use a Coast piece to check from A5 only" vs RULES.md "Dragon pieces don't check". Default: not built, no change.
- Sun and Moon promotion targets, Tetrahedron size, Ting Yang art, and whether the 3-player Tail passes an empty e5 (default: yes) are still open.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- The hot-seat fixture `packages/engine/test/fixtures/games/hot-seat-mate.json` uses `x` for captures in its notation (`c5xb3`).
