# Handoff

Updated 2026-10-25 by S38 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3, testers playing (S29). S38: Standard (`standard-2p` 0.1.0) passed at both depths (depth 1 50.2%, depth 2 50.1%, 2,000 games each) and is now a Candidate (decision 0012). Its 21-day discussion starts when this merges. Nothing else changed; 1317 tests pass.
- S40 options (`queen.canCrossVoid`, `queen.canStandOnVoid`, `pawn.canEnterCoast`, `coast.openToAll`) are all off by default, so the depth-2 run (made before S40) still holds.
- Sweep: `docs/fairness/standard-2p-sweep.md`, 40 games per entry at depth 1 (screening only).

## Next session
**S41 — Change Ruleset page** · Sonnet 5.5 · effort high
Why: the builder is UI work over the existing registry; S37 and S38 are done.
Start with: `/start-session S41`

## Decisions in effect for the next step
- D44, D45 (defaults, applied in S40). D46 (default) for custom rulesets. D43 applied in S38.

## Open questions for the owner
- `coast.openToAll` (provisional reading): it lifts the bars on entering the Coast, but not the Coast pieces' own `coast.2p.exit` and `coast.returnAllowed`, or `queen.voidCrossings` closing a5 to the Queen. Default: keep that reading.
- I34: a project contact address. Default: the privacy page points to Discussions.
- Favicon is still the empty `data:,` placeholder. Ting Yang art still open.
- Discussion for Standard: the owner announces it (Discussions post) and sets the 21-day end date.

## Notes for Claude
- S41 builder: show `pawn.safeZones` as two switches (S40 text), and the two Queen void switches side by side.
- `queen.pawnSwap` is still unbuilt. When it is built, a swap must not put a pawn on the Coast without a capture (D45).
- Engine and sim tests still use `draft-2p` (Good Practice); web tests that replay the hot-seat fixture or castle by stepping 2 squares pin `draft-2p` too.
- Labels are presentation only. A new option needs a label entry, and `GROUP_ORDER` in `RulesPage.tsx` lists the groups (the schema enum must match).
- A Candidate ruleset's default must not change without a new version and a new fairness run.
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
