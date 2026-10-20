# Fairness report: draft-2p 0.2.0

Verdict: **incomplete** (2026-10-20).

Measured as decision 0008 sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 2000 | 49.0% | 46.8–51.2% | 40.6% | 574 | 614 | 123 / 111 / 5–459 | 2000 | none |
| default | 2 | 29 | 56.9% | 39.1–73.0% | 37.9% | 11 | 7 | 410 / 378 / 148–1098 | 29 | score outside 47–53%, too few games |

## How the games ended

- Depth 1: checkmate 1188, fifty-move 25, insufficient-material 5, repetition 782. Wins by color: dark 574, light 614. Shallowest search finished: depth 1; 3.7 s per game.
- Depth 2: checkmate 18, fifty-move 11. Wins by color: dark 11, light 7. Shallowest search finished: depth 1; 233.8 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
