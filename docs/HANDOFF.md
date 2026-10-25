# Handoff

Updated 2026-10-25 by S40 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3, testers playing (S29). S40 added the owner's new piece options, all off by default (no default changed, so no fairness rerun needed): `queen.canCrossVoid` and `queen.canStandOnVoid` (replace `queen.canEnterVoid`, now deprecated), `pawn.canEnterCoast` (D45) and `coast.openToAll` (D44: the Coast opens at the start, and each piece's Coast bar is lifted through a `when` on its Coast square rule). Easy Start is 0.2.0 with both Queen switches on (same moves). 1317 tests pass.
- Sweep: `docs/fairness/standard-2p-sweep.md`, 40 games per entry at depth 1 (screening only), including the four new entries.
- Standard depth 1 passes (50.2%); depth 2 not run yet, so Standard stays `experimental` (S37 is the owner's).

## Next session
**S41 — Change Ruleset page** · Sonnet 5.5 · effort high
Why: the builder is UI work over the existing registry; S38 still waits on the owner's S37 run.
Start with: `/start-session S41`

## Decisions in effect for the next step
- D44, D45 (defaults, applied in S40). D46 (default) for custom rulesets.

## Open questions for the owner
- S37: run Actions → Sim depth 2 for `standard-2p`.
- `coast.openToAll` (provisional reading): it lifts the bars on entering the Coast, but not the Coast pieces' own `coast.2p.exit` and `coast.returnAllowed`, or `queen.voidCrossings` closing a5 to the Queen. Default: keep that reading.
- I34: a project contact address. Default: the privacy page points to Discussions.
- Favicon is still the empty `data:,` placeholder. Ting Yang art still open.

## Notes for Claude
- S41 builder: show `pawn.safeZones` as two switches (S40 text), and the two Queen void switches side by side.
- `queen.pawnSwap` is still unbuilt. When it is built, a swap must not put a pawn on the Coast without a capture (D45).
- Engine and sim tests still use `draft-2p` (Good Practice); web tests that replay the hot-seat fixture or castle by stepping 2 squares pin `draft-2p` too.
- Labels are presentation only. A new option needs a label entry, and `GROUP_ORDER` in `RulesPage.tsx` lists the groups (the schema enum must match).
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
