# Search benchmark: draft-2p 0.2.0, depth 1

2026-10-20. Each position is searched once to depth 1 with at most 100,000 positions per move (decision 0008). "Capped" means the budget ran out before the search finished depth 1. Times are from the machine that ran it.

| Search | Moves | Positions per move: mean | median | 95th percentile | max | Capped | ms per move |
| --- | --- | --- | --- | --- | --- | --- | --- |
| current | 137 | 86 | 71 | 275 | 380 | 0 (0.0%) | 30 |
| S23 (reference) | 137 | 86 | 71 | 275 | 382 | 0 (0.0%) | 28 |

Same move, score and depth as the S23 search (tie-breaks 0, 0.5 and 0.999) on 137 of the 137 positions where the S23 search finished.

## Positions

| Position | Legal moves | Current | S23 |
| --- | --- | --- | --- |
| seed 1 ply 8 | 49 | 52 | 52 |
| seed 1 ply 32 | 49 | 97 | 97 |
| seed 1 ply 56 | 57 | 123 | 132 |
| seed 1 ply 80 | 58 | 90 | 90 |
| seed 1 ply 104 | 57 | 96 | 96 |
| seed 1 ply 128 | 57 | 59 | 59 |
| seed 1 ply 152 | 67 | 67 | 67 |
| seed 1 ply 176 | 65 | 133 | 133 |
| seed 1 ply 200 | 58 | 92 | 92 |
| seed 1 ply 224 | 58 | 89 | 89 |
| seed 1 ply 248 | 56 | 91 | 91 |
| seed 1 ply 272 | 57 | 80 | 80 |
| seed 1 ply 296 | 58 | 79 | 79 |
| seed 1 ply 320 | 56 | 58 | 58 |
| seed 1 ply 344 | 55 | 59 | 59 |
| seed 1 ply 368 | 58 | 61 | 61 |
| seed 1 ply 392 | 79 | 89 | 89 |
| seed 1 ply 416 | 88 | 89 | 89 |
| seed 1 ply 440 | 85 | 89 | 89 |
| seed 2 ply 8 | 39 | 48 | 48 |
| seed 2 ply 32 | 57 | 148 | 148 |
| seed 2 ply 56 | 62 | 93 | 93 |
| seed 2 ply 80 | 58 | 108 | 108 |
| seed 2 ply 104 | 48 | 121 | 121 |
| seed 2 ply 128 | 33 | 90 | 90 |
| seed 2 ply 152 | 36 | 86 | 86 |
| seed 2 ply 176 | 41 | 98 | 98 |
| seed 2 ply 200 | 23 | 55 | 55 |
| seed 3 ply 8 | 43 | 47 | 47 |
| seed 3 ply 32 | 50 | 52 | 52 |
| seed 3 ply 56 | 66 | 83 | 83 |
| seed 3 ply 80 | 60 | 177 | 182 |
| seed 3 ply 104 | 53 | 158 | 158 |
| seed 3 ply 128 | 60 | 275 | 275 |
| seed 3 ply 152 | 63 | 93 | 93 |
| seed 3 ply 176 | 65 | 99 | 99 |
| seed 3 ply 200 | 11 | 18 | 18 |
| seed 4 ply 8 | 42 | 61 | 61 |
| seed 4 ply 32 | 66 | 380 | 382 |
| seed 4 ply 56 | 69 | 168 | 168 |
| seed 4 ply 80 | 65 | 275 | 275 |
| seed 4 ply 104 | 63 | 365 | 365 |
| seed 4 ply 128 | 73 | 116 | 116 |
| seed 4 ply 152 | 68 | 123 | 123 |
| seed 4 ply 176 | 57 | 105 | 106 |
| seed 4 ply 200 | 58 | 104 | 104 |
| seed 4 ply 224 | 35 | 50 | 50 |
| seed 4 ply 248 | 42 | 132 | 133 |
| seed 4 ply 272 | 40 | 44 | 44 |
| seed 4 ply 296 | 53 | 65 | 65 |
| seed 4 ply 320 | 8 | 10 | 10 |
| seed 4 ply 344 | 50 | 66 | 66 |
| seed 4 ply 368 | 40 | 73 | 73 |
| seed 4 ply 392 | 43 | 61 | 61 |
| seed 4 ply 416 | 46 | 59 | 59 |
| seed 4 ply 440 | 54 | 63 | 63 |
| seed 4 ply 464 | 48 | 59 | 59 |
| seed 4 ply 488 | 20 | 25 | 25 |
| seed 4 ply 512 | 20 | 24 | 24 |
| seed 4 ply 536 | 8 | 8 | 8 |
| seed 4 ply 560 | 7 | 7 | 7 |
| seed 4 ply 584 | 4 | 4 | 4 |
| seed 5 ply 8 | 38 | 40 | 40 |
| seed 5 ply 32 | 46 | 76 | 76 |
| seed 5 ply 56 | 65 | 274 | 274 |
| seed 5 ply 80 | 57 | 250 | 250 |
| seed 5 ply 104 | 61 | 111 | 111 |
| seed 5 ply 128 | 64 | 220 | 221 |
| seed 5 ply 152 | 39 | 83 | 83 |
| seed 5 ply 176 | 40 | 50 | 50 |
| seed 5 ply 200 | 29 | 37 | 37 |
| seed 5 ply 224 | 14 | 16 | 16 |
| seed 5 ply 248 | 9 | 11 | 11 |
| seed 5 ply 272 | 9 | 11 | 11 |
| seed 5 ply 296 | 11 | 11 | 11 |
| seed 5 ply 320 | 7 | 14 | 14 |
| seed 5 ply 344 | 13 | 17 | 17 |
| seed 5 ply 368 | 11 | 16 | 16 |
| seed 5 ply 392 | 14 | 14 | 14 |
| seed 5 ply 416 | 7 | 7 | 7 |
| seed 5 ply 440 | 12 | 12 | 12 |
| seed 5 ply 464 | 10 | 10 | 10 |
| seed 6 ply 8 | 45 | 73 | 73 |
| seed 6 ply 32 | 49 | 53 | 53 |
| seed 6 ply 56 | 62 | 335 | 339 |
| seed 6 ply 80 | 62 | 332 | 336 |
| seed 6 ply 104 | 70 | 232 | 232 |
| seed 6 ply 128 | 59 | 62 | 62 |
| seed 6 ply 152 | 71 | 80 | 80 |
| seed 6 ply 176 | 40 | 48 | 48 |
| seed 6 ply 200 | 40 | 85 | 85 |
| seed 6 ply 224 | 46 | 121 | 123 |
| seed 6 ply 248 | 44 | 56 | 56 |
| seed 6 ply 272 | 37 | 39 | 39 |
| seed 6 ply 296 | 36 | 44 | 44 |
| seed 6 ply 320 | 27 | 31 | 31 |
| seed 6 ply 344 | 27 | 30 | 30 |
| seed 6 ply 368 | 29 | 32 | 32 |
| seed 6 ply 392 | 26 | 29 | 29 |
| seed 6 ply 416 | 33 | 39 | 45 |
| seed 6 ply 440 | 40 | 40 | 40 |
| seed 6 ply 464 | 68 | 69 | 69 |
| seed 6 ply 488 | 74 | 78 | 78 |
| seed 6 ply 512 | 74 | 74 | 74 |
| seed 6 ply 536 | 76 | 77 | 77 |
| seed 7 ply 8 | 42 | 71 | 71 |
| seed 7 ply 32 | 41 | 94 | 94 |
| seed 7 ply 56 | 10 | 10 | 10 |
| seed 7 ply 80 | 2 | 13 | 13 |
| seed 7 ply 104 | 65 | 65 | 65 |
| seed 7 ply 128 | 73 | 302 | 303 |
| seed 7 ply 152 | 75 | 78 | 78 |
| seed 7 ply 176 | 83 | 84 | 84 |
| seed 8 ply 8 | 39 | 43 | 43 |
| seed 8 ply 32 | 60 | 69 | 69 |
| seed 8 ply 56 | 60 | 69 | 69 |
| seed 8 ply 80 | 69 | 80 | 80 |
| seed 8 ply 104 | 64 | 80 | 80 |
| seed 8 ply 128 | 63 | 86 | 87 |
| seed 8 ply 152 | 58 | 85 | 86 |
| seed 8 ply 176 | 61 | 86 | 87 |
| seed 8 ply 200 | 62 | 77 | 77 |
| seed 8 ply 224 | 55 | 68 | 68 |
| seed 8 ply 248 | 59 | 172 | 172 |
| seed 8 ply 272 | 56 | 117 | 117 |
| seed 8 ply 296 | 51 | 51 | 51 |
| seed 8 ply 320 | 61 | 71 | 71 |
| seed 8 ply 344 | 63 | 65 | 65 |
| seed 8 ply 368 | 57 | 58 | 58 |
| seed 8 ply 392 | 57 | 62 | 62 |
| seed 8 ply 416 | 57 | 59 | 59 |
| seed 8 ply 440 | 59 | 63 | 63 |
| seed 8 ply 464 | 53 | 54 | 54 |
| seed 8 ply 488 | 80 | 92 | 92 |
| seed 8 ply 512 | 79 | 81 | 81 |
| seed 8 ply 536 | 79 | 82 | 82 |
| seed 8 ply 560 | 82 | 84 | 84 |
