# Fairness report: easy-2p 0.1.0

Verdict: **incomplete** (2026-10-25).

Measured as decision 0008 (version 2) sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only: a sweep combination is flagged when its whole 95% interval misses the band.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 100 | 61.0% | 51.2–70.0% | 34.0% | 44 | 22 | 131 / 113 / 7–389 | 100 | score outside 47–53%, too few games |

## How the games ended

- Depth 1: checkmate 66, repetition 34. Wins by color: dark 22, light 44. Shallowest search finished: depth 1 (a search stops early once it finds a forced mate); 1.9 s per game. Moves the node budget cut short: 0.

## Flagged combinations

None.

## Skipped combinations

None.
