# Balance report: light-3p 0.1.0

Verdict: **incomplete** (2026-11-01).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 55.8% (50.9–60.5%) | 32.9% (28.5–37.6%) | 11.4% (8.6–14.9%) | 72 | 0 | 260 / 228.5 / 7–725 | 400 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| default | 2 | 400 | 22.5% (18.7–26.8%) | 4.8% (3.1–7.3%) | 72.8% (68.2–76.9%) | 133 | 0 | 287 / 246 / 7–852 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 288 |
| In the duel, the Dragon checkmates (or captures) the last King | 35 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 5 |
| A draw while both Kings are on the board (between the Kinged players) | 51 |
| A draw in the duel (the last Kinged player and the Dragon) | 21 |

Wins by seat: dark 191 (checkmate 187, dragon-captured 4); light 102 (checkmate 101, dragon-captured 1); dragon 35 (checkmate 35). Draws by who shares them: dark+dragon 13, dark+light 51, light+dragon 8. By reason: checkmate 323, dragon-captured 5, fifty-move 55, repetition 17. Games in which it happened: dragon-out 298, king-captured:dark 24, king-captured:light 37, tail-stone:dark 1, tail-stone:light 297. 32.1 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 32 |
| In the duel, the Dragon checkmates (or captures) the last King | 226 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 9 |
| A draw while both Kings are on the board (between the Kinged players) | 3 |
| A draw in the duel (the last Kinged player and the Dragon) | 130 |

Wins by seat: dark 35 (checkmate 29, dragon-captured 6); light 6 (checkmate 3, dragon-captured 3); dragon 226 (checkmate 226). Draws by who shares them: dark+dragon 107, dark+light 3, light+dragon 23. By reason: checkmate 258, dragon-captured 9, fifty-move 132, repetition 1. Games in which it happened: dragon-out 5, king-captured:dark 72, king-captured:light 293, tail-stone:dark 5. 583.0 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
