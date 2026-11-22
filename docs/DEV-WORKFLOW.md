# Development workflow (Claude Code)

This project is built with Claude Code on a Pro plan, mostly in cloud sessions at claude.ai/code. The workflow is designed to stretch plan limits and keep the public repo clean. The step list is [BUILD-PLAN.md](BUILD-PLAN.md).

## Setup

- Connect GitHub to Claude Code on the web and install the Claude GitHub App on this repository (needed for auto-fix of pull requests).
- Use a cloud environment with **Trusted** network access. Node 22 and pnpm are pre-installed. The SessionStart hook in `.claude/settings.json` installs dependencies when the lockfile changes.
- Local CLI only: make sure no `ANTHROPIC_API_KEY` environment variable is set, or Claude Code may bill API usage instead of using the plan.
- Project memory is [`CLAUDE.md`](../CLAUDE.md). It imports [`HANDOFF.md`](HANDOFF.md), so every session starts with the current state. Engine and rules-data instructions in `.claude/rules/` load only when matching files are touched.

## A session, start to finish

1. Open a **new** session on this repo. Cloud sessions have no `/clear`; one session per step keeps context small.
2. Set the model and effort the step recommends, before the first message: `/model sonnet` or `/model opus`, then `/effort medium` (or `low`, `high`, `xhigh`). Sonnet 5.5 is the project default.
3. Send `/start-session S<n>`, optionally followed by the brief from the owner's ledger.
4. Claude plans, writes failing tests, implements, and commits after each green task.
5. `/end-session` runs the checks, rewrites the handoff, logs the session, and ships to `main` with `scripts/claude/ship.sh`: push `main`, wait for CI (a PR only if GitHub refuses the push). It ends with the next session's step, model, and effort, and a `ledger-sync` block for the owner's ledger.

## Merging policy

Claude pushes finished steps straight to `main` after the full checks pass locally (owner decision D7, record 0026; it replaces the PR flow of record 0005). CI runs on every push to `main`, and a red run is fixed forward in the same session. The ruleset on `main` blocks force-pushes and deletion for everyone, and requires a pull request and the `ci` check for everyone except repository admins (the bypass that lets Claude's pushes, made through the owner's account, land). Outside contributors still go through pull requests, the `ci` check and the DCO check, so every commit is signed off (`git commit -s`). Owner review through CODEOWNERS is switched on only when outside pull requests open.

## Habits that stretch the plan

1. One step per session, one PR per step.
2. A written plan before any multi-file change; Claude goes ahead without waiting for approval.
3. Failing test first; targeted test runs while working, the full suite at the end.
4. Keep CLAUDE.md short. The handoff carries the moving state.
5. Set model and effort at the start; switching mid-session re-reads the whole conversation without the cache.
6. Expect two limits, a rolling 5-hour window and a weekly cap, shared with claude.ai chat. Use chat for design discussion and the owner's ledger, and Claude Code for implementation. Start Opus steps at the beginning of a fresh window and check `/usage`.
7. Running low: `/end-session` early. Unfinished work stays on its branch with an open PR.

## Repo hygiene

Never put secrets, personal information, or unreleased art or lore in this repository. `.claude/settings.json` blocks reading `.env` and private paths, and blocks force-pushes.

## GitHub setup checklist

- Discussions with categories whose slugs are `rule-proposals` and `playtest-feedback`.
- Labels: `rule-proposal`, `movement-proposal`, `balance-report`, `playtest`, `bug`.
- Ruleset on `main`: pull request required (0 approvals), `ci` check required, no force-push, no deletion; Repository admin in the bypass list, "Always" (D7, record 0026).
- "Automatically delete head branches" on (the cloud session proxy can't delete branches).
- Secret scanning with push protection, private vulnerability reporting, Dependabot alerts.
- Two-factor authentication on every account.
- CLA automation before the first outside pull request.
