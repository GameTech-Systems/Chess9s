# Balance report: heavy-3p 0.1.0 with turn.3p.order="dragon-dark-light"

Verdict: **incomplete** (2026-11-01).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dragon | dark | light | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 37.6% (33.0–42.5%) | 34.3% (29.8–39.0%) | 28.1% (23.9–32.7%) | 142 | 0 | 308 / 279 / 17–959 | 400 | too few games |
| default | 2 | 400 | 60.8% (55.9–65.4%) | 27.9% (23.7–32.5%) | 11.4% (8.6–14.9%) | 106 | 0 | 290 / 258.5 / 11–872 | 400 | dragon score outside 28–38%, dark score outside 28–38%, light score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 140 |
| In the duel, the Dragon checkmates (or captures) the last King | 112 |
| In the duel, the last Kinged player checkmates the Tail | 1 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 5 |
| A draw while both Kings are on the board (between the Kinged players) | 65 |
| A draw in the duel (the last Kinged player and the Dragon) | 77 |

Wins by seat: dragon 112 (checkmate 64, king-capture 48); dark 95 (checkmate 91, dragon-captured 4); light 51 (checkmate 50, dragon-captured 1). Draws by who shares them: dark+light 65, dragon+dark 19, dragon+light 58. By reason: checkmate 205, dragon-captured 5, fifty-move 101, king-capture 48, repetition 40, stalemate 1. Games in which it happened: dragon-out 111, king-captured:dark 142, king-captured:light 53, tail-stone:dark 133, tail-stone:light 64. 43.6 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 82 |
| In the duel, the Dragon checkmates (or captures) the last King | 201 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 11 |
| A draw while both Kings are on the board (between the Kinged players) | 22 |
| A draw in the duel (the last Kinged player and the Dragon) | 84 |

Wins by seat: dragon 201 (checkmate 76, king-capture 125); dark 71 (checkmate 64, dragon-captured 7); light 22 (checkmate 18, dragon-captured 4). Draws by who shares them: dark+light 22, dragon+dark 59, dragon+light 25. By reason: checkmate 158, dragon-captured 11, fifty-move 99, king-capture 125, repetition 4, stalemate 3. Games in which it happened: dragon-out 35, king-captured:dark 74, king-captured:light 222, tail-stone:dark 80, tail-stone:light 113. 605.6 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
