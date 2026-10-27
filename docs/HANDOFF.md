# Handoff

Updated 2026-10-27 by S67 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S67 is done. A person can resign for any seat they play in a 3-player game (Resign button, confirm step): a Kinged seat turns to stone and the others play on, the last Kinged player or the Dragon in the duel ends the game, the Dragon with both Kings in turns all its pieces to stone. Resignation also works in Easy Start. `tail.capturable` now works in 3-player games: the capturing piece swaps with the Tail, which turns to stone, handled as a Tail checkmate. No preset turns it on.
- Code: `resignedBy`, `stoneOut`, `tailCaptures` in `packages/engine/src/game/three.ts`; `resign`, `endedBy`, `replayResignations`, `GameState.resignations` in `game.ts`; record/guest keys `resignations` (`{side, after}`); `resignable`, `resignPrompt` in `apps/web/src/game/threeText.ts`; `Game.tsx`.
- Done-when passed: `ONLY=resign node apps/web/scripts/e2e-3p.mjs` (after `pnpm build`) plays the recorded game in `apps/web/scripts/draft-3p-resigned.json` at desktop and Pixel 7 width; the whole script passes; 2084 tests. No 2-player test, parameter, ruleset or lock changed (only a description in `rules/parameters.json`).

## Next session
**S64 — 3-player rulesets in the builder** · Sonnet 5.5 · effort medium
Why: next in the Phase 6 order (S67, S64, S65, S62, S59...); its builder lists `tail.capturable` now that it works.
Start with: `/start-session S64`

## Decisions in effect for the next step
- D64 (builder, export, load and share take 3-player rulesets; Submit stays 2-player): decided by the owner.
- D68 (resignation, Tail capture): decided by the owner, Easy Start parts provisional (Claude); readings S67 chose are in decision 0018 under "How S67 built it".

## Open questions for the owner
- Easy Start (Claude's calls): resignation turns pieces to stone there, its Tail stays uncapturable, and with the option switched on the capturer wins at once. Say if any looks wrong.
- Greedy Easy Start Dragon loses fast (all Tail checkmates, 5 to 28 plies); by design until S62's search; S59 should report it.
- Carried over: S54 (owner) and the S53 defaults in its PR; the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- A resignation is not a move: `moves` stays one entry per ply, so `rounds()` is unchanged. Anything that replays a game (records, guest saves, online later) must call `replayResignations` before the first move, after each move and at the end.
- `tail.capturable` is a 2- and 3-player parameter; `three-params.test.ts` has its own 3-player cases because its loop covers 3-player-only parameters.
- The Game screen's bot effect now depends on `game`, not the move count, so a resignation restarts a computer search.
- S63: online rooms still refuse 3-player rulesets; add resign (with `after`) to the room protocol then.
- `coast.3p.exit` (first way out through A5) is not built; `unbuiltFeatures` lists it for every 3-player game.
- Browser: `ONLY=resign node apps/web/scripts/e2e-3p.mjs` runs just the resignation game; `ONLY=computer` just the computer Dragon.
