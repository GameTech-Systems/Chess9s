# Handoff

Updated 2026-10-19 by S7 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 1. pnpm workspace is on `main`: `packages/engine` (stub), `apps/web` (blank Vite + React shell), Vitest, ESLint, Prettier, strict tsconfig.
- `pnpm typecheck`, `lint`, `test` (3 tests) and `validate:rules` pass. CI job `ci` is in `.github/workflows/ci.yml`.
- Labels `rule-proposal`, `movement-proposal`, `balance-report`, `playtest` exist.
- Phase 0 owner steps S2, S5, S6 are still open.

## Next session
**S8 — Rules loader and registry fixes** · Sonnet 5.5 · effort medium
Why: S7 went smoothly; S8 is well-specified loader work with the D2/D3/D5/D6 fixes already decided.
Start with: `/start-session S8`

## Decisions in effect for the next step
- D2, D3, D5, D6: decided in rule set v0.2 (see `docs/BUILD-PLAN.md`).
- D8: rebase merges (default). D22: sign off every commit.

## Open questions for the owner
- Owner action: the `main` ruleset could not be applied (the session proxy returns 403 for `POST /rulesets`). Import `.github/rulesets/main.json` in GitHub: Settings > Rules > Rulesets > New ruleset > Import a ruleset. Until then `main` is unprotected.
- Dependencies beyond the D21 list: `@types/node`, `@types/react`, `@types/react-dom` (MIT, needed for typecheck). TypeScript is pinned to ~6.0 because typescript-eslint does not yet accept 7.x.
- None blocking S8.

## Notes for Claude
- `gh pr` and `gh issue` fail in cloud sessions. Use `gh api` REST calls or `scripts/claude/ship.sh`.
- Prettier ignores `rules/`, `docs/`, `*.md` and the issue templates; do not reformat them.
- `validate:rules` accepts `--registry <file>` for testing a bad registry (fixture in `scripts/test-fixtures/`).
- The GitHub MCP server failed to connect this session; `gh api` worked.
