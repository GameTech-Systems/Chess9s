# Handoff

Updated 2026-10-28 by S63 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6 is done (S61). S63 added 3-seat online rooms (D61): a room has a seat per side of its game; `standard-3p`, `draft-3p` and `easy-3p` are playable online, custom 3-player rulesets are not (a create message carries no player count).
- Protocol stays `v: 1`; 2-seat rooms are unchanged. New: `create.computer` (1 or 2 seats; their tokens come back once, in the creator's reply as `computerTokens`), `resigned`, `opponent.side` (3 seats only), snapshot `resignations`/`computer`, refusals `computer-seats`, `seat-out`, `draw-unavailable` (decision 0018 keeps agreed draws out). Snapshot `seats` now list in turn order.
- Computer seats: the creator's browser joins each on its own socket (`game/computerSeat.ts`, S58/S62 levels as in hot-seat: Greedy Dragon, Search others) and the server checks every move. If that browser is away the seat is away (D51). `BotRequest` now carries `resignations`, which also fixes the hot-seat computer after a resignation.
- Played through `wrangler dev` with `node apps/worker/scripts/e2e-browser-3p.mjs` (three people, reload at move 31, a King captured, Dragon checkmate; then a computer Dragon with a reload and two resignations), desktop and Pixel 7. It found the online move list dropping each round's third move (fixed).
- The 2-player create screen listed a "Neutral" side (the stones' side); it now lists the board's turn order.

## Next session
**S54 — Go live with rooms** · Owner (no Claude session)
Why: S66 (online clocks, the last Claude step outside Phase 7) needs S54. Then S66 (Opus 5.5 · high).
Start with: the S54 checklist in `docs/BUILD-PLAN.md`. Optional extra: one 3-seat game with a computer Dragon on chess9s.com.

## Decisions in effect for the next step
- D51 to D54: defaults (Phase 5 rooms). D58 and D66: decided (clocks); 3-seat rooms use the same clocks.

## Open questions for the owner
- Computer seats in rooms use the default levels (Greedy Dragon, Search for the others); there is no level choice on the create screen. Default: leave it until asked.
- Room Durable Objects' 3-seat socket cap is 6 (two per seat). Provisional.
- Online rooms for custom 3-player rulesets need a player count in the create message; none planned. Default: not offered.
- Carried over: why light collapses at depth 2, `coast.3p.exit`, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65), the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- The `Sim depth 2` workflow's merge job uploads `fairness-report-<ruleset>` but doesn't commit it; download and commit it in a Claude session.
- A resignation in a 3-seat room is not a move: the server saves `resignations` beside the moves and replays them with `replayResignations`; a 2-seat room never has any.
