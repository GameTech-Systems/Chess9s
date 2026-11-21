# Outside audit of S95 and S96, 21 Nov 2026

S96 (offline play, PR 95) ran before S95 (launch-readiness fixes, PR 100). This reading checks the code of both together, with each finding verified against the code.

## What was run
| Reading | Model and route | What it read | Report |
|---|---|---|---|
| S95 + S96 code | NVIDIA Nemotron 3 Ultra, OpenRouter (free tier) | The code diff `6a50a4d..e25faf9` (tests, docs and browser scripts left out) and a summary of both steps | `review-nemotron.md` |

Kimi K3.1 Pro and Mistral Large 4 on NVIDIA's API got the same prompt: both returned 502 after about 15 minutes, and Kimi, streamed (once at low reasoning effort), returned no text. No secrets or personal information were sent: the repo is public.

## Findings and what happens to them
| # | Finding | Verified | Severity | Outcome |
|---|---|---|---|---|
| 1 | The per-socket strike count never resets, so ten drops over a socket's life close it | Yes, as designed: S95 closes a socket on its tenth dropped message (provisional limit, D97). A browser sends a move or a ping at a time and never reaches the 40-message burst | Low | No change; D97 covers the values |
| 2 | A request without `CF-Connecting-IP` shares the key `unknown` | Cloudflare sets the header on every request in production; `worker:e2e` shows the per-address limit working on `wrangler dev` | — | No |
| 3 | The skip link is hidden while an on-demand page loads | Yes, by design: the link is hidden until there is a board to skip to | — | No |
| 4 | Reading seat records rewrites storage every time | No: the record is written in the same form it is read back, and a test counts the writes | — | No |
| 5 | A dropped message keeps the old `seen` time | `seen` staying is right (it also drives the idle timeout, so a flood does not keep a socket alive). The real fault was next to it: a drop stored the refilled token count, so the next message added the same refill again and a flooding socket got more than 20 messages a second until its tenth drop | Medium | **Fixed**: a drop keeps `tokens` too; test first (`room.test.ts`) |

## How S95 and S96 fit together (Claude's check)
- The precache takes every file under `assets/`, so the six pages S95 loads on demand work offline (`e2e-offline.mjs` passed in S95).
- `/api/*` and `sw.js` pass through the service worker, so S95's 429 and 503 answers are never cached.
- S95's privacy line on IP counting and S96's offline line and contact address are both on the privacy page, dated 21 November 2026.
