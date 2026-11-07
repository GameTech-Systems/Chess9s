# Handoff

Updated 2026-11-07 by S93 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- No Tournaments page, footer link, tournament invitation or tournament wording in the app. `/tournament` shows the home page. README, ROADMAP and GOVERNANCE say tournaments are a later phase, once there are players (D86). Discussion 39: nothing posted; Standard (2-player) stays a Candidate.
- Browser e2e scripts fixed and run green: `e2e-3p`, `e2e-clock`, `e2e-browser`, `e2e-browser-3p`, `e2e-browser-clock`. Hidden 3-player rulesets open from `/rules/<id>` with the Play button; the 3-player tab's cards drop "(3-player)".
- Plain-words test now flags a lone D1–D9 or I1–I9 by context (in a bracket of codes, after "decision"/"default", or with a sub-number); a bare D5 among squares passes. Setting ids removed from two descriptions and guarded by a test.
- First-visitor walk at 375 and 1280 px (home, rules 2p and 3p, hot-seat 2p and 3p, builder, privacy, room page, unknown-rules screen, `/tournament`): no file paths, step or decision codes, "provisional" or versions found after the fixes above. The unknown-rules screen now lists only the six preset rulesets. "Not in this build yet" became "Not available yet".

## Next session
**S94 — Coast piece art from the owner's PNGs** · Sonnet 5.5 · effort low
Why: planned next; blocked until the PNGs are in `assets/brand/pieces/src/` (not there at the end of S93).
Start with: `/start-session S94`

## Decisions in effect for the next step
- D87: raster art, WebP at 1x and 2x, no SVG wrapper (default).

## Open questions for the owner
- Upload the five Coast piece PNGs to `assets/brand/pieces/src/` or S94 cannot start.
- Wording the owner may want to set: the home page line about "hollow tetrahedral bases" (board-game text), and the room page error "Could not reach the room" (fine as is). No new copy was invented.
- Carried over: turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, `coast.openToAll`, I34 contact, favicon, Ting Yang art.

## Notes for Claude
- Reports come from workflow artifacts; restate seats as dark / light / Dragon.
- A new parameter makes lock tests fail until `pnpm lock add-keys`; new ruleset files need `pnpm rules:index`.
- Browser scripts need Playwright and `pnpm build` first; `e2e-browser-clock` takes about three minutes.
