# 0026: Claude pushes straight to main

**Status:** Accepted (owner, D7, 22 Nov 2026). Replaces the merging part of 0005.

## Context
Since S7 every step shipped as a pull request that Claude opened and merged after the `ci` check passed. The owner chose "Claude pushes straight to main" for D7 in the ledger; CLAUDE.md kept the PR flow until the owner settled the conflict in S98 ("change it").

## Decision
1. Claude still works on a `claude/...` branch with per-task, signed-off commits.
2. At the end of a step, after `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm validate:rules` pass locally, `scripts/claude/ship.sh` fast-forwards `main` to the branch (never forced) and waits for CI on `main`.
3. A red CI run on `main` is fixed forward in the same session. Partial or blocked work stays on its branch (`ship.sh --no-merge`).
4. If GitHub refuses the direct push, `ship.sh` falls back to the old path: a pull request, merged by rebase (D8) once CI passes.
5. The ruleset on `main` keeps "pull request required", the `ci` check, no force-push and no deletion, with the Repository admin role in its bypass list ("Always"). Claude's pushes come through the owner's account, so they pass; outside contributors still need a pull request and green CI. `.github/rulesets/main.json` holds the same settings.
6. `.claude/settings.json` no longer denies `git push origin main`; it still denies every force-push.

## Consequences
- Faster sessions: no PR wait before merge.
- CI is no longer a gate before `main` moves, only a check after it; the local checks carry that weight. There is no PR record for each step: the commit messages and `docs/sessions/LOG.md` are the record.
- The DCO check runs only on pull requests; Claude keeps signing off every commit.
