# Balance report: standard-3p 0.1.0 (greedy-dragon)

Verdict: **not scored** (2026-10-28).

Measured as decision 0015 (version 1, provisional) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The greedy Dragon (S58) plays against Kinged players who search (S62): what players meet against the computer Dragon. Reported, not scored against D60. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 20.4% (16.7–24.6%) | 40.8% (36.0–45.6%) | 38.9% (34.2–43.7%) | 158 | 0 | 161 / 130 / 7–779 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 39 |
| In the duel, the Dragon checkmates (or captures) the last King | 91 |
| In the duel, the last Kinged player checkmates the Tail | 7 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 105 |
| A draw while both Kings are on the board (between the Kinged players) | 29 |
| A draw in the duel (the last Kinged player and the Dragon) | 129 |

Wins by seat: dark 45 (checkmate 15, dragon-captured 30); light 106 (checkmate 31, dragon-captured 75); dragon 91 (checkmate 83, king-capture 8). Draws by who shares them: dark+dragon 44, dark+light 29, light+dragon 85. By reason: checkmate 129, dragon-captured 105, fifty-move 12, insufficient-material 1, king-capture 8, repetition 143, stalemate 2. Games in which it happened: dragon-out 10, king-captured:dark 223, king-captured:light 109, tail-stone:dark 39, tail-stone:light 19. 33.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
