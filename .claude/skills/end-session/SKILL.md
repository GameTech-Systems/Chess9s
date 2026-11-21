---
name: end-session
description: Finish a Chess Nines build session. Runs the checks, rewrites the handoff, logs the session, ships the pull request (open, wait for CI, merge), and recommends the next session's step, model, and effort. Use at the end of every session, or early when usage is running low.
---

Finish the current step.

1. **Verify.** Run every check that exists: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm validate:rules`. Before S7 there are no scripts; check that every changed JSON file parses. Record pass and fail counts.
2. **Outcome.** `done` (all done-when checks pass), `partial` (some work is green, the step isn't finished), or `blocked` (say why).
3. **Handoff.** Rewrite `docs/HANDOFF.md` from `handoff-template.md` in this folder. Keep it under 40 lines. No private information.
4. **Log.** Append one row to `docs/sessions/LOG.md`.
5. **Plan updates.** Set the step's status in `docs/BUILD-PLAN.md`. If public decisions changed through the owner's brief, update the "Decision defaults" table, and add a record in `docs/decisions/` for lasting choices.
6. **Commit** with a clear message, signed off (`git commit -s`), so the DCO check passes.
7. **Ship.** Write a PR body from `.github/PULL_REQUEST_TEMPLATE.md` (tick "Owner or Claude PR") to a temp file, then run `scripts/claude/ship.sh "<step-id>: <title>" <body-file>`. It pushes the branch, opens or reuses the PR, waits for CI, and merges.
   - CI fails: fix it if the fix is small and in scope, commit, and run the script again. Otherwise stop and report.
   - Outcome `partial` or `blocked`: run `scripts/claude/ship.sh --no-merge ...` so the PR stays open, and name the branch to resume in the handoff.
   - Never merge red CI, never push to `main`, never force-push `main`.
8. **Choose the next session.** Start from the next step's recommendation in `docs/BUILD-PLAN.md`, then adjust: raise effort one level, or switch Sonnet → Opus, if this session needed repeated attempts on design or correctness; lower it when the next step is mechanical; Haiku 5.5 · low for docs-only follow-ups.
9. **Close** with exactly this as the end of your reply:

   Next session → S<n> · <model> · effort <level>
   Why: <one line>
   Start with: /start-session S<n>

   Then a fenced code block tagged `ledger-sync` holding one JSON object in the format at the end of `docs/BUILD-PLAN.md`. Include issue ids from the owner's brief under `resolved` when this step fixed them, new problems under `newIssues`, and anything the owner must choose under `questions` (with a default option index so work can continue).
   List under `resolved` every ledger issue the step fixed, not only those in the brief: check the open issues in `docs/decisions/LEDGER-SNAPSHOT.md` against what the PR fixed (S95 fixed I39, I40 and I43 to I45 but listed only I37).

10. **Ledger, when reachable.** If this session has the `ArtifactData` tool and the owner gave the ledger's link, apply the `ledger-sync` block to the ledger the way its "Import from Code" button does (step status and `closed`; `resolved` issues get `status: resolved`, `closed`, `resolvedBy`; new issues and questions get the next free I and D ids; a `sessions` row; `meta/state` `next` and `lastSync`), in one `batch` pinned to the versions just read. Then export `items` again, run `node scripts/claude/ledger-snapshot.mjs <export dir>`, and commit the new snapshot in the same PR. Say in the reply that the ledger is already synced, so the owner doesn't import the block twice.
