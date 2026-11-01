# Balance report: light-3p 0.1.0 with turn.3p.order="dragon-dark-light"

Verdict: **incomplete** (2026-11-01).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dragon | dark | light | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 12.8% (9.8–16.4%) | 52.4% (47.5–57.2%) | 34.9% (30.4–39.7%) | 79 | 0 | 265 / 233.5 / 14–854 | 400 | dragon score outside 28–38%, dark score outside 28–38%, too few games |
| default | 2 | 400 | 69.0% (64.3–73.3%) | 26.3% (22.2–30.8%) | 4.8% (3.1–7.3%) | 143 | 0 | 299 / 273.5 / 14–838 | 400 | dragon score outside 28–38%, dark score outside 28–38%, light score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 282 |
| In the duel, the Dragon checkmates (or captures) the last King | 36 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 3 |
| A draw while both Kings are on the board (between the Kinged players) | 49 |
| A draw in the duel (the last Kinged player and the Dragon) | 30 |

Wins by seat: dragon 36 (checkmate 36); dark 175 (checkmate 174, dragon-captured 1); light 110 (checkmate 108, dragon-captured 2). Draws by who shares them: dark+light 49, dragon+dark 20, dragon+light 10. By reason: checkmate 318, dragon-captured 3, fifty-move 55, repetition 23, stalemate 1. Games in which it happened: dragon-out 301, king-captured:dark 31, king-captured:light 38, tail-stone:light 301. 36.5 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 39 |
| In the duel, the Dragon checkmates (or captures) the last King | 205 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 13 |
| A draw while both Kings are on the board (between the Kinged players) | 1 |
| A draw in the duel (the last Kinged player and the Dragon) | 142 |

Wins by seat: dragon 205 (checkmate 205); dark 48 (checkmate 37, dragon-captured 11); light 4 (checkmate 2, dragon-captured 2). Draws by who shares them: dark+light 1, dragon+dark 113, dragon+light 29. By reason: checkmate 244, dragon-captured 13, fifty-move 143. Games in which it happened: dragon-out 9, king-captured:dark 83, king-captured:light 277, tail-stone:dark 6, tail-stone:light 3. 592.8 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
