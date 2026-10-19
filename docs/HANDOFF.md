# Handoff

Updated 2026-10-19 by S19 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. The app opens on a rule picker listing every file in `rules/rulesets/` with a status badge. `draft-2p` plays; `draft-3p` shows "Not playable yet". The game screen has "Change ruleset". Lint, typecheck, `validate:rules`, build and 975 tests pass.
- `apps/web/src/game/rules.ts` now lists rulesets (`listRulesets`) and builds rules for an id (`createRules(id)`); `ruleset` is still the default's info. Playable means `players === 2` (the engine refuses 3).
- Playwright: the owner took the default, so it is **not** added. Nothing e2e yet; Game and picker are tested by rendering to markup.

## Next session
**S20 — Play aids, part 1** · Sonnet 5.5 · medium
Why: next Phase 2 step; no blockers.
Start with: `/start-session S20`

## Proposed Phase 2 changes (for the owner's plan review)
- **Insert an engine step before S23: the missing 2-player rules** (threefold repetition, 50-move, insufficient material, castling, en passant, pawn safe zones, owner-listed Coast rules). Without draw rules, bot self-play (S24) may never end. Suggested: Opus 5.5 · high.
- **S20:** last-move highlight already exists in the board; drop it. Undo: keep a stack of states (`playMove` returns a new immutable state). The danger indicator can use the exported `attackMap`.
- **S23 / S22:** `playMove` takes about 6.5 ms (a full legal scan). Start S23 with a speed task (incremental attack maps); S22's random mover is fine.
- **S27:** the web bundle includes Ajv (130 kB gzip), which uses `new Function`; a strict CSP needs a pre-resolved ruleset.

## Decisions in effect for the next step
- D3, D6: applied in rule set v0.2. D1: pieces are unverified seeds. D34: dark's view is turned 180°. D36: tetrahedron on e5.

## Open questions for the owner
- Keep the option `tail.2p.canCapture`? Default: kept; when on, the Tail takes only the other side's pieces.
- Is a closed Coast closed to Kings and Queens too? Default: yes. Confirm the opener's exception (a5-e5, then e5-i5 on the very next turn only). Default: as written.
- 3-player: "the Dragon could use a Coast piece to check from A5 only" vs RULES.md "Dragon pieces don't check". Default: not built, no change.
- Sun and Moon promotion targets, Tetrahedron size, Ting Yang art, and whether the 3-player Tail passes an empty e5 (default: yes) are still open.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- The hot-seat fixture `packages/engine/test/fixtures/games/hot-seat-mate.json` uses `x` for captures in its notation (`c5xb3`).
