# Balance report: easy-3p 0.1.0

Verdict: **incomplete** (2026-10-28).

Measured as decision 0015 (version 1, provisional) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 70.8% (66.1–75.0%) | 27.5% (23.4–32.1%) | 1.7% (0.9–3.6%) | 3 | 0 | 11 / 8 / 2–86 | 397 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 5 |
| First checkmate: the Dragon checkmates a King | 6 |
| First checkmate: a Kinged player checkmates the Tail | 386 |
| A draw shared by all three | 3 |

Wins by seat: dark 282 (checkmate 282); light 109 (checkmate 109); dragon 6 (checkmate 6). Draws by who shares them: dark+light+dragon 3. By reason: checkmate 397, stalemate 3. Games in which it happened: none. 2.2 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
