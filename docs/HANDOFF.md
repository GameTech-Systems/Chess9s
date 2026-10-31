# Handoff

Updated 2026-10-31 by S73 (Opus 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. The owner reviewed the S72 screens (no lever inside 28–38% at depth 2: Coast rule 45.8 / 34.9 / 19.4, turn order 5.6 / 69.8 / 24.6, checkmate only 23.8 / 6.6 / 69.6, old rules 23.6 / 5.9 / 70.5) and chose what to test next, recorded in [decision 0021](decisions/0021-heavy-and-light-handed-dragon.md):
  - **Heavy-Handed Dragon** (D75): first exit through A5, then back with any legal move; on the Coast a Dragon piece can't attack a piece off the Coast; only Kings and Queens enter the Coast; the Dragon loses when the Sun, Moon and both Heads are captured **and** the Tail is checkmated; with both Kings in, the Tail turns to stone where it stands.
  - **Light-Handed Dragon** (D76): the same, but the Tail only blocks (no attack, can't be captured, never checkmated), moves anywhere, and the Dragon loses when the four are captured.
  - **Clockwise turn orders only** (D77): dark-light-dragon, light-dragon-dark, dragon-dark-light; dark-dragon-light withdrawn.
  - Screens (D78): both rulesets at each order, six 400-game screens at depths 1 and 2.
- Docs only; nothing built. S74 to S76 added to the plan.

## Next session
**S74 — Heavy-Handed and Light-Handed Dragon** · Opus 5.5 · effort high
Why: new loss rules, a new Coast attack option and turn orders in the engine; correctness-critical.
Start with: `/start-session S74`. Read the S74 section of `docs/BUILD-PLAN.md` and decision 0021.

## Decisions in effect for the next step
- D75 to D78 (decided, decision 0021; its readings provisional). D70 to D74 as before, except D73's order is withdrawn (D77). D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- 0021 rule D75.2: may a Dragon piece on the Coast still capture a King or Queen standing on the Coast? Default: yes (new option `coast-only`); "no" means 0020's `blocked` as it is.
- 0021 rule D75.4: in the duel, must the last Kinged player capture the four **and** checkmate the Tail? Default: both.
- 0021 rule D75.6: a Tail checkmated while Heads, Sun or Moon remain turns to stone where it stands and the Dragon plays on. Default: yes.
- 0021 rule D76.3: the Light-Handed Tail moves like a Dragon Head, first off the Coast through A5. Default: yes.
- Carried over: the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- The parameter names in 0021's build table are proposals; keep `standard-3p`, `draft-3p`, `easy-3p` and every lock unchanged.
- `gh` had an invalid token in S72: if `scripts/claude/ship.sh` fails, open the PR through the GitHub connector.
- A screen is a `Sim depth 2` run with `set` and `label`; a combination is one run with every `set` pair.
