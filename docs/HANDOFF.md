# Handoff

Updated 2026-10-27 by S53 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 5: S53 is done. The web app plays online: "Play online" (game screen and picker) makes a room with a seat choice (random preselected); `/room/<code>` previews a room (name, version, badge, "Unofficial" and differences for a custom one, your side), takes the seat, plays, reconnects with backoff after a drop or reload, takes back a refused move, resigns and offers draws. `chess9s.online` keeps one entry per room. Join by code or link from the picker and the game screen. Privacy (dated 27 Oct), `/tournament`, the builder note and the tournament invitation are updated.
- Done-when passed: `node apps/worker/scripts/e2e-browser.mjs` plays the 80-move game in two Chromium contexts at desktop and Pixel 7 width (reload at move 40, no sideways scroll). Not in CI (needs Playwright). 1781 tests pass.
- Phase 4 is still on hold (S47 to S50). Standard's discussion is #39 and closes 2026-11-15 (D20).

## Next session
**S56 — 3-player game state and game end** · Opus 5.5 · effort high
Why: S54 (go-live) is the owner's step; the next Claude step in Phase 6 order is S56.
Start with: `/start-session S56`

## Decisions in effect for the next step
- D55 to D57, D62, D65: as in the table (decided; decision 0016).

## Open questions for the owner
- S54 (owner): follow `docs/BUILD-PLAN.md` S54 and the S52 rate-limit rule (`POST /api/rooms`, 5 per 10 s per IP, block 10 s). Also confirm D50 to D54, D60 (provisional).
- New S53 defaults to confirm: a seat stays in the browser after the game ends until the room is deleted (so a reload shows the result); entries older than 8 days are dropped; keep-alive PING every 30 s; backoff 0.5 s to 30 s; two-step Resign; a draw offer shows "<Side> offers a draw" with Accept and Decline.
- Carried over: the draw-offer default from S51, the Discussion form prefill check, the flag rule (decision 0013), how to read `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- Web online code: `apps/web/src/game/` (`online.ts` pure session, `connection.ts` socket, `roomController.ts` page logic, `api.ts`, `onlineStore.ts`, `roomFakes.ts` test fakes) and `OnlineRoom.tsx`, `CreateRoom.tsx`, `JoinByCode.tsx`. The web imports `@chess9s/online/protocol` (subpath export, no rooms data in the bundle).
- Known gap for S54 or later: a joiner whose socket drops before the first snapshot has taken the seat but never got its token, so the seat is stuck until the room expires (needs a server-side fix). `connect-src 'self'` covers `wss` in Chromium; watch Safari in S54.
- `pnpm dev` proxies `/api` to `wrangler dev` on 8787. `exactOptionalPropertyTypes` is on: spread optional props as `...(x && { x })`.
- A new file in `rules/` needs `pnpm rules:index`. A lock is never edited by hand.
