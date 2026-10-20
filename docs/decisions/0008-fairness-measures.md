# 0008: Fairness measures for 2-player rulesets

**Status:** Accepted (ledger D12, default). Committed in S24 before any simulation run. The choices marked *provisional* are defaults picked by Claude within D12; the owner may change them, and a change is a new version of this record.

## Context
Decision [0004](0004-two-player-fairness-and-tournament-rules.md) requires the default 2-player ruleset to be fairness-checked before it is published as a Candidate. D12 sets the measure: the first player's score must fall between 47% and 53% over at least 2,000 bot games at two search depths, with the draw rate and game length reported. This record fixes how that is measured, so the thresholds can't be adjusted to fit the results afterwards.

## Measures
- **First-player score** = (games won by the first mover + ½ × drawn games) ÷ games played. The first mover is the first seat in the ruleset's turn order (`turn.firstMove`), whichever color that is. Wins by stalemate (`draw.stalemate` options) count as wins.
- **Pass:** at **each** of two search depths, at least **2,000** finished games and a first-player score of at least 47.0% and at most 53.0% (point estimate, as D12 states it). The 95% Wilson interval is reported alongside.
- **Reported, not thresholded:** wins by each seat and by each color, draws by reason (stalemate, insufficient material, repetition, fifty moves), the draw rate, game length in plies (mean, median, shortest, longest), the number of distinct games, and the search depth actually reached.
- **Flags:** a run is flagged when its score is outside 47–53%, when it has fewer than 2,000 games (`too few games`), or when any game hit the safety cap (`unfinished games`).

## How games are played
- Both seats are played by the same engine search (`bestMove`, S23): negamax with alpha-beta and quiescence, evaluation from movement data. So seat balance is measured with equal strength on both sides.
- **Depths (provisional):** 1 and 2 plies of full-width search plus quiescence, with a budget of 100,000 positions per move (enough that depth 2 always completes). Depth 2 is about 20 times slower than depth 1 (about 110 s against 5 s per game in S24).
- **Variety (provisional):** each game opens with 4 random legal plies (2 per side), and the search breaks ties at random. Both use a seeded generator; game *i* of a run uses seed *base + i*, so a run is reproducible and doesn't depend on how many worker threads played it.
- **Safety cap (provisional):** 2,000 plies. The draw rules should end every game well before that; a game that reaches it counts as a draw and flags the run.

## Parameter combinations
- A sweep changes one 2-player parameter at a time from the ruleset's values: each other option of an integer, boolean or enum parameter, and each option added to or removed from an enumSet. Combinations the engine can't play yet (`unbuiltFeatures`) or that resolve to an invalid ruleset are listed as skipped.
- Sweeps with fewer than 2,000 games per combination are screening only: a flag means "worth a full run", not a fairness verdict.

## Consequences
- `packages/sim` implements these measures (`src/measures.ts` holds the numbers) and writes each report as JSON and Markdown to `docs/fairness/`.
- A ruleset is published as a Candidate only with a passing report at both depths; the report is published with it.
- Changing a threshold, a depth or the variety rule needs a new version of this record, and earlier reports stay labeled with the version they used.
