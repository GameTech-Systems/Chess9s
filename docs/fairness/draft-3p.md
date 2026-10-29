# Balance report: draft-3p 0.4.0

Verdict: **incomplete** (2026-10-29).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 44.4% (39.6–49.3%) | 45.0% (40.2–49.9%) | 10.6% (8.0–14.0%) | 183 | 0 | 355 / 357.5 / 7–962 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 169 |
| In the duel, the Dragon checkmates (or captures) the last King | 33 |
| In the duel, the last Kinged player checkmates the Tail | 9 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 6 |
| A draw while both Kings are on the board (between the Kinged players) | 164 |
| A draw in the duel (the last Kinged player and the Dragon) | 19 |

Wins by seat: dark 93 (checkmate 91, dragon-captured 2); light 91 (checkmate 87, dragon-captured 4); dragon 33 (checkmate 16, king-capture 17). Draws by who shares them: dark+dragon 5, dark+light 164, light+dragon 14. By reason: checkmate 194, dragon-captured 6, fifty-move 175, insufficient-material 1, king-capture 17, repetition 3, stalemate 4. Games in which it happened: dragon-out 294, king-captured:dark 45, king-captured:light 22, tail-stone:dark 183, tail-stone:light 150. 90.6 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
