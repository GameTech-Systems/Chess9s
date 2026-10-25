# Fairness report: standard-2p 0.1.0

Verdict: **pass** (2026-10-25).

Measured as decision 0008 (version 2) sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only: a sweep combination is flagged when its whole 95% interval misses the band.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 2000 | 50.2% | 48.0–52.4% | 46.0% | 545 | 536 | 137 / 127 / 5–493 | 2000 | none |
| default | 2 | 2000 | 50.1% | 47.9–52.3% | 10.7% | 895 | 892 | 260 / 206 / 5–1214 | 2000 | none |

## How the games ended

- Depth 1: checkmate 1081, fifty-move 33, insufficient-material 2, repetition 884. Wins by color: dark 545, light 536. Shallowest search finished: depth 1 (a search stops early once it finds a forced mate); 2.0 s per game. Moves the node budget cut short: 0.
- Depth 2: checkmate 1787, fifty-move 184, repetition 29. Wins by color: dark 895, light 892. Shallowest search finished: depth 1 (a search stops early once it finds a forced mate); 110.2 s per game. Moves the node budget cut short: 0.

## Flagged combinations

None.

## Skipped combinations

None.
