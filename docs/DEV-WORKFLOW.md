# Development workflow (Claude Code)

This project is built with Claude Code on a Pro plan. The workflow is designed to stretch plan limits and keep the public repo clean.

## Setup

- Sign in with a Pro account. Make sure no `ANTHROPIC_API_KEY` environment variable is set, or Claude Code may bill API usage instead of using the plan.
- Run `/model` to see available models and `/usage` to see where you stand against the 5-hour window and the weekly cap. Usage is shared with claude.ai chat.
- Project memory is in [`CLAUDE.md`](../CLAUDE.md). Keep it short and current.
- Custom commands live in `.claude/commands/`: `/new-parameter` and `/end-session`.

## Habits

1. One task per session, then `/clear`.
2. Plan mode before any change that touches several files.
3. Write the failing test first.
4. Commit after each green task. Keep pull requests small.
5. End every session with `/end-session`.
6. Ask before adding dependencies.

## Repo hygiene

Never put secrets, personal information, or unreleased art or lore in this repository. Review diffs before pushing. `.claude/settings.json` blocks reading `.env` and private paths.

## GitHub setup checklist

- Enable Discussions with categories whose slugs are `rule-proposals` and `playtest-feedback`.
- Create labels: `rule-proposal`, `movement-proposal`, `balance-report`, `playtest`, `bug`.
- Protect `main` (pull requests and owner review required).
- Turn on secret scanning with push protection, private vulnerability reporting, and Dependabot alerts.
- Require two-factor authentication for the organization.
- Add CLA automation and CI (Phase 1), after verifying the current tooling.
