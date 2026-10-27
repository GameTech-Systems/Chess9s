# Handoff

Updated 2026-10-27 by S51 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 5: S51 is done. `packages/online` (pure, Node-tested) has the protocol (`parseClientMessage`, `parseServerMessage`: `v: 1`, size caps, strict keys, 21 refusal reasons) and the room (`receive`, `leave`, `snapshotFor`, `replaySnapshot`, `newRoomCode`, `newSeatToken`). The engine has `resign`, `agreeDraw` and `endedBy`; game records keep both results. `loadRules(files)` in the engine assembles rules data; the web feeds it from `import.meta.glob`, and `rulesFiles` (`pnpm rules:index`) is the static index for the Worker. 1609 tests pass.
- Phase 4 is still on hold (S47 to S50). Standard's discussion: #39, closes 2026-11-15 (D20). Phase 6 order after Phase 5: S56, S57, S58, S64, S65, S62, S59, S60, S61.

## Next session
**S52 — Rooms on Cloudflare** · Opus 5.5 · effort high
Why: the next step in order; it wraps S51's room in a Worker and a Durable Object. S56 can still run before it (Opus 5.5 · high).
Start with: `/start-session S52`

## Decisions in effect for the next step
- D18 and D50: one Worker serves the app and the rooms, with a fallback to a second Worker (default).
- D53: a room is deleted 24 hours after the game ends, or after 7 days with no move (default).
- D51, D52, D54 applied in S51 as defaults (provisional, marked in `room.ts` and `protocol.ts`).

## Open questions for the owner
- D50 to D54 and D60 are still provisional until the ledger confirms them; D66 is a default from decision 0017.
- New default to confirm: after a declined draw offer, the offering seat must move before offering again; a move by the seat a draw was offered to declines it. Game actions wait until both seats are taken.
- Carried over: the Discussion form prefill check, the flag rule (decision 0013), how to read `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- The Worker must alias `schema-check` to `schema-check.static.ts`, as `apps/web/vite.config.ts` does (Workers forbid the `eval` that Ajv needs). Custom overrides are still checked by the loader's own option checks.
- `receive(ctx, room, seat, text)` takes the seat the connection holds (null before create or join) and returns the room, the sender's seat and messages `to: 'sender' | { seat }`. `POST /api/rooms` can call it with a `create` message; the Worker makes the code (`newRoomCode`, a new one on collision) and passes `crypto.getRandomValues`.
- Storage: a Room holds a full `GameState`. Save the code, ruleset, seat tokens, moves, result, `drawOffer` and `offerWait`, and rebuild with `replayGame`. S52 adds that save and restore.
- D54's "see the ruleset" before joining is S52's `GET /api/rooms/<code>`. The protocol has no peek message.
- A new file in `rules/` needs `pnpm rules:index`. A lock is never edited by hand.
- Cloudflare: legacy version preview URLs skip a Worker with a Durable Object; S52 checks Worker Previews first (D50).
