# Handoff

Updated 2026-10-22 by S27 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3. Repo side of the deploy is done, not live: `wrangler.jsonc` (Workers Static Assets, SPA fallback), `apps/web/public/_headers` (strict CSP, no unsafe-eval, `worker-src 'self'`, HSTS and others), `/privacy` page, error screen (boundary plus window fallback), "Suggest a variant" footer link, real title and description.
- The web build has no Ajv: Vite swaps `schema-check.ts` for `schema-check.static.ts`; `pnpm build` runs `validate:rules` first. Web bundles: 94 kB gzip page, 71 kB worker. CI now runs `pnpm build` and `scripts/check-dist.mjs`.
- Checked with `wrangler dev` on the built dist in Chromium, desktop and Pixel 7: a full game to checkmate against the computer through the Worker, no console or CSP errors, deep links return the app. 1248 tests pass.

## Owner: connect Cloudflare (D41, provisional)
- Workers & Pages → Create → Import a repository → GameTech-Systems/Chess9s, branch `main`. Project name `chess9s` (must match `wrangler.jsonc`).
- Root directory: `/`. Build command: `pnpm install --frozen-lockfile && pnpm build`. Deploy command: `npx wrangler deploy`. Non-production branches: `npx wrangler versions upload`.
- Then add chess9s.com as a custom domain on the Worker. Don't announce: S26 and S29 come first.

## Next session
S26 is an owner chat step. After the owner connects the repo and domain, the next Claude Code step is S28/S29 prep, only if the owner says so.

## Decisions in effect for the next step
- D15 (applied) and D41 (provisional): see BUILD-PLAN. Decision 0009 (search, sharded runs).

## Open questions for the owner
- Project contact address for the privacy page. Default: the placeholder `PROJECT_CONTACT_ADDRESS` (in `apps/web/src/links.ts`) stays.
- TRADEMARKS.md and NOTICE name a person ("Duke Johnson") as rights holder. Left as is; confirm that is intended given the pen-name rule.
- SECURITY.md claims and repo settings (S2, I1) were not touched; they are still off.
- The favicon is still the empty `data:,` placeholder (no art was created). Which image?
- Still open: Sim depth 2 run for S26; Ting Yang art; provisional S22a rules; earlier items in the S25 handoff (computer heuristics, undo, Coast, 3-player).

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs. Playwright: `/opt/node-tools/node_modules/playwright-core`; Chromium `/opt/pw-browsers/chromium`. `npx wrangler dev` serves the dist with `_headers` applied.
- Wrangler is a root devDependency (MIT OR Apache-2.0). `ci.yml` still uses v4 actions.
