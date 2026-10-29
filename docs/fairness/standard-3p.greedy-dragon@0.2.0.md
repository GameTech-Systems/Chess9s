# Balance report: standard-3p 0.2.0 (greedy-dragon)

Verdict: **not scored** (2026-10-29).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The greedy Dragon (S58) plays against Kinged players who search (S62): what players meet against the computer Dragon. Reported, not scored against D60. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 16.5% (13.2–20.5%) | 42.1% (37.4–47.0%) | 41.4% (36.7–46.3%) | 170 | 0 | 202 / 177 / 7–792 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 48 |
| In the duel, the Dragon checkmates (or captures) the last King | 99 |
| In the duel, the last Kinged player checkmates the Tail | 18 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 65 |
| A draw while both Kings are on the board (between the Kinged players) | 37 |
| A draw in the duel (the last Kinged player and the Dragon) | 133 |

Wins by seat: dark 38 (checkmate 32, dragon-captured 6); light 93 (checkmate 34, dragon-captured 59); dragon 99 (checkmate 95, king-capture 4). Draws by who shares them: dark+dragon 19, dark+light 37, light+dragon 114. By reason: checkmate 161, dragon-captured 65, fifty-move 21, king-capture 4, repetition 144, stalemate 5. Games in which it happened: dragon-out 1, king-captured:dark 259, king-captured:light 56, tail-stone:dark 103, tail-stone:light 42. 24.3 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
