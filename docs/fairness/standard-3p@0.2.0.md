# Balance report: standard-3p 0.2.0

Verdict: **fail** (2026-10-29).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 2000 | 32.6% (30.6–34.7%) | 36.7% (34.6–38.8%) | 30.7% (28.7–32.8%) | 423 | 0 | 243 / 210 / 7–842 | 2000 | none |
| default | 2 | 2000 | 22.9% (21.1–24.8%) | 5.7% (4.8–6.8%) | 71.4% (69.4–73.4%) | 212 | 0 | 247 / 221 / 7–1096 | 2000 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38% |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 868 |
| In the duel, the Dragon checkmates (or captures) the last King | 540 |
| In the duel, the last Kinged player checkmates the Tail | 63 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 106 |
| A draw while both Kings are on the board (between the Kinged players) | 275 |
| A draw in the duel (the last Kinged player and the Dragon) | 148 |

Wins by seat: dark 494 (checkmate 474, dragon-captured 20); light 543 (checkmate 457, dragon-captured 86); dragon 540 (checkmate 323, king-capture 217). Draws by who shares them: dark+dragon 41, dark+light 275, light+dragon 107. By reason: checkmate 1254, dragon-captured 106, fifty-move 239, insufficient-material 11, king-capture 217, repetition 158, stalemate 15. Games in which it happened: dragon-out 807, king-captured:dark 617, king-captured:light 240, tail-stone:dark 781, tail-stone:light 289. 47.3 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 311 |
| In the duel, the Dragon checkmates (or captures) the last King | 1366 |
| In the duel, the last Kinged player checkmates the Tail | 3 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 108 |
| A draw while both Kings are on the board (between the Kinged players) | 87 |
| A draw in the duel (the last Kinged player and the Dragon) | 125 |

Wins by seat: dark 366 (checkmate 273, dragon-captured 93); light 56 (checkmate 41, dragon-captured 15); dragon 1366 (checkmate 506, king-capture 860). Draws by who shares them: dark+dragon 96, dark+light 87, light+dragon 29. By reason: checkmate 820, dragon-captured 108, fifty-move 177, king-capture 860, repetition 28, stalemate 7. Games in which it happened: dragon-out 119, king-captured:dark 271, king-captured:light 1331, tail-stone:dark 219, tail-stone:light 286. 887.1 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
