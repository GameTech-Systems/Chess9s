# Outside audit: the S95 and S96 code

Model: NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b:free`) through OpenRouter's free tier, 21 Nov 2026. It read the code diff of S96 and S95 (`6a50a4d..e25faf9`, tests, docs and browser scripts left out) and a summary of both steps. Kept as it answered, with its headings moved one level down; Claude's verification of each finding is in SUMMARY.md.

### Findings

#### 1. Per-socket rate limiter strikes never reset (High)
**File:** `apps/worker/src/room.ts` (lines 78–95, 440–460)  
**What goes wrong:** The `take()` function increments `strikes` on every rate-limited message but never decrements or resets it. After 10 total dropped messages (even spread over hours), any subsequent rate-limited message closes the socket with `CLOSE_FLOOD` (1008). A player who briefly exceeds the limit once is permanently on “one more drop and you’re out.”  
**Scenario:** A user sends 50 messages in a burst (40 allowed, 10 dropped → strikes=10). They wait 30 seconds for the bucket to refill, then send one message that happens to be rate-limited (strikes=11) → socket closes immediately.  
**Fix:** Reset `strikes` to 0 when a message succeeds (`bucket.ok`), or decay strikes over time, or only count consecutive drops.

#### 2. `CF-Connecting-IP` fallback shares a single rate-limit bucket (Medium)
**File:** `apps/worker/src/index.ts` (lines 143–147)  
**What goes wrong:** If the `CF-Connecting-IP` header is missing, the key becomes `'unknown'`. All such requests share one bucket. In production Cloudflare always sets the header, but in local dev (`wrangler dev`) or if a request bypasses Cloudflare, the header may be absent.  
**Scenario:** A developer running `wrangler dev` makes 10 room creates; the 11th gets 429 because all requests from the missing header hit the same `'unknown'` bucket.  
**Fix:** Either assert the header exists in production (`key = request.headers.get('CF-Connecting-IP')!`) or skip rate limiting when the header is missing (with a comment explaining why this is safe).

#### 3. Skip link hidden while Suspense fallback shows (Medium)
**Files:** `apps/web/src/App.tsx` (lines 207–220), `apps/web/src/styles.css` (lines 58–60)  
**What goes wrong:** The skip link is rendered when `page === 'game' || page === 'room'`, but CSS hides it via `.page:not(:has(#board)) .skip-link { display: none }`. While the code-split page loads, `Suspense` shows “Loading…” and the `Board` component (which has `id="board"`) is not yet in the DOM. The skip link is invisible during this window.  
**Scenario:** A keyboard user lands on `/room/ABC123`, tabs immediately, and the skip link is not in the tab order because the board hasn’t mounted yet.  
**Fix:** Render the skip link unconditionally on game/room pages (remove the `:has(#board)` guard) or give the loading fallback a focusable target.

#### 4. `onlineStore` writes to localStorage on every read due to fragile string comparison (Low)
**File:** `apps/web/src/game/onlineStore.ts` (lines 55–57)  
**What goes wrong:** `read()` compares `JSON.stringify({ v: 1, rooms: out }) !== text` to decide whether to rewrite the key. The original `text` from `localStorage` may have different whitespace or key order, causing a write on every read.  
**Scenario:** Every time the room page loads, `read()` is called, the string comparison fails, and `write()` is invoked unnecessarily.  
**Fix:** Compare parsed objects (`JSON.parse(text)`) instead of raw strings, or accept that the stored format is canonical and only write when entries actually change.

#### 5. `seen` timestamp not updated for rate-limited WebSocket messages (Low)
**File:** `apps/worker/src/room.ts` (lines 450–456)  
**What goes wrong:** When a message is dropped due to rate limiting, the attachment is updated with new `tokens` and `strikes` but `seen` stays at the last successful message’s time. The bucket refill calculation then uses a stale timestamp.  
**Scenario:** A user floods, gets 10 drops (strikes=10), stops for 10 seconds, then sends one message. The refill uses `now - seen` where `seen` is 10+ seconds old, so the bucket appears full even though the user just flooded. The message succeeds, but the stale `seen` makes future refill calculations inaccurate.  
**Fix:** Update `seen: now` in the dropped-message branch as well, or document why the stale timestamp is intentional.

---

### Not visible in the diff
- CSP header correctness (the diff only adds `/sw.js` and `/share.png` to `_headers`; the CSP itself is unchanged).
- Durable Object persistence bugs (no schema migration shown).
- WebSocket reconnection logic beyond the `nudge()` addition.

---

### Worth testing by hand
1. **Offline play:** Load the app, go offline (DevTools → Network → Offline), start a hot-seat game, make moves, reload the page → game persists.
2. **Service-worker update flow:** Deploy a new version (change any file), visit the app, keep a game in progress → “Reload for the new version” does **not** appear. End the game → notice appears. Click it → page reloads into new version.
3. **Per-address rate limits:** From one IP, make 11 `POST /api/rooms` in <60 s → 11th returns 429 with `Retry-After: 60`. Repeat for `GET /api/rooms/:code` (61st → 429) and WebSocket opens (31st → 429).
4. **Per-socket flood:** Open a room, send 50 JSON messages in <1 s → socket closes with code 1008 after the 10th drop. Reconnect, send 40, wait 2 s, send 11 more → 11th closes with 1008 (verifies strikes persist).
5. **Skip link:** On `/room/ABC123` or `/` (with a game), Tab once → “Skip to the board” appears, Enter → focus moves to the board (outline visible).
6. **Reduced motion:** Enable OS “Reduce motion” → no transitions/animations on any UI element.
7. **Online/offline banner:** On a room page, go offline → “You are offline…” banner appears. Go online → banner disappears, room reconnects automatically.
8. **Resign confirm focus:** In a 3-player game, press “Resign as Dragon” → focus lands on “Keep playing”. Press “Keep playing” → focus returns to the “Resign as Dragon” button.
9. **Code-splitting:** Visit `/privacy`, `/rules/standard`, `/build` → each page’s chunk loads on demand (Network tab shows separate JS file).
10. **Recovery SW (manual):** Replace `dist/sw.js` with `recovery-sw.js`, reload → caches cleared, SW unregisters, page loads from network with no worker.