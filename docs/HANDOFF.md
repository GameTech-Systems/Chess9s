# Handoff

Updated 2026-10-31 by S74 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6. Decision 0021 is built. New rulesets `heavy-3p` "Heavy-Handed Dragon" and `light-3p` "Light-Handed Dragon" 0.1.0, both experimental and playable in the browser (hot-seat, computer, online); registry 0.6.0.
  - `coast.3p.attackFrom` = coast-only: on the Coast a Dragon piece attacks only Coast squares (new piece field `attackOnly`).
  - `dragon.3p.defeat` (tail-or-pieces-in-duel, pieces-and-tail, pieces-only; pieces-only requires a Tail that only blocks) and `tail.3p.stone` (swap, where-it-stands). Where it stands, a Dragon that plays on loses its next turn (`turn-skipped` with `lost`; owner, S74 brief).
  - `turn.3p.order`: dark-light-dragon, light-dragon-dark, dragon-dark-light; dark-dragon-light removed.
- Recorded games to every end of both rulesets (engine), four of them clicked in Chromium (`e2e-3p.mjs`). The computer treats the Tail as royal only where it is. `standard-3p`, `draft-3p` and `easy-3p` play as before; the four 3-player locks gained the two new keys at their defaults (`pnpm lock add-keys`, values unchanged).
- S75 screens: the six `Sim depth 2` runs are dispatched after the S74 merge if the token allows. If Actions shows none, dispatch them as the S75 section says.

## Next session
**S75 — Screens of Heavy-Handed and Light-Handed Dragon** · Sonnet 5.5 · effort medium
Why: wait for six workflow runs, commit the reports and compare them; mechanical.
Start with: `/start-session S75`

## Decisions in effect for the next step
- D75 to D77 (decided; the four 0021 readings confirmed in the S74 brief). D78: six 400-game screens at depths 1 and 2; full runs only for one inside 28–38% at both (default). D60: every 3-player ruleset stays experimental.

## Open questions for the owner
- None blocking S75.
- S74 readings (provisional): the lost turn is part of `tail.3p.stone` = where-it-stands, so it also applies if that option is set under the full rules; a Tail captured (`tail.capturable`) with where-it-stands stays where it stands and the capturing piece doesn't move; `pieces-only` also requires `tail.capturable` off (D76.1).
- Carried over: the decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings, the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- A screen is a `Sim depth 2` run with `ruleset`, `games` 400, `depths` `1,2`; the other orders add `set` = `turn.3p.order=<order>` and `label` = the order.
- The balance report's "How the games ended" table names decision 0016's rows; the new loss rules show up as tail-stone and dragon-out events.
- The GitHub connector failed to connect in S74; `scripts/claude/ship.sh` uses `gh api`.
