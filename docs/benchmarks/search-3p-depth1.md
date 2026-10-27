# Search benchmark: standard-3p 0.1.0, depth 1

2026-10-27. Each position is searched once to depth 1 with at most 100,000 positions per move (decision 0008). "Capped" means the budget ran out before the search finished depth 1. Times are from the machine that ran it.

Three players: the seat to move searches paranoid, as if the other two played together against it (S62, decision D59). Depth counts plies, one per seat. There is no S23 search to compare with.

| Search | Moves | Positions per move: mean | median | 95th percentile | max | Capped | ms per move |
| --- | --- | --- | --- | --- | --- | --- | --- |
| current | 12 | 69 | 31 | 252 | 252 | 0 (0.0%) | 125 |

## Positions

| Position | Legal moves | Current | S23 |
| --- | --- | --- | --- |
| seed 1 ply 8 | 25 | 25 |  |
| seed 1 ply 32 | 33 | 34 |  |
| seed 1 ply 56 | 26 | 156 |  |
| seed 2 ply 8 | 17 | 17 |  |
| seed 2 ply 32 | 30 | 56 |  |
| seed 2 ply 56 | 28 | 31 |  |
| seed 3 ply 8 | 27 | 27 |  |
| seed 3 ply 32 | 49 | 53 |  |
| seed 3 ply 56 | 23 | 130 |  |
| seed 4 ply 8 | 25 | 25 |  |
| seed 4 ply 32 | 26 | 26 |  |
| seed 4 ply 56 | 25 | 252 |  |
