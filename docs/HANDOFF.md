# Handoff

Updated 2026-11-21 by S97 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 7. S97 done: README rewritten for today (play now, what is built, `wrangler dev` for rooms); `docs/launch/press.md`; post drafts for each D91 channel in `docs/launch/posts.md`; ten screenshots in `docs/launch/screenshots/` made from the built app by `apps/web/scripts/press-shots.mjs` (no new art); a Feedback link in the footer (`FEEDBACK_URL`, `apps/web/src/links.ts`).
- The Feedback link points at the Discussions page for now (provisional). When the owner pins the "Launch feedback" Discussion (S98), set `FEEDBACK_URL` to its address and replace `[Feedback link]` in `docs/launch/posts.md`.
- I removed the README's "Story and lore (coming soon)" line (chessnines.com is not live as far as the repo says); add it back when the site is.
- Typecheck, lint, validate:rules and build are green; 3,073 tests pass.

## Next session
**S98 — Launch decisions** · Opus 5.5 · effort medium (owner with Claude in chat)
Why: Gate 1 still needs the owner's items: GitHub settings (S2), Cloudflare checks (D96), the pinned Discussion, testers; the owner reads the S97 drafts. No Claude build step is ready until the soft launch (S29) finds something for S99.
Start with: `/start-session S98`

## Decisions in effect for the next step
- D91: the owner posts, one channel a day; Claude drafts, never posts (decided). D93: no fixed launch day (decided).
- D94: no analytics script (decided). D92: GameTypeBrand@gmail.com (decided).
- D98: privacy page IP-counting wording stays (open, default).
- D44: the owner says its note is stale (the game was tested since); S40's "open to every piece" stands.

## Open questions for the owner
- D7: you prefer Claude pushing straight to main. Today CLAUDE.md requires PRs, green CI and rebase merge, and `.claude/settings.json` denies `git push origin main*`. Say "change it" and a session edits CLAUDE.md, the skills, `ship.sh` use and the deny rule; until then PRs apply. D10 (opusplan) still conflicts with the pinned Sonnet.
- Wording to approve before S100: the "about 50%" fairness claims (bot results), the press page contact line, and all post drafts.
- D95: GameTypeBrand@gmail.com in `security.txt` and SECURITY.md? Default: no.
- Carried over: OpenRouter credits, turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, favicon, Ting Yang art, the "hollow tetrahedral bases" line, larger source PNGs, security.txt renewal before 2027-11-01.

## Notes for Claude
- Read `docs/decisions/LEDGER-SNAPSHOT.md` for decisions; its precedence line says what wins.
- Regenerate screenshots with `pnpm build && node apps/web/scripts/press-shots.mjs` (needs Playwright).
- workerd refuses a number (or string) export from `apps/worker/src/index.ts`; a test checks it.
- Pages that render the app in tests need `beforeAll(preloadPages)`; add new on-demand pages to `ON_DEMAND`.
