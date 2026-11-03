# Balance report: heavy-h3-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-03).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 150 | 33.7% (26.6–41.6%) | 35.3% (28.1–43.3%) | 31.0% (24.2–38.8%) | 46 | 0 | 415 / 370.5 / 7–1155 | 150 | too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 51 |
| In the duel, the Dragon checkmates (or captures) the last King | 28 |
| In the duel, the last Kinged player checkmates the Tail | 9 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 16 |
| A draw while both Kings are on the board (between the Kinged players) | 9 |
| A draw in the duel (the last Kinged player and the Dragon) | 37 |

Wins by seat: dark 36 (checkmate 27, dragon-captured 9); light 40 (checkmate 33, dragon-captured 7); dragon 28 (checkmate 9, king-capture 19). Draws by who shares them: dark+dragon 20, dark+light 9, light+dragon 17. By reason: checkmate 69, dragon-captured 16, fifty-move 44, king-capture 19, repetition 2. Games in which it happened: dragon-out 28, king-captured:dark 43, king-captured:light 47, tail-stone:dark 38, tail-stone:light 30. 4960.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
