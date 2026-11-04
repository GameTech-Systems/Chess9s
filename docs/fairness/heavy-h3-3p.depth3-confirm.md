# Balance report: heavy-h3-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-04).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 449 | 33.2% (29.0–37.7%) | 32.3% (28.1–36.8%) | 34.5% (30.3–39.0%) | 150 | 0 | 419 / 383 / 7–1155 | 449 | too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 147 |
| In the duel, the Dragon checkmates (or captures) the last King | 91 |
| In the duel, the last Kinged player checkmates the Tail | 28 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 33 |
| A draw while both Kings are on the board (between the Kinged players) | 22 |
| A draw in the duel (the last Kinged player and the Dragon) | 128 |

Wins by seat: dark 107 (checkmate 87, dragon-captured 20); light 101 (checkmate 88, dragon-captured 13); dragon 91 (checkmate 45, king-capture 46). Draws by who shares them: dark+dragon 62, dark+light 22, light+dragon 66. By reason: checkmate 220, dragon-captured 33, fifty-move 147, king-capture 46, repetition 2, stalemate 1. Games in which it happened: dragon-out 87, king-captured:dark 136, king-captured:light 144, tail-stone:dark 113, tail-stone:light 93. 4710.8 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
