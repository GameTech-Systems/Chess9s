# Handoff

Updated 2026-10-18 by S1 (Claude in chat, Opus 5.5). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 0 (foundation). Foundation files and the session system are on `main`.
- Phase 0 still open: owner steps S2 (GitHub settings), S5 (Discussions), S6 (domains).
- No code yet. Registry values in `rules/` are unverified seeds.

## Next session
**S7 — Workspace, CI, and branch rules** · Sonnet 5.5 · effort medium
Why: mechanical setup on a known stack, no design calls.
Start with: `/start-session S7`

## Decisions in effect for the next step
- D7: ruleset on `main` with PR required, 0 approvals, `ci` check required, no force-push or deletion (default).
- D8: rebase merges (default).
- D10: Sonnet 5.5 pinned in `.claude/settings.json` (default, applied).
- D21: pre-approved dependency list in the S7 section of `docs/BUILD-PLAN.md` (default).

## Open questions for the owner
- None blocking S7.

## Notes for Claude
- `gh pr` and `gh issue` fail in cloud sessions (GraphQL is blocked). Use `gh api repos/GameTech-Systems/Chess9s/...` (REST) or `scripts/claude/ship.sh`.
- The GitHub proxy can't delete branches. "Automatically delete head branches" handles merged ones once S2 is done.
- Repo settings changes through `gh api` may be refused by the session's permission checks. If so, write the exact owner steps in this file instead.
