# Balance report: easy-3p 0.2.0

Verdict: **incomplete** (2026-10-29).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 72.0% (67.4–76.2%) | 28.0% (23.8–32.6%) | 0.0% (0.0–1.0%) | 0 | 0 | 11 / 7 / 2–70 | 397 | dark score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 6 |
| First checkmate: a Kinged player checkmates the Tail | 394 |

Wins by seat: dark 288 (checkmate 288); light 112 (checkmate 112); dragon 0 (none). Draws by who shares them: none. By reason: checkmate 400. Games in which it happened: none. 0.4 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
