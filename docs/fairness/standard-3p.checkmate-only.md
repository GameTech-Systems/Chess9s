# Balance report: standard-3p 0.3.0 with coast.3p.attackFrom="allowed", coast.3p.capturable=false, dragon.3p.givesCheck=true

Verdict: **incomplete** (2026-10-30).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 31.1% (26.8–35.8%) | 24.5% (20.5–28.9%) | 44.4% (39.6–49.3%) | 76 | 0 | 222 / 187 / 7–767 | 400 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| default | 2 | 400 | 23.8% (19.8–28.2%) | 6.6% (4.6–9.5%) | 69.6% (64.9–73.9%) | 44 | 0 | 247 / 223 / 7–744 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 139 |
| In the duel, the Dragon checkmates (or captures) the last King | 153 |
| In the duel, the last Kinged player checkmates the Tail | 11 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 21 |
| A draw while both Kings are on the board (between the Kinged players) | 27 |
| A draw in the duel (the last Kinged player and the Dragon) | 49 |

Wins by seat: dark 93 (checkmate 85, dragon-captured 8); light 78 (checkmate 65, dragon-captured 13); dragon 153 (checkmate 100, king-capture 53). Draws by who shares them: dark+dragon 36, dark+light 27, light+dragon 13. By reason: checkmate 250, dragon-captured 21, fifty-move 35, insufficient-material 3, king-capture 53, repetition 37, stalemate 1. Games in which it happened: dragon-out 99, king-captured:dark 106, king-captured:light 128, tail-stone:dark 145, tail-stone:light 52. 49.8 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 54 |
| In the duel, the Dragon checkmates (or captures) the last King | 267 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 35 |
| A draw while both Kings are on the board (between the Kinged players) | 21 |
| A draw in the duel (the last Kinged player and the Dragon) | 23 |

Wins by seat: dark 75 (checkmate 44, dragon-captured 31); light 14 (checkmate 10, dragon-captured 4); dragon 267 (checkmate 104, king-capture 163). Draws by who shares them: dark+dragon 19, dark+light 21, light+dragon 4. By reason: checkmate 158, dragon-captured 35, fifty-move 36, king-capture 163, repetition 7, stalemate 1. Games in which it happened: dragon-out 27, king-captured:dark 77, king-captured:light 248, tail-stone:dark 39, tail-stone:light 56. 1052.7 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
