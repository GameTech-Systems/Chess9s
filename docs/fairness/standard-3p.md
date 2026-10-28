# Balance report: standard-3p 0.1.0

Verdict: **fail** (2026-10-28).

Measured as decision 0015 (version 1, provisional) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 2000 | 26.3% (24.4–28.3%) | 38.3% (36.2–40.5%) | 35.4% (33.3–37.5%) | 496 | 0 | 233 / 192.5 / 7–921 | 2000 | dark score outside 28–38%, light score outside 28–38% |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 631 |
| In the duel, the Dragon checkmates (or captures) the last King | 579 |
| In the duel, the last Kinged player checkmates the Tail | 109 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 185 |
| A draw while both Kings are on the board (between the Kinged players) | 239 |
| A draw in the duel (the last Kinged player and the Dragon) | 257 |

Wins by seat: dark 368 (checkmate 326, dragon-captured 42); light 557 (checkmate 414, dragon-captured 143); dragon 579 (checkmate 313, king-capture 266). Draws by who shares them: dark+dragon 77, dark+light 239, light+dragon 180. By reason: checkmate 1053, dragon-captured 185, fifty-move 293, insufficient-material 15, king-capture 266, repetition 185, stalemate 3. Games in which it happened: dragon-out 660, king-captured:dark 763, king-captured:light 367, tail-stone:dark 520, tail-stone:light 272. 46.6 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
