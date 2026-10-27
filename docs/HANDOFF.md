# Handoff

Updated 2026-10-27 by S62 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S62 is done. `bestMove` plays 3-player games paranoid: the seat to move maximizes its score, the other two minimize it, with S35's speedups. The score (`packages/engine/src/ai/paranoid.ts`) is material plus decision 0016 win conditions, with provisional weights shared with the greedy player. The 2-player search is unchanged; a bench test compares it against the recorded reports.
- Browser: each 3-player computer seat has a Greedy or Search level (Search uses 800 positions, as in 2-player), kept with the saved game. A computer Dragon starts on Greedy (D59); a Kinged seat starts on Search.
- Sim: `pnpm sim --players 3 --search --depths <d>`. Bench: `pnpm bench --players 3` on `packages/sim/bench/positions-3p.json` (12 Standard positions). At depth 2: 401 positions per move on average, none capped.
- Done-when runs, one game each:
  - Depth 1 from the start: Standard, light mates in 154 plies; Good Practice, 50-move draw at 339; Easy Start, dark mates the Tail at 4.
  - Depth 2: Standard, the Dragon mates at 70 (239 with no random opening); Good Practice, the Dragon captures the last King at 284; Easy Start, dark mates at 10.
- Checks: `e2e-3p.mjs` plays a Search Dragon at desktop and Pixel 7 width; 2234 tests.

## Next session
**S59 — 3-player balance simulations** · Opus 5.5 · effort high
Why: next in the Phase 6 order (S59, S60, S61), and it needs S62's search.
Start with: `/start-session S59`

## Decisions in effect for the next step
- D59 (paranoid search for every seat): decided. D60 (3-player balance measure): default, provisional (decision 0015, written in S59). D63 (Standard is the 3-player default): decided.

## Open questions for the owner
- S59's planned run sizes don't fit one session. A 3-player search game takes about 0.5 to 2 ms per position, against 0.35 ms in 2-player, almost all of it in the rules engine's checkmate settling. That works out to about 36 to 60 s per depth-1 game and 1.5 to 17 min per depth-2 game on one core, so 2,000 Standard games at depth 1 would take about 20 to 30 CPU-hours.
  - Default: S59 runs screens in the session and the 2,000 games as sharded `Sim depth 2` workflow runs.
  - Alternative: a 3-player engine speed step before S59, like S35.
- Choices made in S62 (defaults, as built):
  - Depth counts plies, one per seat, so a mate in two needs depth 4.
  - Kinged computer seats start on Search.
  - A seat that is out counts as a loss for that seat in its own search.
- Easy Start's Dragon loses fast even at depth 2 (dark mated the Tail at ply 10), which adds to the S59 report on the greedy Dragon.
- Carried over: the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65), S54 (owner) and the S53 defaults, the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- `--search` reports are named `<ruleset>.search-d<d>`. Background a whole game (a single depth-2 game takes up to 17 min); `grep` buffers output until the run ends.
- The 2-player bench guard in `packages/sim/src/bench.test.ts` replays every tenth position in `docs/benchmarks/search-depth{1,2}.json`. Rewrite those reports only together with a deliberate search change.
- `three.ts` now caches `reach` per piece object and exports `attackersOn`, which `checkersOn` builds on.
