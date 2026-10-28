# 0015: Balance measures for 3-player rulesets

**Status:** Accepted (owner, S61, 28 Oct 2026), version 1, unchanged from S59. The owner confirmed D60 and the choices Claude made within it (the 6 opening plies, capped games reported not scored, the 5% capped flag, 2,000 games per depth). A change is a new version of this record, and earlier reports stay labeled with the version they used; the S59 and S60 reports call version 1 provisional because they were played before S61.

## Context
Decision [0008](0008-fairness-measures.md) measures 2-player balance as the first player's score. A 3-player game has three seats that play different armies (two Kinged players and the Dragon, [0016](0016-three-player-rules-v0.3.md)), and draws can be shared by two or three of them, so it needs its own measure. D60 sets it; this record fixes how it is measured, so the thresholds can't be adjusted to fit the results afterwards. Every 3-player ruleset stays experimental whatever the numbers show (BUILD-PLAN S59).

## Measures
- **Seat score** = (the seat's wins + its share of drawn games) ÷ finished games. A win scores 1. A draw splits the point among the seats that share it: ½ each for two, ⅓ each for three (the draws of decision 0016 name who shares them). The three scores add up to 1.
- **Capped games** (stopped at the safety cap) are reported, not scored: they count as games played but not in the score's denominator. A run in which more than 5% of the games are capped is flagged (`capped games over 5%`) and goes to the owner rather than to rule tuning (BUILD-PLAN S59).
- **Pass:** at **each** of depths 1 and 2, at least **2,000** games, every seat's score between **28.0% and 38.0%** inclusive (a third, plus or minus 5 points; point estimate, rounded to a hundredth of a percent as in 0008), and no more than 5% capped. The 95% Wilson interval of each seat's score is reported alongside.
- **Reported, not thresholded:** each seat's wins, losses and shared draws; wins by reason; every game sorted into a row of decision 0016's end tables (a Kinged player checkmates the other King; the duel's three endings; draws between the Kinged players, in the duel, or among all three; the first-checkmate rows for Easy Start); draws by who shares them; the games in which the Dragon captured a King, the Tail turned to stone or the Dragon went out; game length in plies (mean, median, shortest, longest); and the number of distinct games.
- **Flags:** a run is flagged for each seat outside 28–38%, when it has fewer than 2,000 games (`too few games`), and when more than 5% of its games are capped.
- **Verdict:** pass when the ruleset as it is passes at both depths; fail when a run of the ruleset as it is with at least 2,000 games has a seat outside the band; otherwise incomplete.

## How games are played
- **Every seat** is played by the same paranoid search (`bestMove`, S62, D59), so the seats are measured with equal play. Depth counts plies, one per seat (S62).
- **Budget:** at most 100,000 positions per move, as in 0008. The 3-player bench (`pnpm bench --players 3`) needed about 401 per move at depth 2, none capped.
- **Variety:** each game opens with **6** random legal plies, two per seat (0008 uses 4, two per side), and the search breaks ties at random. Game *i* of a run uses seed *base + i*.
- **Safety cap:** 2,000 plies, as in 0008.
- **Greedy Dragon (reported, not scored):** a second run plays the greedy Dragon (S58) against Kinged players who search, as players meet it against the computer Dragon. Its report carries the same tables and the verdict `not scored`.

## Parameter combinations
- A sweep changes one 3-player parameter at a time from the ruleset's values, each other option of it, as 0008 does for 2 players. `dragonHead.range` is swept at every option, so 3 and 4 (the RULES.md fairness risk) are included. An option that requires other values in the registry brings them with it (`endings.3p` = `first-checkmate` with `dragon.3p.givesCheck` on).
- `coast.3p.exit` is not built yet in any 3-player game (`unbuiltFeatures`), so every run plays without it, and the combination that changes it is listed as skipped. Other combinations the engine can't play yet are skipped with their reason.
- Sweeps with fewer than 2,000 games per combination are screening only: a combination is flagged when a seat's whole 95% interval lies outside 28–38%, as in 0008 version 2.

## Consequences
- `packages/sim` implements these measures (`src/measures3.ts` holds the numbers) and writes each 3-player report as JSON and Markdown to `docs/fairness/`, beside the 2-player ones. `pnpm sim` on a 3-player ruleset, `--sweep`, `--shard` and `pnpm sim:merge` work as for 2 players (0009); `--greedy-dragon` writes `<ruleset>.greedy-dragon`.
- The `Sim depth 2` workflow takes a 3-player ruleset, and `depths`, `sweep` and `mode` inputs, so the depth-1 run, the sweep and the greedy-Dragon run can be played on shards too.
- The 2-player measures, reports and tests (0008) don't change.

## S61 review (28 Oct 2026)
Standard (`standard-3p` 0.1.0, D63), 2,000 games at each depth ([report](../fairness/standard-3p.md); depth 2 from workflow run 40617147007, S60):

| Depth | dark | light | Dragon | Verdict |
| --- | --- | --- | --- | --- |
| 1 | 26.3% | 38.3% | 35.4% | fail |
| 2 | 21.2% | 3.0% | 75.7% | fail |

At depth 2 the Dragon captured light's King in 1,528 games (367 at depth 1) and won 1,477. The depth-1 screens of Good Practice (Dragon 9.6%) and Easy Start (dark 70.8%) are far from the band, and the 40-game depth-1 sweep shows no option that would bring both depths into it.

**Outcome (owner):** the three 3-player presets stay experimental as they are; no default changes and no 3-player Candidate. D62 to D65 are confirmed unchanged. This closes Phase 6. Why light collapses at depth 2 (the rules, or the depth-2 horizon, where each seat sees only the next seat's reply) is open, and should be looked into before any 3-player default is changed.
