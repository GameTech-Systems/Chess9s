# Outside audit: security, privacy and operations

Model: Moonshot Kimi K3.1 Pro (`moonshotai/kimi-k3.1-pro`) through NVIDIA's API, streamed with low reasoning effort, 20 Nov 2026, S33. It read 12 files (listed in SUMMARY.md) and the facts in the prompt. Kept as it answered, with its headings moved one level down; Claude's verification of each finding is in SUMMARY.md.


### Findings

### 1. Blocker — room creation and connection abuse are unbounded
**Location:** `apps/worker/src/index.ts` — `handle()`, `createRoom()`; `wrangler.jsonc`

Any non-browser client can supply an allowed `Origin`; the origin check is not authentication or abuse resistance. A client can create unlimited persisted rooms, each retained for up to seven days, and open unlimited sockets across different rooms. `MAX_SOCKETS` limits only one room. Unauthenticated room-info requests also permit high-volume code probing. On the Workers Free plan, this threatens both availability and launch-day quotas.

**Fix:** Before public launch, add Cloudflare edge rate limits keyed by `CF-Connecting-IP`, not `Origin` or `X-Forwarded-For`:

- `POST /api/rooms`: start around 10/minute and 100/day per IP.
- WebSocket upgrade requests: around 30/minute per IP.
- Room-info GETs: around 60/minute per IP.
- Return secured JSON `429` responses with `Retry-After`.
- Add a global daily room-creation budget and quota/error alerts to limit distributed abuse.

Validate the complete create message in the Worker before invoking a fresh DO where possible. Keep the existing per-room socket cap.

### 2. High — WebSocket size and message-rate limits are applied too late
**Location:** `apps/worker/src/room.ts` — `webSocketMessage()`; `packages/online/src/protocol.ts` — `parseClientMessage()`

The 24 KB protocol cap is checked only after the runtime has received and allocated the entire WebSocket message. Cloudflare’s larger transport limit therefore permits repeated oversized messages, and a seated client can send unlimited malformed or illegal messages. Every message also refreshes `seen`, so abuse keeps the socket alive.

**Fix:** In `webSocketMessage()`:

- Reject binary messages with close code `1003`.
- Check UTF-8 byte length before calling `receive()` and close oversized senders with `1009`.
- Add a small per-socket token bucket, for example 20 messages/second with a burst of 40; repeat offenders get `1008`.
- Retain the protocol parser as the authoritative structural validation.

Edge upgrade limits do not replace these in-message limits.

### 3. Medium — expired browser seat records are ignored, not actually deleted
**Location:** `apps/web/src/game/onlineStore.ts` — `read()`, `loadSeat()`; `apps/web/src/Privacy.tsx` — online-play paragraph

`read()` filters entries older than eight days but does not write the filtered result back. If the player never revisits or saves another seat, expired room codes and tokens remain physically present in local storage indefinitely. This does not match “removed when the room ends or expires.” The server-side tokens should already be useless, so the direct security impact is low, but the retention statement is inaccurate.

**Fix:** Have reads report whether malformed or expired entries were removed and rewrite/remove `chess9s.online` when dirty. Alternatively, change the privacy wording to “ignored after eight days and removed on the next write,” though actual purge-on-read is preferable.

### 4. Medium — a failed room probe can stop reconnection permanently
**Location:** `apps/web/src/game/connection.ts` — `socket.onclose`, `this.options.probe().then(...)`

The probe has no rejection handler. Offline mode, a transient network failure, or a rejected request leaves the connection in `reconnecting` with no socket, timer, or subsequent attempt. `nudge()` also cannot help while that probe is pending because `wait` is null.

**Fix:** Catch probe failures and schedule the next backoff attempt, unless stopped. Treat only an explicit `gone` result as terminal; network errors must remain retryable. Add a test for probe rejection followed by successful recovery.

### 5. Medium — API and DO exceptions bypass the controlled error responses
**Location:** `apps/worker/src/index.ts` — default export and DO `stub(...).fetch()` calls; `apps/worker/src/room.ts` — `webSocketMessage()`, `alarm()`

A DO fetch, storage, replay, or scheduling exception escapes `handle()`, producing a runtime-generated error rather than the app’s secured JSON response. Socket-handler failures similarly become abrupt disconnects. The current code appropriately avoids logging tokens and message bodies, but that also leaves no privacy-safe failure signal.

**Fix:** Add a top-level `/api/*` exception boundary returning a generic secured `502`/`503` JSON problem with `no-store`. Around socket processing, close with `1011` without exposing internals; preserve the saved room for reconnect. Enable aggregate Workers error/invocation metrics without request bodies, room messages, tokens, or IP logging.

### 6. Medium — the requested offline mode is not yet implemented
**Location:** `apps/web/public/_headers`; `apps/web/src/Privacy.tsx`; application startup/service-worker area

There is no service worker, so hot-seat and computer play still depend on resources already being available in the browser. This is a feature gap, not a security defect.

**Fix:** Precache a versioned app shell containing the hashed application assets, rules data, art, and bot worker. Cache only successful same-origin static GET responses; never cache `/api/*`, room-info responses, or seat data. WebSockets remain online-only, and opening an online room offline should show a clear unavailable state.

Also update the privacy page to disclose service-worker Cache Storage and background update requests. The current absolute statement that no network requests occur after loading needs that qualification.

### 7. Low — development origins are accepted in production
**Location:** `apps/worker/src/index.ts` — `LOCAL_ORIGIN`, `allowedOrigin()`

Any page served from localhost or 127.0.0.1 may use the production rooms API. There is no cookie-based authority to steal, but this unnecessarily expands the sites allowed to consume the production service.

**Fix:** Enable `LOCAL_ORIGIN` only in development/preview configuration; production should accept the app origin and its own deployed origin.

### 8. Low — public launch documentation is stale
**Location:** `README.md` — “Status: Phase 1 built” and “Play (coming soon)”

These contradict a public launch.

**Fix:** Update the status and link to `https://chess9s.com/`, including the online-only limitation of rooms and the offline scope once implemented.

### Service worker: CSP and headers

The existing CSP in `apps/web/public/_headers` and `SECURITY_HEADERS` **needs no new directive** for a same-origin service worker:

- `worker-src 'self'` already covers service-worker registration as well as the bot worker.
- `script-src 'self'` and `connect-src 'self'` remain sufficient.
- No `unsafe-inline`, `unsafe-eval`, or additional origin is needed.

Add a fixed-address cache rule for the root service-worker script:

```text
/sw.js
  Cache-Control: no-cache
```

`no-cache` permits storage but requires revalidation; do not place the service worker under the immutable `/assets/*` rule. A root-level script needs no `Service-Worker-Allowed` header. Preserve the existing CSP and other security headers on cached HTML responses, and keep HTML revalidated so deployments do not leave clients paired with obsolete application code.

### Done well

- HTTP bodies are streamed with a real byte cap; protocol messages receive strict, whole-object validation with exact keys and version checks.
- Seat tokens have 256 bits of randomness, are excluded from room-info responses, are not placed in URLs, and API responses use `no-store`.
- The CSP is unusually tight and appropriate for the current architecture; clickjacking, MIME sniffing, referrer, and transport headers are handled without unnecessary exceptions.
- Per-room socket caps, join/idle timeouts, hibernation auto-response, and close-code reconnect behavior are thoughtfully implemented.
- Server retention matches the stated 24-hour/7-day schedule, including deletion when replay fails; the privacy page accurately discloses Cloudflare’s role and local-storage keys.
- `wrangler.jsonc` correctly limits Worker-first execution to `/api/*`, uses SPA fallback, declares the SQLite DO migration, and separates preview room bindings.

### Launch blockers

- **Unbounded room creation and cross-room connection abuse: deploy edge rate limits and global quota protection before opening the site.**

### Top 5 before launch

1. Deploy IP-based creation, upgrade, and info rate limits plus global quota alerts.
2. Enforce WebSocket byte/rate limits and add controlled API/DO exception handling.
3. Fix reconnection after a rejected room probe.
4. Purge expired local seat records and align the privacy wording.
5. Implement the offline service worker with safe cache rules, then update privacy and README.