# Handoff

Updated 2026-10-25 by S30 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 4 is planned (S30, docs only). `docs/BUILD-PLAN.md` has steps S44 to S50: the owner announces the Standard discussion (S44), then ruleset locks and kept versions (S45), the `/tournament` page and game-record download (S46), closing the discussion (S47), a re-check only if Standard changes (S48 and S49), and ratification (S50, the Phase 4 exit).
- Two gaps found that S45 closes: a ruleset stores only overrides, so editing a registry default silently changes a Candidate; and `rules/rulesets/` keeps one version per id, so an old version can't be replayed.
- No code changed. 1399 tests pass.
- Standard (`standard-2p` 0.1.0) is a Candidate; its 21-day discussion starts when the owner announces it (S44).

## Next session
**S45 — Ruleset locks and kept versions** · Sonnet 5.5 · effort high
Why: everything later depends on it: no Official ruleset until locks catch any change to its values.
Start with: `/start-session S45`

## Decisions in effect for the next step
- D46 (default): custom rulesets reach tournaments only through the GOVERNANCE checklist.
- D20 (default): 21 days from the owner's announcement; the clock is S44's and does not block S45.
- An archived version is `deprecated` and plays from its lock's values (S45 text, provisional).

## Open questions for the owner
- S44: post the Standard discussion and set its end date (at least 21 days later); put the link and dates in a brief. S46 shows "starts when announced" until then.
- New public decision ids D47 (tournament conduct rules; default none published, the organizer announces them), D48 (ratified version; default keep 0.1.0), D49 (new discussion after a change; default none). Renumber them if the ledger already uses these ids.
- Ratification itself has no default: S50 is blocked until the owner decides.
- Carried over: Discussion form prefill check on the live repository (default keep), the flag rule (decision 0013) and the `coast.openToAll` reading (default keep both), I34 contact address, favicon and Ting Yang art.

## Notes for Claude
- Engine `resolveRuleset` values cover every non-deprecated parameter; locks compare against them. `ratification` is already in `ruleset.schema.json` and required for `official`.
- The web app loads `rules/rulesets/*.json` by glob (`apps/web/src/game/rules.ts`); the guest saved game refuses another version (`guest.ts`). Fairness reports carry `ruleset: {id, version}`.
- Web tests have no DOM; Playwright works against `vite preview` on port 4173.
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
