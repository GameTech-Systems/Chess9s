# Chess Nines (Chess9s repo): project memory for Claude Code

@docs/HANDOFF.md

## What this is
Chess Nines is a 9×9 chess variant (custom pieces and special squares). 2-player ships first; 3-player Dragon mode comes later. Rules are published as data so players can pick rulesets and propose new ones. Gameplay lives at chess9s.com. This repo is public and source-available (PolyForm Shield 1.0.0), never "open source".

## Session protocol
1. **Start** with `/start-session S<n>`. One build-plan step per session, one pull request per step. The step list is `docs/BUILD-PLAN.md`; read only your step's section.
2. **Model and effort** come from the step (or the owner's pasted ledger brief). If the session runs on something else, give the owner the exact commands (`/model sonnet`, `/effort medium`) at the top of your first reply. Don't switch models mid-session yourself: it drops the prompt cache.
3. **Plan** before any change that touches several files: write the plan in your reply and go ahead without waiting for approval (owner instruction, S11). Don't use plan mode. **Write the failing test first.** Commit after every green task.
4. **End** automatically with `/end-session` when the step is done (no prompt needed). Keep replies brief: facts, plus problems the owner must resolve before the next session. `/end-session`: checks, handoff, log, PR, CI, merge, and the next-session recommendation with a `ledger-sync` block. If usage is running low, run it early; unfinished work stays on its branch.

## Decisions and defaults
- Owner decisions are made in a private ledger. Public ones reach you through the owner's brief, the "Decision defaults" table in `docs/BUILD-PLAN.md`, and `docs/decisions/`.
- **Defaults, not stalls.** When a step needs an open decision, apply its default, mark it provisional (in the data's `source` or `notes`, or a code comment), list it in the handoff, and keep going.
- **Never invent rules.** You may only choose among options already listed in `rules/parameters.json` or in a decision. New pieces, movement, squares, parameters, or options come from the owner. If none exists, record the question in the handoff and work on the rest of the step.

## Pull requests and merging
- Claude opens and merges its own PRs; the owner does not approve them. Use `scripts/claude/ship.sh` (it uses the GitHub REST API, because `gh pr` and `gh issue` fail in cloud sessions).
- Merge only when CI is green. Never push to `main`, never force-push `main`, never merge a partial step with failing tests.
- Merge method: rebase (decision D8). It keeps per-task commits and their authorship.
- Sign off every commit (`git commit -s`). A DCO check runs on every PR and fails without it (decision D22).

## Non-negotiables
- **Rules are data.** Never hardcode a piece rule. Read it from `rules/` and the selected ruleset.
- **Test every parameter** at its default and at each option.
- **Official rulesets are immutable.** Changes ship as a new version.
- **2-player defaults must be fairness-checked** before they are published as a Candidate. Don't change a default without the owner's decision.
- **Public repo hygiene.** No secrets, no personal information (names, emails, addresses), no unreleased art or lore. Never read `.env` or private paths. Don't create art, lore, or characters.
- **Dependencies.** Only permissive licenses (MIT, BSD, Apache-2.0, ISC). Never GPL, LGPL, or AGPL. Use the pre-approved list in the step; anything else, note it in the PR and the handoff. List third-party components in NOTICE.
- **Naming.** Product text says "Chess Nines". Chess9s.com is the web address.

## Stack
TypeScript, pnpm workspaces (`packages/engine`, `packages/sim`, `packages/online`, `apps/web`, `apps/worker`), Vite + React static SPA, Vitest. One Cloudflare Worker serves the app and the rooms (`wrangler.jsonc`, decision D50). See `docs/decisions/0002-stack.md`. Hosting: Cloudflare, provisional (`docs/decisions/0003-hosting.md`).

## Commands
Node 22, pnpm 10 (pinned in `package.json`).
- `pnpm install`: install dependencies.
- `pnpm dev`: serve the web app (Vite).
- `pnpm build`: build all workspaces.
- `pnpm test`: Vitest, whole repo.
- `pnpm lint`: ESLint and Prettier check.
- `pnpm typecheck`: `tsc --noEmit` in every workspace.
- `pnpm validate:rules`: Ajv-validate `rules/` against `rules/schema/`.
- `pnpm rules:index`: rewrite `packages/online/src/rules-index.ts` after adding or removing a file in `rules/` (a test fails until you do).
- `pnpm sim [--games n --depths 1,2 --sweep --set id=value --shard K/N --ruleset-file f]`: bot self-play; writes a fairness report to `docs/fairness/` (decision 0008). `--ruleset-file` checks a submitted ruleset file (GOVERNANCE, Submitted rulesets).
- `pnpm sim:merge <shards> [--with report]`: builds the fairness report from shard files (decision 0009). The `Sim depth 2` workflow runs the shards on GitHub.
- `pnpm lock write|add-keys|archive <ruleset id>`: ruleset locks and kept versions (RULES-FRAMEWORK, Locks and kept versions). Never overwrites a lock.
- `pnpm worker:check`: `wrangler deploy --dry-run` (bundles the Worker). `pnpm worker:e2e`: after `pnpm build`, plays a game through `wrangler dev` with two WebSocket clients.
- `node apps/worker/scripts/e2e-browser.mjs` (after `pnpm build`): two Chromium contexts play the 80-move game through `wrangler dev` by clicking, with a reload at move 40, at desktop and Pixel 7 width. Needs Playwright (not a repo dependency); `SHOTS=<dir>` saves screenshots.
- `pnpm bench [--depth 2]`: search benchmark: positions per move, moves that hit the cap, same results as the S23 search (decision 0009).

## Where things live
- `docs/HANDOFF.md`: current state and the next session (rewritten every session). `docs/sessions/LOG.md`: one line per session.
- `docs/BUILD-PLAN.md`: every step, its model and effort, done-when checks, and decision defaults.
- `rules/parameters.json`: the variable registry. `rules/rulesets/`: named bundles. `rules/schema/`: JSON Schemas.
- `.claude/rules/`: extra instructions that load only when you touch matching paths (engine, rules data).
- `docs/RULES-FRAMEWORK.md`, `docs/GOVERNANCE.md`, `docs/decisions/`.
