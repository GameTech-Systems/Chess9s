# Balance report: light-3p 0.1.0 with turn.3p.order="light-dragon-dark"

Verdict: **incomplete** (2026-11-01).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | light | dragon | dark | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 32.8% (28.3–37.5%) | 9.9% (7.3–13.2%) | 57.4% (52.5–62.1%) | 81 | 0 | 267 / 233 / 7–797 | 400 | dragon score outside 28–38%, dark score outside 28–38%, too few games |
| default | 2 | 400 | 5.8% (3.9–8.5%) | 73.0% (68.4–77.1%) | 21.3% (17.5–25.5%) | 138 | 0 | 295 / 267 / 7–726 | 400 | light score outside 28–38%, dragon score outside 28–38%, dark score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 292 |
| In the duel, the Dragon checkmates (or captures) the last King | 27 |
| A draw while both Kings are on the board (between the Kinged players) | 56 |
| A draw in the duel (the last Kinged player and the Dragon) | 25 |

Wins by seat: light 96 (checkmate 96); dragon 27 (checkmate 27); dark 196 (checkmate 196). Draws by who shares them: dragon+dark 11, light+dark 56, light+dragon 14. By reason: checkmate 319, fifty-move 60, repetition 19, stalemate 2. Games in which it happened: dragon-out 309, king-captured:dark 24, king-captured:light 28, tail-stone:dark 1, tail-stone:light 308. 37.9 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 28 |
| In the duel, the Dragon checkmates (or captures) the last King | 225 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 9 |
| A draw while both Kings are on the board (between the Kinged players) | 4 |
| A draw in the duel (the last Kinged player and the Dragon) | 134 |

Wins by seat: light 7 (checkmate 6, dragon-captured 1); dragon 225 (checkmate 225); dark 30 (checkmate 22, dragon-captured 8). Draws by who shares them: dragon+dark 106, light+dark 4, light+dragon 28. By reason: checkmate 253, dragon-captured 9, fifty-move 135, repetition 2, stalemate 1. Games in which it happened: dragon-out 5, king-captured:dark 80, king-captured:light 288, tail-stone:dark 2, tail-stone:light 3. 620.9 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
