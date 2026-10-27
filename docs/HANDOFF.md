# Handoff

Updated 2026-10-27 by S57 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S57 is done. The three 3-player presets play hot-seat in the browser: picker (Standard first, "Default for 3 players"), board turned to the side to move (Follow turn is the 3-player default, plus a Dragon view), stones drawn as stone, seat list with each seat's clock (display only), a result card for every end-table row, notices for the duel, the Tail in stone and the Dragon out, and the choice buttons for a Tail checkmate (which piece swaps, what a swapped pawn becomes). Records save and open for 3-player games.
- Code: `apps/web/src/game/threeText.ts` (seats, notices, result card), `game/session.ts` (`choose`, `royalSquares`, exposed Kings), `Game.tsx`, `board/Board.tsx`. Engine: `loadRules().rules(id)` gives 3-player rules; `rulesWith(values, players)`.
- Done-when passed: `node apps/web/scripts/e2e-3p.mjs` (after `pnpm build`) plays Good Practice (Dragon takes a King, then checkmates the other: `apps/web/scripts/draft-3p-dragon-mates.json`), Good Practice (Kinged checkmates Kinged) and Easy Start (Tail checkmated) at desktop and Pixel 7 width, no sideways scroll; 1981 tests. No 2-player parameter, ruleset or lock changed.

## Next session
**S58 — 3-player computer, greedy first** · Sonnet 5.5 · effort high
Why: next in the Phase 6 order; the hot-seat screen it plugs into is in place.
Start with: `/start-session S58`

## Decisions in effect for the next step
- D59 (greedy computer Dragon first, search in S62): decided.

## Open questions for the owner
- Owner answers (27 Oct): the Tail capturing the last King in the duel is a Dragon win, and a skipped Dragon turn counts for the 50-move rule: both confirmed, kept.
- Resigning is allowed in 3-player games, agreed draws are not (kept refused). Not built: what a resignation does is not set. Default: none, no Resign button in 3-player games until answered (a Kinged player's side turns to stone? the Dragon is out? the game ends?).
- `tail.capturable` in 3-player games: the owner says the Tail never leaves the board; the capturing piece swaps places with it and it turns to stone, as in a checkmate. Not built (no preset sets it). Open: does the swap apply for Easy Start (no stones there), and does capturing it count as the checkmate result? Default: not offered in S64 until answered.
- Carried over: S54 (owner) and the S53 defaults in its PR; the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- S58: the game screen hides the Opponent switch for 3 players (`three` in `Game.tsx`); `botSide` is 2-player only. Seats are `game.order` (dark, light, dragon); `three(rules, order)` from the engine gives the Kinged sides and the Dragon.
- Choices: a move can ask promotion, then `mateBy` (`#<square>`), then `swapPromotion` (`=<piece>`); `session.ask` narrows `game.legal` step by step. A bot picks from `game.legal` directly.
- 3-player online rooms refuse 3-player rulesets before `data.rules` (`roomRules`); `RulesetInfo.online` is false for them (S63).
- `coast.3p.exit` (first way out through A5) is not built; `unbuiltFeatures` lists it for every 3-player game. Checkmate escapes are judged two levels deep (`MATE_DEPTH`); 3-player turns cost 5 to 10 ms.
