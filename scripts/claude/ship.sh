#!/usr/bin/env bash
# Ship the current branch to main.
#
# Default (decision 0026, D7): push the branch's commits straight onto main (fast-forward only,
# never forced), then wait for CI on main. If GitHub refuses the push (the ruleset on main still
# requires a pull request), fall back to the pull-request path below.
# --pr: push the branch, open (or reuse) its pull request, wait for CI, and merge it.
# --no-merge: push the branch and leave a draft pull request open (partial or blocked work).
# Uses the GitHub REST API through `gh api`, because `gh pr` (GraphQL) is blocked in
# Claude Code cloud sessions.
#
# Usage: scripts/claude/ship.sh [--pr | --no-merge] "<title>" <body-file>
# Env:   MERGE_METHOD (default: rebase, decision D8), CHECK_TIMEOUT_SEC (default: 900)
set -euo pipefail

REPO="${REPO:-GameTech-Systems/Chess9s}"
METHOD="${MERGE_METHOD:-rebase}"
TIMEOUT="${CHECK_TIMEOUT_SEC:-900}"
MERGE=1
DIRECT=1
if [ "${1:-}" = "--no-merge" ]; then MERGE=0; DIRECT=0; shift
elif [ "${1:-}" = "--pr" ]; then DIRECT=0; shift; fi
TITLE="${1:?PR title required}"
BODY_FILE="${2:?PR body file required}"

BRANCH="$(git branch --show-current)"
if [ -z "$BRANCH" ] || [ "$BRANCH" = "main" ]; then
  echo "ship: refusing to ship from '${BRANCH:-detached HEAD}'. Work on a claude/... branch." >&2
  exit 1
fi

git fetch origin main --quiet
if ! git merge-base --is-ancestor origin/main HEAD; then
  echo "ship: branch is behind origin/main. Rebase first: git rebase origin/main" >&2
  exit 1
fi

# Wait for every check run on commit $1 to finish. Exit 2 on a failure, 3 on a timeout.
wait_for_checks() {
  local sha="$1" where="$2" waited=0 seen=0 total pending failed
  local counts='"\(.total_count) \([.check_runs[] | select(.status != "completed")] | length) \([.check_runs[] | select(.conclusion == "failure" or .conclusion == "cancelled" or .conclusion == "timed_out" or .conclusion == "action_required" or .conclusion == "stale")] | length)"'
  echo "ship: waiting for checks on $sha (up to ${TIMEOUT}s)"
  while :; do
    read -r total pending failed <<<"$(gh api "repos/$REPO/commits/$sha/check-runs?per_page=100" --jq "$counts")"
    if [ "$total" -gt 0 ]; then
      seen=1
      if [ "$failed" -gt 0 ]; then
        echo "ship: CI failed on $where." >&2
        exit 2
      fi
      [ "$pending" -eq 0 ] && return 0
    elif [ "$waited" -ge 120 ] && [ "$seen" = 0 ]; then
      echo "ship: no checks reported after 120s; continuing."
      return 0
    fi
    if [ "$waited" -ge "$TIMEOUT" ]; then
      echo "ship: checks still running on $where after ${TIMEOUT}s." >&2
      exit 3
    fi
    sleep 15; waited=$((waited + 15))
  done
}

git push -u origin "$BRANCH"

if [ "$DIRECT" = 1 ]; then
  SHA="$(git rev-parse HEAD)"
  # No --force: main only moves forward, and only to commits that already contain it.
  if git push origin "HEAD:refs/heads/main"; then
    echo "ship: pushed $SHA to main."
    git fetch origin main --quiet
    wait_for_checks "$SHA" "main ($SHA); fix it forward now"
    echo "ship: main is green at $SHA."
    exit 0
  fi
  echo "ship: GitHub refused the direct push to main; opening a pull request instead." >&2
fi

OWNER="${REPO%%/*}"
PR="$(gh api "repos/$REPO/pulls?head=$OWNER:$BRANCH&state=open" --jq '.[0].number // empty')"
if [ -z "$PR" ]; then
  DRAFT=false; [ "$MERGE" = 0 ] && DRAFT=true
  PR="$(gh api -X POST "repos/$REPO/pulls" -f title="$TITLE" -f head="$BRANCH" -f base=main \
        -F body=@"$BODY_FILE" -F draft="$DRAFT" --jq .number)"
  echo "ship: opened PR #$PR"
else
  echo "ship: reusing PR #$PR"
fi

if [ "$MERGE" = 0 ]; then
  echo "ship: left PR #$PR open (--no-merge)."
  exit 0
fi

SHA="$(git rev-parse HEAD)"
wait_for_checks "$SHA" "PR #$PR; not merging"

gh api -X PUT "repos/$REPO/pulls/$PR/merge" -f merge_method="$METHOD" --jq '.message'
git fetch origin main --quiet
echo "ship: PR #$PR merged into main ($METHOD)."
