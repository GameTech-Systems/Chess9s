# Handoff

Updated 2026-10-27 by S58 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S58 is done. The computer plays 3-player games: on the game screen one or two seats (never all three) go to a greedy player, the Dragon the usual one, kept with the guest game. The board follows the people, not the computer; Undo takes the computer's moves back too. Computer seats are hot-seat and local only (online rooms refuse 3-player rulesets until S63).
- Code: `packages/engine/src/ai/greedy.ts` (`greedyMove(state, {random})`, rates each `outcomes()` entry: win, King capture, material, hanging piece, King and Tail safety; weights provisional), `packages/sim/src/play3.ts` and `cli3.ts` (`pnpm sim --players 3 [--ruleset id --games n]`, default `standard-3p`, 100 games; writes `<out>/<name>.greedy.json` and `.md`), `apps/web/src/game/bots.ts`, `Game.tsx`.
- Done-when passed: `node apps/web/scripts/e2e-3p.mjs` (after `pnpm build`) also plays a hot-seat game against a computer Dragon at desktop and Pixel 7 width; greedy games finish in all three presets; 2027 tests. No 2-player parameter, ruleset, lock or search result changed.

## Next session
**S67 — 3-player resignation and Tail capture** · Sonnet 5.5 · effort high
Why: the owner answered both open questions (decision 0018); it is next in the Phase 6 order, before S64.
Start with: `/start-session S67`

## Decisions in effect for the next step
- D68 (resignation: the resigning seat's pieces turn to stone, the others play on; Tail capture: swap and stone, as a checkmate): decided by the owner, Easy Start parts provisional (Claude). The id D68 is mine; the ledger may number it differently.

## Open questions for the owner
- Easy Start (Claude's calls, 0018): a resignation also turns pieces to stone there, and its Tail stays uncapturable. Say if either looks wrong; S67 applies them as written.
- Greedy Easy Start Dragon loses fast (8 test games: all Tail checkmates, 5 to 28 plies): with no look-ahead it walks the Tail into discovered attacks. By design until S62's search; S59 should report it.
- Carried over: S54 (owner) and the S53 defaults in its PR; the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- S67: `game.ts` `resign`/`endedBy` are 2-player only (`ended` throws for 3 seats). Seats are `game.order` (dark, light, dragon); `kingTaken` in `three.ts` already turns a side to stone and starts the duel, reuse it for a resignation. The seat list's "out" text says "King captured": it needs a resignation wording.
- Greedy: `greedyMove` calls the engine's `outcomes()` once per turn (about 5 ms); a greedy game is 100 to 250 plies. Weights are in the file header; S59 may tune them.
- `coast.3p.exit` (first way out through A5) is not built; `unbuiltFeatures` lists it for every 3-player game, so `playable()` in the sim is not used for 3 players.
- Browser script: `ONLY=computer node apps/web/scripts/e2e-3p.mjs` runs just the computer-Dragon game; its human moves are chosen from the page, because the Dragon's replies are random.
