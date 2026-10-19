# Handoff

Updated 2026-10-19 by S8 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. `packages/engine` now has the rules loader (`src/rules/loader.ts`): `validateRegistry`, `resolveRuleset`, `assertPlayable`, `RulesError`.
- `pnpm typecheck`, `lint`, `test` (121 tests), `validate:rules` pass. Both draft rulesets resolve with no nulls.
- Phase 0 owner steps S2, S5, S6 are still open.

## Next session
**S9 — Board and piece data formats** · Opus 5.5 · effort high
Why: S9 is design work (schemas for board and piece movement) that later engine steps depend on.
Start with: `/model opus`, `/effort high`, then `/start-session S9`

## Decisions in effect for the next step
- D1: build formats against a neutral fixture; real data arrives in S10 (default).

## Open questions for the owner
- Owner action: `main` is still unprotected. Import `.github/rulesets/main.json` in GitHub: Settings > Rules > Rulesets > New ruleset > Import a ruleset.
- Provisional loader choices (not in a decision): an override set to null is rejected; an `extends` parent must have the same player count. Say if either should change.
- Dependencies beyond the D21 list: `ajv` and `ajv-formats` (MIT) added to `packages/engine` (already used by `validate:rules`); plus `@types/node`, `@types/react`, `@types/react-dom`. TypeScript pinned to ~6.0.
- None blocking S9.

## Notes for Claude
- `gh pr` and `gh issue` fail in cloud sessions. Use `scripts/claude/ship.sh`.
- Prettier ignores `rules/`, `docs/`, `*.md` and the issue templates; do not reformat them.
- `validate:rules` accepts `--registry <file>`.
- Loader takes parsed JSON (engine stays pure); it imports the schemas from `rules/schema/`.
- Owner standing instruction: run `/end-session` automatically when the step is done; keep replies brief (facts and owner-blocking issues only).
