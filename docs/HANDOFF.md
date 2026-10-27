# Handoff

Updated 2026-10-27 by S65 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S65 is done. A hot-seat game (2 or 3 players, computer seats included) can pick a time control before its first move, with a Show only switch. Each seat has a clock, Pause and Resume hold it, undo is off, and running out of time is a result (D66): the seat loses or draws in 2 players, is out as after a resignation in 3 players. Untimed stays the default and plays as before.
- Code: `rules/timeControls.json` and its schema; `loadTimeControls`, `isClocked`, `hotSeatControls` (`packages/engine/src/rules/time-controls.ts`); `Clock` functions of `now` (`game/clock.ts`); `timeOut` and `Resignation.timeout` in `game.ts`; `Model.timed`, `startTimed`, `tick`, `pauseTimed`, `clockLines` in `apps/web/src/game/session.ts`; `timed.ts` (saved form); `clockText.ts`; guest and record carry the clock.
- Done-when passed: `node apps/web/scripts/e2e-clock.mjs` (after `pnpm build`) plays 3+2 (2 players) and 30 seconds per move (3 players) to a flag fall, with a reload, at desktop and Pixel 7 width; 2213 tests. No parameter, ruleset or lock changed.

## Next session
**S62 — 3-player search** · Opus 5.5 · effort high
Why: next in the Phase 6 order (S62, S59, S60, S61); design and correctness work, as planned.
Start with: `/start-session S62`

## Decisions in effect for the next step
- D59 (greedy first, paranoid search after it for every seat): decided by the owner.
- D58 (untimed default; players may choose a time control, decision 0017): decided; D66 (running out of time): default, provisional, readings listed in decision 0017.

## Open questions for the owner
- Readings of decision 0017 made in S65 (listed at its end): the clock starts when the control is chosen; a move after time is up is a flag fall; the time-out draw ignores `draw.insufficientMaterial`. Default: as built.
- Carried over: the held-setting rule (S64), Easy Start calls (S67), greedy Easy Start Dragon loses fast (S59 should report it), S54 (owner) and the S53 defaults, the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- A computer seat's thinking time counts on its clock, so S62's search stays under the position cap, not a time limit. Computer moves arrive through `playFor(model, move, now)` and are refused while paused or after the deadline.
- S66 (online clocks) reuses `Clock` and `timeOut`; the online protocol still refuses the `timeout` win reason and the `timeout-insufficient-material` draw (`WIN_REASONS` excludes it in `packages/online/src/protocol.ts`): add them there.
- `Model.timed` is null for online models (`online.ts`). Anything that builds a `Model` literal needs it.
- Browser: `e2e-clock.mjs` uses Playwright's fake clock (`page.clock`), paused so the script moves time with `runFor`.
