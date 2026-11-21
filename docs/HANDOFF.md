# Handoff

Updated 2026-11-21 by S33 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 7 is planned: `docs/LAUNCH.md` (gates, channels, timeline, success signals, risks), decision 0025 (offline play for hot-seat and computer games, D88 decided by the owner), steps S95 to S102 in `docs/BUILD-PLAN.md`, defaults D88 to D94. No app code changed.
- Outside audits in `docs/audits/2026-11-20/`: product (NVIDIA Nemotron 3 Ultra), security (Kimi K3.1 Pro on NVIDIA), and a reading of the plan (Ernie 5.5 Flash on OpenRouter). `SUMMARY.md` verifies every finding and says which step takes it; the wrong ones are marked "no".
- Blockers for the public launch: offline play (S96), per-address limits on making rooms and opening sockets (S95, K1), README (S97).
- Claude's own checks: axe-core finds no violations on seven pages at 1280 and 375 px; no overflow, no console errors; a reload offline fails today (no service worker).
- Typecheck, lint, validate:rules green; 3,016 tests pass.

## Next session
**S95 — Launch-readiness fixes from the S33 audits** · Opus 5.5 · effort high
Why: the room limits (K1, K2) and the Worker's error boundary are security work on the live site, and S96 builds on the code-split bundle.
Start with: `/start-session S95`

## Decisions in effect for the next step
- D88: offline play for hot-seat and computer games only (decided, S96 builds it).
- D89 to D94: defaults as in the table (hand-written service worker, update waits for no game in progress, owner posts, no email address, launch Tue 12 Jan 2027, no analytics script).

## Open questions for the owner
- D91 to D94 and I34 (contact address): settle them in S98, before S97 writes the posts. Defaults apply until then.
- OpenRouter's account has no credits, so only free models run there; NVIDIA's API ran the paid-tier models. Add credits if you want GPT or Gemini readings next time.
- S2 (GitHub security settings) is still `todo`; S98 asks you to confirm it.
- Carried over: turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, `coast.openToAll`, favicon, Ting Yang art, the "hollow tetrahedral bases" line, larger source PNGs for sharper 2x art, security.txt renewal before 2027-11-01.

## Notes for Claude
- S95: read only `SUMMARY.md`'s rows marked "fix in S95" (rows 3, 4, 6, 8, 9, 11 and K1 to K5, K7) and I37. Check whether the Workers rate-limiting binding works on the free plan and in `wrangler dev`; if not, say so for S98.
- Outside readings: `curl` or Python to `integrate.api.nvidia.com` and `openrouter.ai` (the proxy adds the keys). NVIDIA reasoning models time out unless streamed; Kimi needs `reasoning_effort: low` or it spends every token thinking.
- Reports come from workflow artifacts; restate seats as dark / light / Dragon.
- A new parameter makes lock tests fail until `pnpm lock add-keys`; new ruleset files need `pnpm rules:index`.
- Browser scripts need Playwright and `pnpm build` first; `e2e-browser-clock` takes about three minutes.
