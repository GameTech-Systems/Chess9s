# Balance report: heavy-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-01).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 149 | 24.5% (18.3–32.0%) | 24.8% (18.6–32.3%) | 50.7% (42.7–58.6%) | 38 | 0 | 402 / 364 / 7–1051 | 149 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 36 |
| In the duel, the Dragon checkmates (or captures) the last King | 60 |
| In the duel, the last Kinged player checkmates the Tail | 11 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 4 |
| A draw while both Kings are on the board (between the Kinged players) | 7 |
| A draw in the duel (the last Kinged player and the Dragon) | 31 |

Wins by seat: dark 23 (checkmate 22, dragon-captured 1); light 28 (checkmate 25, dragon-captured 3); dragon 60 (checkmate 36, king-capture 24). Draws by who shares them: dark+dragon 20, dark+light 7, light+dragon 11. By reason: checkmate 83, dragon-captured 4, fifty-move 38, king-capture 24. Games in which it happened: dragon-out 24, king-captured:dark 48, king-captured:light 58, tail-stone:dark 31, tail-stone:light 26. 3698.0 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
