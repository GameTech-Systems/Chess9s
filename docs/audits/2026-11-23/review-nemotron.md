# Outside audit: Good Practice and the live site

Model: NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b:free`) through OpenRouter's free tier, 23 Nov 2026. It read the Good Practice change (rulesets, registry defaults, decision 0027, the code diff, the RULES.md presets table) and the live site's headers and measured facts, `index.html`, `_headers`, the privacy and How to play pages, the Worker entry, `wrangler.jsonc` and SECURITY.md. Kept as it answered; Claude's verification of each finding is in SUMMARY.md. A second run on NVIDIA's own API (same model) agreed on Part A and on findings 1 to 3.


### Part A: Rules Data Change Verification

**Result: PASS** — Good Practice (`draft-2p`, `draft-3p` v0.5.0) is now exactly Standard (`standard-2p`, `heavy-h3-3p`) plus `king.range = 2` for both player counts. All player-facing descriptions in the provided files are accurate.

### 2-player: `draft-2p` vs `standard-2p`
- `standard-2p` overrides: `{ "king.range": 1 }` (registry default is 2)
- `draft-2p` overrides: `{}` → uses registry default `king.range = 2`
- All other settings identical (registry defaults). ✓

### 3-player: `draft-3p` v0.5.0 vs `heavy-h3-3p`
| Setting | Registry Default | `heavy-h3-3p` | `draft-3p` v0.5.0 |
|---------|------------------|---------------|-------------------|
| `king.range` | 2 | 1 | **2** |
| `coast.3p.attackFrom` | "allowed" | "coast-only" | "coast-only" |
| `coast.3p.capturable` | false | true | true |
| `dragon.3p.defeat` | "tail-or-pieces-in-duel" | "pieces-and-tail" | "pieces-and-tail" |
| `tail.3p.stone` | "swap" | "where-it-stands" | "where-it-stands" |
| `dragonHead.range` | 8 | 3 | 3 |
| `tail.3p.range` | 8 | 8 | 8 |

Only `king.range` differs. ✓

### Description Accuracy Check
| Source | `draft-2p` | `draft-3p` | `heavy-h3-3p` | Verdict |
|--------|------------|------------|---------------|---------|
| ruleset JSON | ✓ | ✓ | ✓ | Accurate |
| `HowToPlay.tsx` HOW_TO_PRESETS | ✓ | ✓ | ✓ | Accurate |
| `RulePicker.tsx` PRESET_SUMMARIES | ✓ | ✓ | ✓ | Accurate |
| `docs/RULES.md` tables | ✓ | ✓ | ✓ | Accurate |

No false or stale sentences found in provided files. The archived `draft-3p@0.4.0.json` is deprecated and not player-facing.

---

### Part B: Launch Readiness Findings

| # | Severity | File / URL | What Is Wrong | Concrete Fix |
|---|----------|------------|---------------|--------------|
| 1 | **Blocker** | `https://www.chess9s.com/` | `www` subdomain returns Cloudflare 404; app not served. | Add DNS `www` CNAME → `chess9s.com` + Cloudflare Page Rule/Redirect Rule: `www.chess9s.com/*` → `https://chess9s.com/$1` (301). |
| 2 | **Blocker** | `http://chess9s.com/` | HTTP returns 200 (no redirect to HTTPS). | Enable Cloudflare “Always Use HTTPS” or add Worker fetch handler: `if (url.protocol === "http:") return Response.redirect(url.href.replace("http:", "https:"), 301)`. |
| 3 | **High** | CSP / `apps/web/public/_headers` | CSP blocks Cloudflare Web Analytics beacon (`static.cloudflareinsights.com/beacon.min.js`), causing console error. Owner decided “no analytics” (D94). | Disable Cloudflare Web Analytics in Cloudflare dashboard (Speed → Optimization → Web Analytics). If kept, add `static.cloudflareinsights.com` to `script-src` and `connect-src`. |
| 4 | **High** | `apps/worker/src/index.ts:112` | `allowedOrigin` allows `https://chess9s.com`, preview origins, localhost — **excludes `www.chess9s.com`**. If www is fixed (finding 1), room creation/join from www will be rejected (403). | Add `APP_ORIGIN_WWW = 'https://www.chess9s.com'` and allow it in `allowedOrigin`. |
| 5 | **Medium** | `apps/web/public/_headers` + `wrangler.jsonc` | `not_found_handling: "single-page-application"` serves `index.html` (200) for **all** unknown paths (e.g., `/no-such-page`). No true 404s for SEO; soft-404s may hurt indexing. | Keep SPA fallback for client routes. Add a `sitemap.xml` (generate at build) listing all canonical URLs. Ensure `/rules/<id>` pages exist for listed rulesets. |
| 6 | **Medium** | `robots.txt` (not visible) | Cloudflare managed robots.txt blocks AI crawlers; repo’s own robots.txt appended. Content not shown — cannot verify `Allow`/`Disallow` for game pages. | Publish repo’s `robots.txt` in packet. Ensure it allows `/`, `/rules/*`, `/play/*`, `/privacy`, `/how-to-play`. Disallow `/api/*`, `/sw.js`. |
| 7 | **Medium** | `index.html` | No `sitemap.xml` referenced; no JSON-LD structured data (WebApplication/Game) for rich snippets. | Add `<link rel="sitemap" href="/sitemap.xml">`. Generate `sitemap.xml` at build. Add JSON-LD: `@type: "WebApplication", "applicationCategory": "Game", "operatingSystem": "Browser"`. |
| 8 | **Medium** | `index.html` → `og:image` / `twitter:image` | Points to `https://chess9s.com/share.png` (1200×630). File existence/size not verified in packet. | Verify `apps/web/public/share.png` exists, is 1200×630, < 5 MB, and depicts the board with Coast. |
| 9 | **Low** | `apps/web/src/Privacy.tsx` | Claims “no analytics” but Cloudflare injects Web Analytics beacon (finding 3). Claims “no cookies” — Cloudflare may set `__cf_bm` (bot management). | Update privacy page: “Cloudflare may set a bot-management cookie (`__cf_bm`) and inject a Web Analytics beacon; we do not use either for tracking.” Or disable both in Cloudflare dashboard. |
| 10 | **Low** | `apps/worker/src/index.ts:180` | Catch-all `try/catch` returns generic 503 (“Rooms are not answering just now”). Swallows Durable Object errors; no logging/alerting. | Keep user-facing 503. Add `console.error` (visible in Worker logs) or send to observability (e.g., Sentry) before returning. |
| 11 | **Low** | `apps/web/public/_headers` | `Permissions-Policy` lists `payment=(), usb=()` — unnecessary but harmless. | Remove unused directives for clarity. |
| 12 | **Low** | Accessibility (source review) | No visible red flags: `lang`, viewport, `noscript`, `type="button"`, `rel="noopener noreferrer"`, `aria-labelledby`, alt text claimed present. Cannot verify color contrast, keyboard focus order, or ARIA live regions from source. | Manual audit at 320px, 400% zoom, keyboard-only, screen reader (NVDA/VoiceOver). Ensure focus indicators, live regions for move announcements, sufficient contrast (≥4.5:1). |
| 13 | **Info** | `apps/worker/src/index.ts` | Rate limits (10 rooms, 30 sockets, 60 info/min per IP) enforced via Cloudflare bindings + dashboard backstop. `CF-Connecting-IP` used — correct. | No action; confirm dashboard rate-limit rules match `wrangler.jsonc` (S98). |
| 14 | **Info** | `SECURITY.md` | Vulnerability reporting points to GitHub Security tab and `GameTypeBrand@gmail.com`. No `security.txt` at `/.well-known/security.txt` (listed in `_headers` but file not shown). | Add `/.well-known/security.txt` with `Contact: mailto:GameTypeBrand@gmail.com`, `Preferred-Languages: en`, `Policy: https://github.com/<repo>/security/policy`. |

---

### Files Not Visible / Cannot Verify
- `robots.txt` (repo version) — content not in packet
- `sitemap.xml` — not generated/present in packet
- `share.png` — existence/dimensions not confirmed
- `/.well-known/security.txt` — listed in `_headers` but file not shown
- `apps/web/public/_redirects` — not shown (could handle www/HTTP redirects at edge)
- Full `Privacy.tsx` imports (`CONTACT_ADDRESS`, `DISCUSSIONS_URL` from `./links`) — values not shown
- Client-side JS bundle — cannot audit runtime a11y, CSP violations beyond beacon

---

### Summary
**Part A**: Clean. The ruleset change is correctly implemented and all checked descriptions are true.  
**Part B**: Two **blockers** (www 404, missing HTTPS redirect), one **high** (CSP vs injected analytics + www origin), several **medium** (SEO/404 handling, robots/sitemap, share image, structured data). Fix blockers + high before soft launch; medium items within first week.