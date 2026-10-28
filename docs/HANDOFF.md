# Handoff

Updated 2026-10-28 by S66 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6 is done (S61); S66 added clocks to online rooms (decision 0017, D58, D66). The creator picks any control in `rules/timeControls.json` (online-only ones too) with Show only; untimed stays the default (D51). The preview shows it before a seat is taken.
- The room keeps the clocks on the server's time with the engine's clock functions (`packages/engine/src/game/timed.ts`, moved from the web app). The Durable Object saves the clock with the record and sets its alarm for the deadline, so a flag falls with nobody connected. A move after the time ran out is the flag fall (refusal `out-of-time`). The abandonment control (`away5m`) counts a seat away while every other person is connected.
- Protocol stays `v: 1`, additive: `create.time`, `RoomInfo.time`, snapshot `time` (left, lefts, flagged, away), `left` on `move`/`resigned`, new `out-of-time` and `away` messages, timeout results, resignation `timeout`, refusals `unknown-time-control`, `out-of-time`. A client message carrying a clock is refused as malformed.
- Browser: clocks per seat (2 and 3 seats), the time away before a seat is out, the record carries the times. `node apps/worker/scripts/e2e-browser-clock.mjs` plays 3+2 rooms through `wrangler dev` (reload shows the same times; the alarm drops the flag), desktop and Pixel 7. Privacy page updated (28 October 2026).

## Next session
**S33 — Phase 7: Growth (planning)** · Opus 5.5 · effort high
Why: S66 was the last Claude step outside Phase 7; S48 and S50 wait on the owner's S47 decision. The Phase 7 placeholder needs its detailed steps.
Start with: `/start-session S33`. Read only the S33 section of `docs/BUILD-PLAN.md`, the decision defaults table and `docs/decisions/0002-stack.md`.

## Decisions in effect for the next step
- D51 to D54: defaults (rooms). D58 and D66: decided (clocks); S66's readings in decision 0017 are provisional.

## Open questions for the owner
- S66 readings (0017, provisional): a room's clock starts when its last seat is taken; Show only only with a clock; the away count runs while every other person is connected and restarts in full; a person alone with computer seats is never counted out.
- Computer seats in rooms use the default levels; no level choice on the create screen. Default: leave it until asked.
- Room Durable Objects' 3-seat socket cap is 6 (two per seat). Provisional.
- Carried over: why light collapses at depth 2, `coast.3p.exit`, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65), the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- `RoomContext.now` and `leave(room, seat, now)` take the server's time; `snapshotFor(room, seat, now, { token, computerTokens })`. `expire(now, room)` and `roomDeadline(room)` drive the alarm.
- `applyServer(o, msg, now)` takes a third argument: don't pass it to `reduce` directly (the index would be read as the time).
- The `Sim depth 2` workflow's merge job uploads `fairness-report-<ruleset>` but doesn't commit it; download and commit it in a Claude session.
