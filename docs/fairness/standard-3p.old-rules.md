# Balance report: standard-3p 0.3.0 with coast.3p.attackFrom="allowed", coast.3p.capturable=false

Verdict: **incomplete** (2026-10-30).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 31.9% (27.5–36.6%) | 37.3% (32.7–42.1%) | 30.9% (26.5–35.6%) | 90 | 0 | 248 / 209 / 7–803 | 400 | too few games |
| default | 2 | 400 | 23.6% (19.7–28.0%) | 5.9% (4.0–8.6%) | 70.5% (65.9–74.8%) | 45 | 0 | 244 / 219 / 7–832 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 173 |
| In the duel, the Dragon checkmates (or captures) the last King | 108 |
| In the duel, the last Kinged player checkmates the Tail | 11 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 18 |
| A draw while both Kings are on the board (between the Kinged players) | 59 |
| A draw in the duel (the last Kinged player and the Dragon) | 31 |

Wins by seat: dark 93 (checkmate 93); light 109 (checkmate 91, dragon-captured 18); dragon 108 (checkmate 73, king-capture 35). Draws by who shares them: dark+dragon 10, dark+light 59, light+dragon 21. By reason: checkmate 257, dragon-captured 18, fifty-move 50, insufficient-material 3, king-capture 35, repetition 36, stalemate 1. Games in which it happened: dragon-out 174, king-captured:dark 127, king-captured:light 41, tail-stone:dark 155, tail-stone:light 65. 49.1 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 65 |
| In the duel, the Dragon checkmates (or captures) the last King | 270 |
| In the duel, the last Kinged player checkmates the Tail | 1 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 19 |
| A draw while both Kings are on the board (between the Kinged players) | 21 |
| A draw in the duel (the last Kinged player and the Dragon) | 24 |

Wins by seat: dark 74 (checkmate 57, dragon-captured 17); light 11 (checkmate 9, dragon-captured 2); dragon 270 (checkmate 119, king-capture 151). Draws by who shares them: dark+dragon 20, dark+light 21, light+dragon 4. By reason: checkmate 185, dragon-captured 19, fifty-move 35, king-capture 151, repetition 9, stalemate 1. Games in which it happened: dragon-out 24, king-captured:dark 53, king-captured:light 261, tail-stone:dark 45, tail-stone:light 64. 831.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
