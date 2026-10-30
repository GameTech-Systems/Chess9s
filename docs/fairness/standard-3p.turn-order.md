# Balance report: standard-3p 0.3.0 with coast.3p.attackFrom="allowed", coast.3p.capturable=false, turn.3p.order="dark-dragon-light"

Verdict: **incomplete** (2026-10-30).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | dragon | light | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 37.4% (32.8–42.2%) | 30.5% (26.2–35.2%) | 32.1% (27.7–36.9%) | 84 | 0 | 252 / 215.5 / 7–701 | 400 | too few games |
| default | 2 | 400 | 5.6% (3.8–8.3%) | 69.8% (65.1–74.0%) | 24.6% (20.7–29.1%) | 38 | 0 | 244 / 215.5 / 7–998 | 400 | dark score outside 28–38%, dragon score outside 28–38%, light score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 183 |
| In the duel, the Dragon checkmates (or captures) the last King | 107 |
| In the duel, the last Kinged player checkmates the Tail | 6 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 20 |
| A draw while both Kings are on the board (between the Kinged players) | 54 |
| A draw in the duel (the last Kinged player and the Dragon) | 30 |

Wins by seat: dark 111 (checkmate 96, dragon-captured 15); dragon 107 (checkmate 65, king-capture 42); light 98 (checkmate 93, dragon-captured 5). Draws by who shares them: dark+dragon 23, dark+light 54, dragon+light 7. By reason: checkmate 254, dragon-captured 20, fifty-move 53, insufficient-material 3, king-capture 42, repetition 28. Games in which it happened: dragon-out 174, king-captured:dark 40, king-captured:light 123, tail-stone:dark 76, tail-stone:light 149. 48.8 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 59 |
| In the duel, the Dragon checkmates (or captures) the last King | 269 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 34 |
| A draw while both Kings are on the board (between the Kinged players) | 18 |
| A draw in the duel (the last Kinged player and the Dragon) | 20 |

Wins by seat: dark 13 (checkmate 8, dragon-captured 5); dragon 269 (checkmate 123, king-capture 146); light 80 (checkmate 51, dragon-captured 29). Draws by who shares them: dark+dragon 1, dark+light 18, dragon+light 19. By reason: checkmate 182, dragon-captured 34, fifty-move 31, king-capture 146, repetition 7. Games in which it happened: dragon-out 15, king-captured:dark 267, king-captured:light 56, tail-stone:dark 61, tail-stone:light 38. 774.6 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
