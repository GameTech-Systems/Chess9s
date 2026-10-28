# Handoff

Updated 2026-10-28 by S59 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S59 is done. `pnpm sim` on a 3-player ruleset writes the balance report of decision 0015 (D60, provisional): each seat's score with shared draws split, Wilson intervals, every game sorted into a decision 0016 end-table row, draws by who shares them, capped games (not scored). `--sweep`, `--shard`, `pnpm sim:merge`, `--greedy-dragon` and `--greedy` work for 3 players; the `Sim depth 2` workflow takes `depths`, `sweep` and `mode` inputs.
- Reports in `docs/fairness/`, all depth 1, played on the workflow from this session's branch (runs 40606667813, 40606718277, 40606720906, 40606723541), easy-3p locally. No game in any run hit the cap.
  - `standard-3p`, 2,000 games: dark 26.3%, light 38.3%, Dragon 35.4%. Verdict **fail** (dark below 28%, light just above 38%).
  - `standard-3p-sweep`, 40 games each for the default and 57 combinations, 3 skipped (not built yet). Strongest effects: `dragon.canJump` = true (Dragon 95%), `tail.3p.movement` = two-player-path (dark 71%), `endings.3p` = first-checkmate (Dragon 61%), `king.range` 2–4 and `dragonHead.range` = 1 (Dragon 4–14%). `dragonHead.range` 3: Dragon 17.5%; 4: Dragon 25%.
  - `draft-3p`, 400 games: dark 48.1%, light 42.3%, Dragon 9.6%.
  - `easy-3p`, 400 games: dark 70.8%, light 27.5%, Dragon 1.7%. The Tail is checkmated in 386 games, median 8 plies.
  - `standard-3p.greedy-dragon`, 400 games (not scored): dark 20.4%, light 40.8%, Dragon 38.9%.

## Next session
**S60 — Depth-2 run for 3 players** · Owner (no Claude session)
Why: next in the Phase 6 order. Run it after this PR merges, so the merge keeps the depth-1 run. Then S61 (Opus 5.5 · high, in chat).
Start with: Actions → Sim depth 2 → ruleset `standard-3p`, shards 40, games 2000, depths 2.

## Decisions in effect for the next step
- D59 and D63: decided. D60: default, provisional (decision 0015, version 1).

## Open questions for the owner
- Confirm D60 as decision 0015 sets it (S61). Choices Claude made: 6 random opening plies (two per seat); capped games count as played but are not scored; a run with more than 5% capped is flagged for the owner; the pass needs 2,000 games played.
- `coast.3p.exit` is not built in any 3-player game, so every 3-player run plays without it, and its sweep combination is skipped.
- The sweep's own default (40 games, light 53.8%) is far from the 2,000-game run (38.3%), so 40-game screens are noisy. Many combinations played the same games as the default because the option never came up.
- Carried over: the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65), S54 (owner) and the S53 defaults, the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- `gh api` can dispatch `Sim depth 2` on a `claude/...` branch (POST `actions/workflows/390422353/dispatches`) and download artifacts. Runners allow 20 jobs at once, so a merge job waits behind other runs' shards; merging the shard artifacts locally with `node packages/sim/dist/merge.js` gives the same report.
- Depth-1 3-player games take about 47 s (Standard) and 67 s (Good Practice) each; depth 2 about 8 CPU-minutes (8 local games: Dragon won 7).
- 3-player reports are `<ruleset>.json`, `<ruleset>-sweep.json` and `<ruleset>.greedy-dragon.json`. The old `.search-d<d>` names are gone.
