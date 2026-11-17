# Handoff

Updated 2026-11-17 by Play online pass (Sonnet 5.5 · low). `/end-session` rewrites this file; keep it under 40 lines.

## State
- The home page shows the owner's Coast piece art: WebP at 1x (220×382) and 2x (440×764) with `srcset`, in `assets/brand/pieces/`; the five original PNGs are in `assets/brand/pieces/src/`. The SVG wrappers are gone. The emblem and the board's piece symbols stay SVG.
- One crop (248×430 px of each 952×1652 PNG) is used for all five, so they share one scale and one baseline. No halo or baked shadow on light or dark backgrounds. The home row's labels sit on a subgrid so the bases line up however a label wraps.
- Page weight: about 97 KB at 1x, about 247 KB at 2x (a device loads one set). Images are same-origin, so the Content-Security-Policy (`img-src 'self' data:`) is unchanged and the browser logged no violations.
- How to play (`/how-to-play`, footer link) is a general walkthrough with no ruleset named until its presets list; per-ruleset pages stay at `/rules/<id>`. Footer legal line: "© 2026 Chess Nines™ is a trademark of Duke Johnson."
- Rules pages and the rules dialog compare a ruleset with Standard (the default for 2 and 3 players), not the registry defaults, which are unchanged. "Save board image" (games and rooms) makes a 1200×630 PNG card in the browser; `share.png`, `robots.txt`, `sitemap.xml` and per-page tab titles are in.
- Play online: "Your seat" and (3 players) "Played by computer" labels over the seat buttons, a line on how seats are given out, and Show only explained in plain words (also in the hot-seat picker). Time control menu options now readable (panel ground, ink text).
- Site files in `apps/web/public/`: `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`, `.well-known/security.txt` (GitHub private reporting, expires 2027-11-01), cache rules in `_headers`. CSP gains `manifest-src 'self'` (also in the Worker). `index.html` has canonical (kept per page by the app), og/twitter tags, icon and manifest links, a noscript fallback.
- Typecheck, lint, validate:rules green; 3,016 tests pass.

## Next session
**S33 — Phase 7: Growth (planning)** · Opus 5.5 · effort high
Why: no build step is left in Phase 6; the plan says each later phase opens with a planning session that replaces its placeholder with detailed steps.
Start with: `/start-session S33`

## Decisions in effect for the next step
- D87: raster art, WebP at 1x and 2x, no SVG wrapper (applied).

## Open questions for the owner
- The source PNGs are only about 215×390 px of art inside a 952×1652 canvas, so the 2x files are upscaled and not truly sharper than 1x. For crisp art on phones, upload larger PNGs (about 880×1530 px of art, same framing) and S94's script step can be rerun. Default: keep what is there.
- security.txt expires 2027-11-01: renew it before then. Default: do nothing until October 2027.
- Carried over: turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, `coast.openToAll`, I34 contact, favicon, Ting Yang art, wording of the home page "hollow tetrahedral bases" line.

## Notes for Claude
- Reports come from workflow artifacts; restate seats as dark / light / Dragon.
- A new parameter makes lock tests fail until `pnpm lock add-keys`; new ruleset files need `pnpm rules:index`.
- Browser scripts need Playwright and `pnpm build` first; `e2e-browser-clock` takes about three minutes.
- Icons (192, 512, ico) were rendered from `assets/brand/emblem.svg` and `favicon.svg` with Chromium; apple-touch-icon is a copy of the released file.
- Piece art was made with Pillow: crop box (352,714,600,1144), Lanczos resize, WebP quality 88.
