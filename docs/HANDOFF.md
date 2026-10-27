# Handoff

Updated 2026-10-27 by S56 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S56 is done. The engine plays 3-player games (decision 0016): `newGame`/`playMove` for 3 players, seat statuses (`GameState.seats`), stones (`PlacedPiece.stone`), check per attacker and King, rule 6 and `check.3p.exposedKing`, King capture and the duel, the Tail's checkmate (choice `#<square>`, swap promotion `=<piece>`), Dragon out, the skipped Dragon turn, and draws with `between`. Move `events` say what happened. Code: `packages/engine/src/game/three.ts`.
- Data: registry 0.3.0 (six 0016 parameters, a new `requires` field), `draft-3p` 0.3.0, `standard-3p` 0.1.0, `easy-3p` 0.1.0; `draft-3p` 0.2.0 archived without a lock (the lock tool and test allow that for a version never locked). RULES.md and RULES-FRAMEWORK take 0016. No 2-player parameter, ruleset or lock changed.
- Done-when passed: each preset reaches every end in its table from the start (recorded games), every 3-player parameter at each option in a game that ends, a record round trip; 1903 tests.

## Next session
**S57 — 3-player hot-seat in the browser** · Sonnet 5.5 · effort high
Why: next in the Phase 6 order; the engine side is in place.
Start with: `/start-session S57`

## Decisions in effect for the next step
- D34, D58 (untimed, decision 0017), D63 (Standard is the 3-player default): decided.

## Open questions for the owner
- In the duel with `dragon.3p.lastKing` = checkmate, the Tail (no check unless `tail.canCheck`) may still capture the last King; S56 counts that as a Dragon win (`king-capture`). Default: keep.
- `tail.capturable` = true in 3-player games: 0016 says nothing about capturing the Tail; S56 lets the capture happen with no special result. Default: keep, and ask before S64 offers it.
- Resigning and agreed draws with three seats are not in 0016; S56 refuses them. Default: 2-player only until decided.
- A skipped Dragon turn counts as a turn for the 50-move rule (provisional reading of rule 13).
- Carried over: S54 (owner) and the S53 defaults listed in its PR; the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- S57 must let `loadRules().rules()` and the web picker (`apps/web/src/game/rules.ts`, `playable: players === 2`) take 3 players; the online room still refuses them (S63).
- Rule 9's "piece that may not stand on the Tail's square" never arises: a piece attacks only squares it may stop on, so it can't check the Tail there. Only E5 keeps the Tail in place (tested with `center.occupants` = any).
- Checkmate escapes are judged two levels deep (`MATE_DEPTH` in three.ts). 3-player turns cost about 5 to 10 ms; S62's search will need the incremental check of `check.ts`.
- `coast.3p.exit` (first way out through A5) is not built; `unbuiltFeatures` lists it for every 3-player game.
