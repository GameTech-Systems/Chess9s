# Search benchmark: draft-2p 0.2.0, depth 2

2026-10-20. Each position is searched once to depth 2 with at most 100,000 positions per move (decision 0008). "Capped" means the budget ran out before the search finished depth 2. Times are from the machine that ran it.

| Search | Moves | Positions per move: mean | median | 95th percentile | max | Capped | ms per move |
| --- | --- | --- | --- | --- | --- | --- | --- |
| current | 137 | 640 | 506 | 1,506 | 2,456 | 0 (0.0%) | 223 |
| S23 (reference) | 137 | 716 | 556 | 1,802 | 2,541 | 0 (0.0%) | 244 |

Same move, score and depth as the S23 search (tie-breaks 0, 0.5 and 0.999) on 137 of the 137 positions where the S23 search finished.

## Positions

| Position | Legal moves | Current | S23 |
| --- | --- | --- | --- |
| seed 1 ply 8 | 49 | 587 | 913 |
| seed 1 ply 32 | 49 | 1,221 | 1,256 |
| seed 1 ply 56 | 57 | 420 | 424 |
| seed 1 ply 80 | 58 | 1,501 | 1,802 |
| seed 1 ply 104 | 57 | 1,116 | 1,390 |
| seed 1 ply 128 | 57 | 829 | 879 |
| seed 1 ply 152 | 67 | 427 | 427 |
| seed 1 ply 176 | 65 | 1,017 | 1,029 |
| seed 1 ply 200 | 58 | 588 | 533 |
| seed 1 ply 224 | 58 | 585 | 531 |
| seed 1 ply 248 | 56 | 797 | 868 |
| seed 1 ply 272 | 57 | 868 | 986 |
| seed 1 ply 296 | 58 | 630 | 585 |
| seed 1 ply 320 | 56 | 278 | 278 |
| seed 1 ply 344 | 55 | 196 | 196 |
| seed 1 ply 368 | 58 | 194 | 193 |
| seed 1 ply 392 | 79 | 263 | 268 |
| seed 1 ply 416 | 88 | 318 | 562 |
| seed 1 ply 440 | 85 | 274 | 457 |
| seed 2 ply 8 | 39 | 666 | 680 |
| seed 2 ply 32 | 57 | 1,506 | 2,194 |
| seed 2 ply 56 | 62 | 1,944 | 2,063 |
| seed 2 ply 80 | 58 | 1,237 | 1,237 |
| seed 2 ply 104 | 48 | 1,460 | 1,464 |
| seed 2 ply 128 | 33 | 322 | 322 |
| seed 2 ply 152 | 36 | 706 | 706 |
| seed 2 ply 176 | 41 | 657 | 652 |
| seed 2 ply 200 | 23 | 700 | 716 |
| seed 3 ply 8 | 43 | 403 | 405 |
| seed 3 ply 32 | 50 | 714 | 714 |
| seed 3 ply 56 | 66 | 884 | 894 |
| seed 3 ply 80 | 60 | 885 | 899 |
| seed 3 ply 104 | 53 | 1,350 | 1,677 |
| seed 3 ply 128 | 60 | 594 | 594 |
| seed 3 ply 152 | 63 | 635 | 635 |
| seed 3 ply 176 | 65 | 526 | 652 |
| seed 3 ply 200 | 11 | 261 | 261 |
| seed 4 ply 8 | 42 | 522 | 538 |
| seed 4 ply 32 | 66 | 1,178 | 1,178 |
| seed 4 ply 56 | 69 | 990 | 990 |
| seed 4 ply 80 | 65 | 1,030 | 1,031 |
| seed 4 ply 104 | 63 | 1,140 | 1,146 |
| seed 4 ply 128 | 73 | 917 | 917 |
| seed 4 ply 152 | 68 | 884 | 888 |
| seed 4 ply 176 | 57 | 1,462 | 1,462 |
| seed 4 ply 200 | 58 | 997 | 1,707 |
| seed 4 ply 224 | 35 | 409 | 409 |
| seed 4 ply 248 | 42 | 487 | 487 |
| seed 4 ply 272 | 40 | 317 | 317 |
| seed 4 ply 296 | 53 | 533 | 730 |
| seed 4 ply 320 | 8 | 279 | 301 |
| seed 4 ply 344 | 50 | 612 | 833 |
| seed 4 ply 368 | 40 | 640 | 864 |
| seed 4 ply 392 | 43 | 425 | 760 |
| seed 4 ply 416 | 46 | 459 | 924 |
| seed 4 ply 440 | 54 | 321 | 400 |
| seed 4 ply 464 | 48 | 370 | 371 |
| seed 4 ply 488 | 20 | 432 | 477 |
| seed 4 ply 512 | 20 | 346 | 686 |
| seed 4 ply 536 | 8 | 500 | 499 |
| seed 4 ply 560 | 7 | 438 | 437 |
| seed 4 ply 584 | 4 | 314 | 314 |
| seed 5 ply 8 | 38 | 352 | 593 |
| seed 5 ply 32 | 46 | 1,086 | 1,662 |
| seed 5 ply 56 | 65 | 708 | 708 |
| seed 5 ply 80 | 57 | 1,737 | 2,072 |
| seed 5 ply 104 | 61 | 924 | 927 |
| seed 5 ply 128 | 64 | 1,354 | 1,354 |
| seed 5 ply 152 | 39 | 539 | 609 |
| seed 5 ply 176 | 40 | 719 | 726 |
| seed 5 ply 200 | 29 | 598 | 759 |
| seed 5 ply 224 | 14 | 340 | 339 |
| seed 5 ply 248 | 9 | 353 | 381 |
| seed 5 ply 272 | 9 | 182 | 203 |
| seed 5 ply 296 | 11 | 278 | 295 |
| seed 5 ply 320 | 7 | 63 | 63 |
| seed 5 ply 344 | 13 | 281 | 308 |
| seed 5 ply 368 | 11 | 267 | 267 |
| seed 5 ply 392 | 14 | 455 | 533 |
| seed 5 ply 416 | 7 | 144 | 145 |
| seed 5 ply 440 | 12 | 544 | 544 |
| seed 5 ply 464 | 10 | 221 | 229 |
| seed 6 ply 8 | 45 | 918 | 933 |
| seed 6 ply 32 | 49 | 949 | 959 |
| seed 6 ply 56 | 62 | 1,604 | 1,626 |
| seed 6 ply 80 | 62 | 1,988 | 1,943 |
| seed 6 ply 104 | 70 | 788 | 788 |
| seed 6 ply 128 | 59 | 528 | 538 |
| seed 6 ply 152 | 71 | 1,425 | 1,916 |
| seed 6 ply 176 | 40 | 712 | 828 |
| seed 6 ply 200 | 40 | 506 | 511 |
| seed 6 ply 224 | 46 | 333 | 337 |
| seed 6 ply 248 | 44 | 463 | 486 |
| seed 6 ply 272 | 37 | 240 | 523 |
| seed 6 ply 296 | 36 | 299 | 305 |
| seed 6 ply 320 | 27 | 152 | 207 |
| seed 6 ply 344 | 27 | 173 | 227 |
| seed 6 ply 368 | 29 | 340 | 420 |
| seed 6 ply 392 | 26 | 322 | 315 |
| seed 6 ply 416 | 33 | 293 | 314 |
| seed 6 ply 440 | 40 | 128 | 128 |
| seed 6 ply 464 | 68 | 251 | 314 |
| seed 6 ply 488 | 74 | 238 | 235 |
| seed 6 ply 512 | 74 | 239 | 238 |
| seed 6 ply 536 | 76 | 329 | 334 |
| seed 7 ply 8 | 42 | 815 | 960 |
| seed 7 ply 32 | 41 | 496 | 496 |
| seed 7 ply 56 | 10 | 170 | 170 |
| seed 7 ply 80 | 2 | 117 | 117 |
| seed 7 ply 104 | 65 | 462 | 562 |
| seed 7 ply 128 | 73 | 954 | 962 |
| seed 7 ply 152 | 75 | 317 | 433 |
| seed 7 ply 176 | 83 | 262 | 267 |
| seed 8 ply 8 | 39 | 515 | 556 |
| seed 8 ply 32 | 60 | 1,367 | 1,434 |
| seed 8 ply 56 | 60 | 2,456 | 2,541 |
| seed 8 ply 80 | 69 | 1,634 | 1,593 |
| seed 8 ply 104 | 64 | 1,087 | 1,099 |
| seed 8 ply 128 | 63 | 904 | 1,450 |
| seed 8 ply 152 | 58 | 1,215 | 1,687 |
| seed 8 ply 176 | 61 | 663 | 669 |
| seed 8 ply 200 | 62 | 1,188 | 1,268 |
| seed 8 ply 224 | 55 | 307 | 332 |
| seed 8 ply 248 | 59 | 511 | 511 |
| seed 8 ply 272 | 56 | 419 | 539 |
| seed 8 ply 296 | 51 | 271 | 270 |
| seed 8 ply 320 | 61 | 659 | 853 |
| seed 8 ply 344 | 63 | 470 | 669 |
| seed 8 ply 368 | 57 | 321 | 325 |
| seed 8 ply 392 | 57 | 244 | 244 |
| seed 8 ply 416 | 57 | 270 | 284 |
| seed 8 ply 440 | 59 | 269 | 295 |
| seed 8 ply 464 | 53 | 181 | 193 |
| seed 8 ply 488 | 80 | 286 | 286 |
| seed 8 ply 512 | 79 | 273 | 273 |
| seed 8 ply 536 | 79 | 327 | 326 |
| seed 8 ply 560 | 82 | 282 | 284 |
