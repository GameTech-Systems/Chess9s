# Balance report: light-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-01).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 147 | 22.8% (16.8–30.2%) | 16.0% (10.9–22.8%) | 61.2% (53.2–68.7%) | 67 | 0 | 446 / 383 / 7–1232 | 147 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 16 |
| In the duel, the Dragon checkmates (or captures) the last King | 60 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 4 |
| A draw while both Kings are on the board (between the Kinged players) | 7 |
| A draw in the duel (the last Kinged player and the Dragon) | 60 |

Wins by seat: dark 10 (checkmate 8, dragon-captured 2); light 10 (checkmate 8, dragon-captured 2); dragon 60 (checkmate 60). Draws by who shares them: dark+dragon 40, dark+light 7, light+dragon 20. By reason: checkmate 76, dragon-captured 4, fifty-move 65, stalemate 2. Games in which it happened: dragon-out 4, king-captured:dark 54, king-captured:light 70, tail-stone:dark 2, tail-stone:light 2. 6427.8 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
