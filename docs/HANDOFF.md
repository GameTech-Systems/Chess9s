# Handoff

Updated 2026-10-25 by S45 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 4. S45 is done: `rules/locks/` holds locks for `draft-2p` 0.2.0 and `standard-2p` 0.1.0; a test (`packages/sim/src/locks.test.ts`) fails on a changed, lost or new key and names the ruleset, version and key. 1443 tests pass.
- `pnpm lock write|add-keys|archive <id>` writes locks, records new keys without changing locked values, and keeps the current file in `rules/rulesets/archive/` as `deprecated`. Nothing is archived yet (no new version exists).
- Engine `resolveVersion`/`findRulesetVersion`, sim `rulesFor(source, id, overrides, version)` and web `findRuleset(id, version)`/`createRules(id, version)` find a ruleset by id and version; an archived one plays from its lock. The picker lists current versions only.
- Standard (`standard-2p` 0.1.0) is a Candidate; its 21-day discussion starts when the owner announces it (S44).

## Next session
**S46 — Tournament rules page and game record** · Sonnet 5.5 · effort medium
Why: it is the next step in the plan and uses the S45 lookup to replay a downloaded game record.
Start with: `/start-session S46`

## Decisions in effect for the next step
- D47 (default): no conduct rules published; `/tournament` says the organizer announces them with the invitation.
- D46 (default): custom rulesets reach tournaments only through the GOVERNANCE checklist.
- Provisional (S45): the fairness-report test holds a report to a lock only when its ruleset version is in `rules/` as a Candidate, Official or archived version; `easy-2p` 0.1.0's report (an older Experimental version, not in `rules/`) is exempt.

## Open questions for the owner
- S44: post the Standard discussion and set its end date (at least 21 days later); put the link and dates in a brief. S46 shows "starts when announced" until then.
- S45's done-when says editing `king.range`'s registry default fails a test naming `standard-2p` 0.1.0. It can't: Standard sets `king.range: 1` itself, so only `draft-2p` 0.2.0 inherits that default. The tests show this and show a default Standard inherits (`king.canJump`) failing for it. No action needed unless you wanted Standard to inherit.
- D47 to D49 ids (renumber if the ledger uses them); ratification (S50) has no default.
- Carried over: Discussion form prefill check, the flag rule (decision 0013), `coast.openToAll` reading, I34 contact address, favicon and Ting Yang art.

## Notes for Claude
- A lock is never edited by hand. New version: `pnpm lock archive <id>`, edit the file (version, status), `pnpm lock write <id>`. New registry key: `pnpm lock add-keys <id>` for each locked ruleset.
- Web tests have no real archived version; replay from a lock is tested in `packages/engine/src/rules/locks.test.ts` and `packages/sim/src/locks.test.ts`. Game records carry `ruleset: {id, version}`; load them with `findRuleset(id, version)` and `createRules(id, version)`.
- Playwright works against `vite preview` on port 4173. Cloudflare Workers Builds deploys `main`.
