# 0005: Claude Code session workflow and merging

**Status:** Accepted

## Context
The project is built in Claude Code cloud sessions on a Pro plan with usage limits. Sessions start without memory of earlier sessions, and the owner wants work to continue without waiting on approvals or on undecided rules.

## Decision
- **One step per session.** Steps are listed in `docs/BUILD-PLAN.md`, each with a recommended model and effort. Sonnet 5.5 is the project default; Opus 5.5 is used for design and correctness-critical steps.
- **Handoff.** `docs/HANDOFF.md` is imported by CLAUDE.md and rewritten at the end of every session. It names the next step, model, and effort. `docs/sessions/LOG.md` keeps one line per session.
- **Claude merges its own pull requests** after CI passes, using the REST API (`scripts/claude/ship.sh`). Branch rules on `main` require a pull request and the `ci` check. No required approvals while all PRs come from the owner's account.
- **Rebase merges** keep per-task commits and their authorship.
- **Defaults instead of stalls.** Every open decision has a default. When a step needs it, the default applies and is marked provisional until the owner decides. Claude never invents rules: it chooses only among listed options.

## Alternatives considered
- Owner approval on every PR: safer for outside contributions, but slows every session and is impossible for PRs the owner authored.
- Direct pushes to `main`: fewer steps, but no CI gate and no PR record.
- Squash merges: tidier history, but one commit per session and the merge author becomes the owner's account.

## Consequences
CI is the safety gate, so S7 must add it before engine code lands. When outside contributors arrive, owner review through CODEOWNERS is switched on for their PRs.
