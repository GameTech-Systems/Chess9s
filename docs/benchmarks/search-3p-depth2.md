# Search benchmark: standard-3p 0.1.0, depth 2

2026-10-27. Each position is searched once to depth 2 with at most 100,000 positions per move (decision 0008). "Capped" means the budget ran out before the search finished depth 2. Times are from the machine that ran it.

Three players: the seat to move searches paranoid, as if the other two played together against it (S62, decision D59). Depth counts plies, one per seat. There is no S23 search to compare with.

| Search | Moves | Positions per move: mean | median | 95th percentile | max | Capped | ms per move |
| --- | --- | --- | --- | --- | --- | --- | --- |
| current | 12 | 401 | 133 | 1,126 | 1,126 | 0 (0.0%) | 952 |

## Positions

| Position | Legal moves | Current | S23 |
| --- | --- | --- | --- |
| seed 1 ply 8 | 25 | 111 |  |
| seed 1 ply 32 | 33 | 205 |  |
| seed 1 ply 56 | 26 | 515 |  |
| seed 2 ply 8 | 17 | 115 |  |
| seed 2 ply 32 | 30 | 1,126 |  |
| seed 2 ply 56 | 28 | 120 |  |
| seed 3 ply 8 | 27 | 133 |  |
| seed 3 ply 32 | 49 | 487 |  |
| seed 3 ply 56 | 23 | 646 |  |
| seed 4 ply 8 | 25 | 111 |  |
| seed 4 ply 32 | 26 | 122 |  |
| seed 4 ply 56 | 25 | 1,124 |  |
