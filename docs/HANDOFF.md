# Handoff

Updated 2026-10-25 by S43 (Opus 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3 is complete; testers are playing (S29). S43: **Submit for consideration** on `/build` opens the Rule proposals Discussion form (`discussions/new?category=rule-proposals`). It is prefilled with the title, a settings summary, the share link and the exported file (new `ruleset` field in the template, `render: json`). The poster writes why the ruleset is fair and ticks the terms. If the address would be over 6,000 characters, the file is left out and the poster is asked to paste the export instead.
- `pnpm sim --ruleset-file <f>` runs the fairness check on a submitted file. It uses the engine's `readRulesetFile`, the same check the builder uses to load a file (now in `packages/engine/src/rules/ruleset-file.ts`). The file plays as `proposed` under the id `submitted-<name>` and can never stand in for a bundled ruleset. A file that switches on an unbuilt feature is refused.
- GOVERNANCE has a "Submitted rulesets" checklist: the file loads, it passes at both depths, it is added as a Candidate, 21 days of discussion, then ratification (D46). Tournament invitations now say to play hot-seat or over the board. 1399 tests pass. Checked in a real browser.
- Standard (`standard-2p` 0.1.0) is a Candidate; its 21-day discussion starts when the owner announces it.

## Next session
**S30 — Phase 4 planning: Official tournament rules** · Opus 5.5 · effort high
Why: the plan says each later phase opens with an Opus · high planning session that writes its detailed steps.
Start with: `/start-session S30`

## Decisions in effect for the next step
- D20 (default): 21-day discussion before ratification.
- D43 (default): Standard is the ruleset for the tournament discussion.
- D46 (default): custom rulesets reach tournaments only through the GOVERNANCE checklist.

## Open questions for the owner
- Discussion for Standard: the owner announces it (Discussions post) and sets the 21-day end date. S30 needs it to plan ratification.
- Discussion form prefill: GitHub fills form fields from query parameters named after the field ids (`idea`, `ruleset`). Check once on the live repository that the Rule proposals form opens filled in. Default: keep it; if it does not, the summary still lands in the title and the poster pastes the file.
- Carried over: the flag rule (decision 0013) and the `coast.openToAll` reading (default for both: keep them), I34 contact address, favicon and Ting Yang art.

## Notes for Claude
- Ruleset files are read in one place: `readRulesetFile` / `resolveFileOverrides` in the engine. Web `parseRulesetFile` adds only the name-length check.
- Sim jobs can carry a `ruleset` (pool `Job.ruleset`), because workers load `rules/rulesets` themselves.
- Share link is `/build#ruleset=` (provisional). `queen.pawnSwap` is still unbuilt (D45).
- Web tests have no DOM; Playwright works against `vite preview` on port 4173.
- A Candidate ruleset's default must not change without a new version and a new fairness run.
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
