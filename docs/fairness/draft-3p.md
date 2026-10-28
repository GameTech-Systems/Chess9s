# Balance report: draft-3p 0.3.0

Verdict: **incomplete** (2026-10-28).

Measured as decision 0015 (version 1, provisional) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 48.1% (43.3–53.0%) | 42.3% (37.5–47.1%) | 9.6% (7.1–12.9%) | 190 | 0 | 336 / 344 / 7–778 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 168 |
| In the duel, the Dragon checkmates (or captures) the last King | 27 |
| In the duel, the last Kinged player checkmates the Tail | 5 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 10 |
| A draw while both Kings are on the board (between the Kinged players) | 167 |
| A draw in the duel (the last Kinged player and the Dragon) | 23 |

Wins by seat: dark 104 (checkmate 101, dragon-captured 3); light 79 (checkmate 72, dragon-captured 7); dragon 27 (checkmate 17, king-capture 10). Draws by who shares them: dark+dragon 10, dark+light 167, light+dragon 13. By reason: checkmate 190, dragon-captured 10, fifty-move 173, insufficient-material 3, king-capture 10, repetition 14. Games in which it happened: dragon-out 311, king-captured:dark 34, king-captured:light 31, tail-stone:dark 177, tail-stone:light 153. 67.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
