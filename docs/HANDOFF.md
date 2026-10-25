# Handoff

Updated 2026-10-25 by S39 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3, testers playing (S29). S39: every live parameter in `rules/parameters.json` has a `group` (King, Queen, Pawns, Center, Coast, Dragon Tail, Dragon Heads, Sun and Moon, Turns and draws, Setup) and `optionLabels` (keyed by `String(option)`); both are in `parameters.schema.json` and the engine's `Parameter` type. `registry-labels.test.ts` fails for a live parameter with no group or a missing or extra label. Deprecated parameters carry neither.
- The rules page (`/rules/<id>`) and the "?" dialog show labels (`Setting.valueLabel`, `defaultLabel` in `game/rules.ts`) and group by `group`. No rule or default changed, so no fairness rerun. 1269 tests pass.
- Standard depth 1 passes (50.2%); depth 2 not run yet, so Standard stays `experimental` (S37 is the owner's).

## Next session
**S40 — The owner's new piece options** · Opus 5.5 · effort high
Why: new parameters touch movement and check detection; it needs design care. S38 still waits on the owner's S37 run; start it once that is green.
Start with: `/start-session S40`

## Decisions in effect for the next step
- D44, D45 (defaults): see BUILD-PLAN. Add `group` and `optionLabels` to every new parameter (the S39 test enforces it).

## Open questions for the owner
- S37: run Actions → Sim depth 2 for `standard-2p`.
- I34: a project contact address. Default: the privacy page points to Discussions.
- Favicon is still the empty `data:,` placeholder. Ting Yang art still open.

## Notes for Claude
- Engine and sim tests still use `draft-2p` (Good Practice); web tests that replay the hot-seat fixture or castle by stepping 2 squares pin `draft-2p` too.
- `RulesScreen` reads `onClose` through a ref: the game re-renders every second.
- Labels are presentation only. A new option needs a label entry, and `GROUP_ORDER` in `RulesPage.tsx` lists the groups (the schema enum must match).
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
