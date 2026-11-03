# Balance report: heavy-limited3-3p 0.1.0

Verdict: **incomplete** (2026-11-02).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 54.5% (49.6–59.3%) | 30.3% (26.0–34.9%) | 15.3% (12.1–19.1%) | 105 | 0 | 283 / 270 / 7–876 | 400 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| default | 2 | 400 | 45.3% (40.4–50.1%) | 22.0% (18.2–26.3%) | 32.8% (28.3–37.5%) | 126 | 0 | 345 / 325.5 / 7–912 | 400 | dark score outside 28–38%, light score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 241 |
| In the duel, the Dragon checkmates (or captures) the last King | 42 |
| In the duel, the last Kinged player checkmates the Tail | 5 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 7 |
| A draw while both Kings are on the board (between the Kinged players) | 67 |
| A draw in the duel (the last Kinged player and the Dragon) | 38 |

Wins by seat: dark 179 (checkmate 177, dragon-captured 2); light 74 (checkmate 69, dragon-captured 5); dragon 42 (checkmate 25, king-capture 17). Draws by who shares them: dark+dragon 11, dark+light 67, light+dragon 27. By reason: checkmate 271, dragon-captured 7, fifty-move 79, king-capture 17, repetition 25, stalemate 1. Games in which it happened: dragon-out 173, king-captured:dark 64, king-captured:light 28, tail-stone:dark 169, tail-stone:light 107. 33.2 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 155 |
| In the duel, the Dragon checkmates (or captures) the last King | 88 |
| In the duel, the last Kinged player checkmates the Tail | 2 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 29 |
| A draw while both Kings are on the board (between the Kinged players) | 40 |
| A draw in the duel (the last Kinged player and the Dragon) | 86 |

Wins by seat: dark 130 (checkmate 108, dragon-captured 22); light 56 (checkmate 49, dragon-captured 7); dragon 88 (checkmate 21, king-capture 67). Draws by who shares them: dark+dragon 62, dark+light 40, light+dragon 24. By reason: checkmate 178, dragon-captured 29, fifty-move 123, king-capture 67, repetition 2, stalemate 1. Games in which it happened: dragon-out 83, king-captured:dark 58, king-captured:light 147, tail-stone:dark 141, tail-stone:light 115. 481.8 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
