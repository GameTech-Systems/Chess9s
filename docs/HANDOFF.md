# Handoff

Updated 2026-10-24 by S36 (Opus 5.5 · high, owner with Claude in chat). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3, testers playing (S29). S36 from the owner's playtest: readable "?" rules dialog (dark panel, Escape, focus trap and return); pawn tokens ringed in their starting file's color (`pawnColor` in `board/view.ts`, from the board data; E pawns green, I pawns none); presets Standard (`standard-2p` 0.1.0, King range 1, the new default), Good Practice (`draft-2p` 0.2.0 renamed, rules unchanged) and Easy Start (`easy-2p` 0.1.0); a rules page per ruleset at `/rules/<id>` (`RulesPage.tsx`, every setting from the data); decision 0011.
- Standard depth 1: passes, first-player score 50.2% (95% interval 48.0–52.4%) over 2,000 games, draw rate 46.0% (Good Practice: 49.0%, 40.6%); `docs/fairness/standard-2p.md`. Depth 2 not run yet, so Standard is `experimental` although it is the default.
- Legal audit: the bundles carried React's code without its MIT notice; the build now writes `third-party-licenses.txt` (Vite `build.license`), `check-dist.mjs` checks it, the footer links it. Privacy page: date, children, Do Not Track, GitHub links, Discussions as the contact until I34. Footer: © and ™ line. Discussions forms require the contribution terms. No web fonts exist: system font stack only, nothing fetched.
- Checked in Chromium (desktop and phone size) through `wrangler dev`: dialog, rings, picker and rules page render, no console or CSP errors. 1264 tests pass.

## Next session
Owner first (S37): Actions → **Sim depth 2** → Run workflow with ruleset `standard-2p`. Then **S38 — Publish Standard as a Candidate** · Sonnet 5.5 · medium, once that run is green. Meanwhile **S39 — Option labels and groups** · Sonnet 5.5 · medium can start: `/start-session S39`.

## Decisions in effect for the next step
- D43 (default): Standard goes to the tournament discussion once it passes both depths; Good Practice stays a Candidate.
- D44, D45, D46 (defaults, for S40 and S43): see BUILD-PLAN.

## Open questions for the owner
- I34: a project contact address. Default: the privacy page points to Discussions.
- Favicon is still the empty `data:,` placeholder. Ting Yang art still open.

## Notes for Claude
- Engine and sim tests still use `draft-2p` (Good Practice); web tests that replay the hot-seat fixture or castle by stepping 2 squares pin `draft-2p` too.
- `RulesScreen` reads `onClose` through a ref: the game re-renders every second.
- `npx wrangler dev` leaves `.wrangler/` (now ignored by ESLint too).
