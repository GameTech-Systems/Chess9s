# Fairness report: draft-2p 0.2.0

Verdict: **incomplete** (2026-10-20).

Measured as decision 0008 sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 750 | 49.6% | 46.0–53.2% | 39.7% | 223 | 229 | 121 / 111 / 6–440 | 750 | too few games |
| default | 2 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | score outside 47–53%, too few games |

## How the games ended

- Depth 1: checkmate 452, fifty-move 12, insufficient-material 2, repetition 284. Wins by color: dark 223, light 229. Shallowest search finished: depth 1; 3.7 s per game.
- Depth 2: no games. Wins by color: none. Shallowest search finished: depth 0; 0.0 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
