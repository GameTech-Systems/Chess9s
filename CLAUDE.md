# Chess Nines (Chess9s repo): project memory for Claude Code

## What this is
Chess Nines is a 9×9 chess variant (custom pieces and special squares). 2-player ships first; 3-player Dragon mode comes later. Rules are published as data so players can pick rulesets and propose new ones. Gameplay lives at chess9s.com. This repo is public.

## Current focus
Phase 0 (foundation) is done once Commit 1 lands. Next: Phase 1, scaffold the pnpm workspace (packages/engine, apps/web), the rules loader, and the board render. See docs/ROADMAP.md.
(Update this section at the end of every session.)

## Non-negotiables
- **Rules are data.** Never hardcode a piece rule. Read it from rules/parameters.json and the selected ruleset.
- **Do not invent game rules.** If a rule is unclear or open (default null, `needsDecision`), stop and ask the owner. All seed values in parameters.json are unverified.
- **Engine is pure TypeScript.** No DOM or UI imports, deterministic, N-player-ready turn order, check and checkmate computed from attack maps.
- **Test every parameter** at its default and at each option. Write the failing test first.
- **Official rulesets are immutable.** Never edit one. Create a new version.
- **2-player defaults must be fairness-checked** before they are published as a Candidate ruleset. Do not change a default without the owner's approval.
- **Public repo hygiene.** No secrets, no personal info, no unreleased art or lore. Never read .env or private paths. Do not create or commit art, lore, or characters.
- **Licensing.** Code is PolyForm Shield 1.0.0. Ask before adding any dependency, and never add GPL or AGPL ones. List third-party components in NOTICE.
- **Naming.** Product text says "Chess Nines". Chess9s.com is the web address.

## Planned stack
TypeScript, pnpm workspaces, Vite + React (static SPA), Vitest. Details in docs/decisions/0002-stack.md. Hosting: Cloudflare (provisional, docs/decisions/0003-hosting.md).

## Commands
Filled in after scaffolding (install, dev, test, lint, typecheck).

## Working style
- Plan mode before any change touching several files.
- One task per session. Commit after each green task with a clear message.
- Keep pull requests small. Ask before adding dependencies or changing structure.
- End each session with /end-session.

## Where things live
- rules/parameters.json: the variable registry. rules/rulesets/: named bundles. rules/schema/: JSON Schemas.
- docs/RULES-FRAMEWORK.md, docs/GOVERNANCE.md: how rules and ratification work.
- docs/decisions/: short decision records.
