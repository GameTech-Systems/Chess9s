# Handoff

Updated 2026-10-27 by S52 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 5: S52 is done. One Worker (`apps/worker`, root `wrangler.jsonc`, D50) serves the app and the rooms: `POST /api/rooms`, `GET /api/rooms/<code>` (`RoomInfo`: ruleset, seat statuses, result, no tokens), `GET /api/rooms/<code>/socket`. The `Room` Durable Object (SQLite, Hibernation API) saves every move, replays after a restart, closes idle sockets and deletes rooms on D53's schedule. CI runs `pnpm worker:check` (dry-run) and `pnpm worker:e2e` (the 80-move game through `wrangler dev`, with a reconnect at move 40). 1637 tests pass.
- Phase 4 is still on hold (S47 to S50). Standard's discussion is #39 and closes 2026-11-15 (D20). Phase 6 order after Phase 5: S56, S57, S58, S64, S65, S62, S59, S60, S61.

## Next session
**S53 — Play online in the browser** · Sonnet 5.5 · effort high
Why: the next step in order. It puts S52's rooms in the web app.
Start with: `/start-session S53`

## Decisions in effect for the next step
- D34, D46, D51, D52: as in the table (defaults). D53: 24 hours after the end, or 7 days with no move (default; built in S52).

## Open questions for the owner
- D50 to D54 and D60 are still provisional until the ledger confirms them. D66 is a default from decision 0017.
- New S52 defaults to confirm: a socket must join within 60 s; a seated socket with no message and no ping for 15 min is closed (its seat stays); at most 4 sockets per room. Also: `POST /api/rooms` checks the Origin too, and allows chess9s.com, the Worker's own origin (previews) and `http://localhost` / `127.0.0.1`.
- For S54's rate-limiting rule (Free plan: 10-second period): `http.request.method eq "POST" and http.request.uri.path eq "/api/rooms"`, 5 requests per 10 s per IP, then block for 10 s.
- Carried over: the draw-offer default from S51, the Discussion form prefill check, the flag rule (decision 0013), how to read `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- Cloudflare docs, where they differ from the plan: Worker Previews do support a Durable Object (each Preview gets its own namespace), but bindings are not inherited, so `ROOMS` is repeated under `previews`. `_headers` never reaches Worker responses, so `SECURITY_HEADERS` in `apps/worker/src/index.ts` copies it (a test keeps the two equal). `@cloudflare/vitest-pool-workers` needs Vitest 4, so the adapter is tested against fakes (`apps/worker/src/fakes.ts`).
- The engine imports `#schema-check` (package.json `imports`; the `workerd` condition gives the Ajv-free stand-in, and Vite's alias matches `#schema-check`).
- For S53's client: send exactly `PING` now and then (the runtime answers `PONG` without waking the room; compare the text before parsing). Close codes are `CLOSE_IDLE` (reconnect with the token), `CLOSE_REPLACED` (don't reconnect) and `CLOSE_GONE`. All are in `packages/online/src/protocol.ts`. The creator's seat reads `away` until it joins over the socket with its token.
- Replaying a game when the object wakes costs about 0.4 ms per ply (30 to 90 ms at 80 plies). That is within Durable Objects' CPU limit; watch it in S54.
- A new file in `rules/` needs `pnpm rules:index`. A lock is never edited by hand.
