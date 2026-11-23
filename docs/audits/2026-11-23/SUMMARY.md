# Launch audit, 23 Nov 2026

Two questions from the owner: is Good Practice now Standard plus a 2-square King everywhere (the S98 follow-up, decision 0027), and is chess9s.com ready for testers?

## What was run
| Reading | How | Result |
|---|---|---|
| Effective settings | Every setting of each ruleset (registry default unless overridden), compared pairwise | `draft-2p` vs `standard-2p` and `draft-3p` 0.5.0 vs `heavy-h3-3p`: only `king.range` differs (2 vs 1) |
| Player-facing text | Ruleset descriptions, How to play, home summaries, RULES.md, the live rules pages | Live `/rules/draft-3p` lists one difference from Standard: "King range: 2 squares (Standard: 1 square)". Three stale lines in RULES.md, fixed (below) |
| Local checks | typecheck, lint, validate:rules, 3,076 tests, build; `e2e-3p.mjs`, `e2e-browser-3p.mjs`, `e2e-offline.mjs` | Green. The local build's bundle (`index-Bi1Yin-2.js`) is the one chess9s.com serves, so the live site is current with `main` |
| Live site | curl for headers and every sitemap URL; Chromium on each sitemap page at desktop, Pixel 7 and 320 px | No overflow, no image without alt, no unnamed button; findings below |
| Outside reading | Nemotron 3 Ultra (OpenRouter free; again on NVIDIA's API). GLM 5.3 Flash on NVIDIA returned 502; Gemma 4 on OpenRouter free returned 429 | `review-nemotron.md`. Only public repo files and the measured facts were sent |

## Findings and what happens to them
| # | Finding | Verified | Severity | Outcome |
|---|---|---|---|---|
| 1 | `https://www.chess9s.com/` answers Cloudflare's 404 | Yes | High | **Owner, S103**: a redirect rule `www.chess9s.com/*` → `https://chess9s.com/${1}` (301), with a proxied `www` DNS record. Redirect, don't serve: the Worker only accepts the apex origin for rooms |
| 2 | `http://chess9s.com/` serves the page instead of redirecting | Yes (HSTS protects only after the first HTTPS visit) | High | **Owner, S103**: SSL/TLS → Edge Certificates → Always Use HTTPS on |
| 3 | Cloudflare injects its Web Analytics beacon (`static.cloudflareinsights.com/beacon.min.js`) into the home page | Yes, on every load at every width. The CSP blocks it, so nothing is sent, but each visitor gets a console error, and the privacy page says "no analytics" (D94) | High | **Owner, S103**: turn Web Analytics off for chess9s.com (Analytics & Logs → Web Analytics; remove the site or its automatic setup). Don't allow it in the CSP |
| 4 | Three lines in RULES.md still described the old Good Practice (Original Dragon rules as "Good Practice with a 1-square King"; "the full Dragon rules of Good Practice") | Yes (Claude; the outside reading saw only the table) | Medium | **Fixed** in this session |
| 5 | Unknown paths answer 200 with the home page | Yes | Low | Already I47 (a not-found page); stays for S99 or later |
| 6 | Responses carry Cloudflare's `report-to`/NEL header (network error reports to Cloudflare) | Yes; no cookie is set (`Set-Cookie` absent) | Low | Owner may leave it: it is Cloudflare's own delivery reporting, not analytics. Listed in the handoff |
| 7 | Allow `www` as a room origin | Not needed once finding 1 redirects | — | No |
| 8 | Missing sitemap, `security.txt`, share image, skip link, focus styles; relative favicon paths | No: all exist (sitemap with 9 URLs, `security.txt` until 2027-11-01, `share.png` 1200×630, a skip link, `:focus-visible`); built paths are absolute | — | No |
| 9 | Turn `not_found_handling` off; JSON-LD; HSTS preload; log Worker errors | Choices, not faults: the SPA needs the fallback, Workers Logs is off by owner decision (S98) | — | No; preload is the owner's call after finding 2 |
| 10 | Ledger: I42 (README out of date) still open | S97 rewrote the README; no "coming soon" remains | — | Resolved in the ledger |
