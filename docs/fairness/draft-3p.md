# Balance report: draft-3p 0.5.0

Verdict: **incomplete** (2026-11-23).

Measured as decision 0015 (version 2) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at depth 3. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 40 | 57.5% (42.2–71.5%) | 33.8% (21.1–49.2%) | 8.8% (3.3–21.5%) | 22 | 0 | 371 / 392.5 / 28–722 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 17 |
| In the duel, the Dragon checkmates (or captures) the last King | 1 |
| A draw while both Kings are on the board (between the Kinged players) | 17 |
| A draw in the duel (the last Kinged player and the Dragon) | 5 |

Wins by seat: dark 13 (checkmate 13); light 4 (checkmate 4); dragon 1 (checkmate 1). Draws by who shares them: dark+dragon 3, dark+light 17, light+dragon 2. By reason: checkmate 18, fifty-move 20, insufficient-material 1, repetition 1. Games in which it happened: dragon-out 22, king-captured:dark 3, king-captured:light 3, tail-stone:dark 18, tail-stone:light 7. 71.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
