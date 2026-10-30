# Balance report: standard-3p 0.3.0

Verdict: **incomplete** (2026-10-29).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 54.0% (49.1–58.8%) | 37.5% (32.9–42.3%) | 8.5% (6.1–11.6%) | 61 | 0 | 244 / 216.5 / 7–736 | 400 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| default | 2 | 400 | 45.8% (40.9–50.6%) | 34.9% (30.4–39.7%) | 19.4% (15.8–23.5%) | 78 | 0 | 293 / 250.5 / 7–746 | 400 | dark score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 263 |
| In the duel, the Dragon checkmates (or captures) the last King | 29 |
| In the duel, the last Kinged player checkmates the Tail | 12 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 35 |
| A draw while both Kings are on the board (between the Kinged players) | 51 |
| A draw in the duel (the last Kinged player and the Dragon) | 10 |

Wins by seat: dark 188 (checkmate 183, dragon-captured 5); light 122 (checkmate 92, dragon-captured 30); dragon 29 (checkmate 16, king-capture 13). Draws by who shares them: dark+dragon 5, dark+light 51, light+dragon 5. By reason: checkmate 291, dragon-captured 35, fifty-move 45, insufficient-material 1, king-capture 13, repetition 15. Games in which it happened: dragon-out 227, king-captured:dark 62, king-captured:light 24, tail-stone:dark 165, tail-stone:light 124. 39.4 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 218 |
| In the duel, the Dragon checkmates (or captures) the last King | 66 |
| In the duel, the last Kinged player checkmates the Tail | 7 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 31 |
| A draw while both Kings are on the board (between the Kinged players) | 55 |
| A draw in the duel (the last Kinged player and the Dragon) | 23 |

Wins by seat: dark 146 (checkmate 120, dragon-captured 26); light 110 (checkmate 105, dragon-captured 5); dragon 66 (checkmate 32, king-capture 34). Draws by who shares them: dark+dragon 19, dark+light 55, light+dragon 4. By reason: checkmate 257, dragon-captured 31, fifty-move 74, king-capture 34, repetition 3, stalemate 1. Games in which it happened: dragon-out 208, king-captured:dark 28, king-captured:light 99, tail-stone:dark 100, tail-stone:light 180. 454.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
