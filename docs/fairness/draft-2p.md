# Fairness report: draft-2p 0.2.0

Verdict: **pass** (2026-10-20).

Measured as decision 0008 (version 2) sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only: a sweep combination is flagged when its whole 95% interval misses the band.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 2000 | 49.0% | 46.8–51.2% | 40.6% | 574 | 614 | 123 / 111 / 5–459 | 2000 | none |
| default | 2 | 2000 | 49.3% | 47.1–51.4% | 33.7% | 648 | 678 | 389 / 360 / 5–1247 | 2000 | none |

## How the games ended

- Depth 1: checkmate 1188, fifty-move 25, insufficient-material 5, repetition 782. Wins by color: dark 574, light 614. Shallowest search finished: depth 1 (a search stops early once it finds a forced mate); 3.7 s per game. Moves the node budget cut short: not counted.
- Depth 2: checkmate 1326, fifty-move 652, insufficient-material 6, repetition 16. Wins by color: dark 648, light 678. Shallowest search finished: depth 1 (a search stops early once it finds a forced mate); 140.1 s per game. Moves the node budget cut short: 0.

## Flagged combinations

None.

## Skipped combinations

None.
