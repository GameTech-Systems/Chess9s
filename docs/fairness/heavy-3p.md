# Balance report: heavy-3p 0.1.0

Verdict: **incomplete** (2026-10-31).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 36.6% (32.1–41.5%) | 28.6% (24.4–33.2%) | 34.8% (30.2–39.5%) | 138 | 0 | 299 / 276 / 7–988 | 400 | too few games |
| default | 2 | 400 | 27.5% (23.4–32.1%) | 10.5% (7.9–13.9%) | 62.0% (57.2–66.6%) | 113 | 0 | 305 / 269 / 7–1239 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 160 |
| In the duel, the Dragon checkmates (or captures) the last King | 98 |
| In the duel, the last Kinged player checkmates the Tail | 2 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 2 |
| A draw while both Kings are on the board (between the Kinged players) | 56 |
| A draw in the duel (the last Kinged player and the Dragon) | 82 |

Wins by seat: dark 105 (checkmate 104, dragon-captured 1); light 59 (checkmate 58, dragon-captured 1); dragon 98 (checkmate 65, king-capture 33). Draws by who shares them: dark+dragon 27, dark+light 56, light+dragon 55. By reason: checkmate 227, dragon-captured 2, fifty-move 100, king-capture 33, repetition 38. Games in which it happened: dragon-out 120, king-captured:dark 125, king-captured:light 59, tail-stone:dark 135, tail-stone:light 58. 42.1 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 75 |
| In the duel, the Dragon checkmates (or captures) the last King | 205 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 7 |
| A draw while both Kings are on the board (between the Kinged players) | 27 |
| A draw in the duel (the last Kinged player and the Dragon) | 86 |

Wins by seat: dark 63 (checkmate 57, dragon-captured 6); light 19 (checkmate 18, dragon-captured 1); dragon 205 (checkmate 76, king-capture 129). Draws by who shares them: dark+dragon 67, dark+light 27, light+dragon 19. By reason: checkmate 151, dragon-captured 7, fifty-move 109, king-capture 129, repetition 3, stalemate 1. Games in which it happened: dragon-out 40, king-captured:dark 76, king-captured:light 222, tail-stone:dark 66, tail-stone:light 97. 661.6 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
