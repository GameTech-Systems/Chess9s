# Balance report: heavy-3p 0.1.0 with turn.3p.order="light-dragon-dark"

Verdict: **incomplete** (2026-10-31).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | light | dragon | dark | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 33.4% (28.9–38.1%) | 31.4% (27.0–36.1%) | 35.3% (30.7–40.1%) | 128 | 0 | 280 / 243.5 / 7–837 | 400 | too few games |
| default | 2 | 400 | 10.0% (7.4–13.3%) | 59.5% (54.6–64.2%) | 30.5% (26.2–35.2%) | 107 | 0 | 283 / 247 / 7–850 | 400 | light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 172 |
| In the duel, the Dragon checkmates (or captures) the last King | 97 |
| In the duel, the last Kinged player checkmates the Tail | 3 |
| A draw while both Kings are on the board (between the Kinged players) | 71 |
| A draw in the duel (the last Kinged player and the Dragon) | 57 |

Wins by seat: light 72 (checkmate 72); dragon 97 (checkmate 53, king-capture 44); dark 103 (checkmate 103). Draws by who shares them: dragon+dark 5, light+dark 71, light+dragon 52. By reason: checkmate 228, fifty-move 91, insufficient-material 1, king-capture 44, repetition 35, stalemate 1. Games in which it happened: dragon-out 129, king-captured:dark 126, king-captured:light 31, tail-stone:dark 142, tail-stone:light 55. 43.5 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 89 |
| In the duel, the Dragon checkmates (or captures) the last King | 193 |
| In the duel, the last Kinged player checkmates the Tail | 1 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 10 |
| A draw while both Kings are on the board (between the Kinged players) | 17 |
| A draw in the duel (the last Kinged player and the Dragon) | 90 |

Wins by seat: light 19 (checkmate 18, dragon-captured 1); dragon 193 (checkmate 65, king-capture 128); dark 81 (checkmate 72, dragon-captured 9). Draws by who shares them: dragon+dark 65, light+dark 17, light+dragon 25. By reason: checkmate 155, dragon-captured 10, fifty-move 102, king-capture 128, repetition 5. Games in which it happened: dragon-out 34, king-captured:dark 78, king-captured:light 216, tail-stone:dark 72, tail-stone:light 96. 635.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
