# Balance report: light-limited-3p 0.1.0

Verdict: **incomplete** (2026-11-02).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 380 | 55.9% (50.9–60.8%) | 33.6% (29.0–38.4%) | 10.5% (7.8–14.0%) | 78 | 0 | 263 / 246 / 7–1122 | 380 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| default | 2 | 380 | 34.6% (30.0–39.5%) | 8.6% (6.1–11.8%) | 56.8% (51.8–61.7%) | 188 | 0 | 328 / 342 / 7–747 | 380 | light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 276 |
| In the duel, the Dragon checkmates (or captures) the last King | 23 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 3 |
| A draw while both Kings are on the board (between the Kinged players) | 44 |
| A draw in the duel (the last Kinged player and the Dragon) | 34 |

Wins by seat: dark 182 (checkmate 179, dragon-captured 3); light 97 (checkmate 97); dragon 23 (checkmate 23). Draws by who shares them: dark+dragon 17, dark+light 44, light+dragon 17. By reason: checkmate 299, dragon-captured 3, fifty-move 60, insufficient-material 1, repetition 17. Games in which it happened: dragon-out 272, king-captured:dark 27, king-captured:light 33, tail-stone:dark 2, tail-stone:light 270. 32.2 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 41 |
| In the duel, the Dragon checkmates (or captures) the last King | 125 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 26 |
| A draw while both Kings are on the board (between the Kinged players) | 6 |
| A draw in the duel (the last Kinged player and the Dragon) | 182 |

Wins by seat: dark 60 (checkmate 37, dragon-captured 23); light 7 (checkmate 4, dragon-captured 3); dragon 125 (checkmate 125). Draws by who shares them: dark+dragon 137, dark+light 6, light+dragon 45. By reason: checkmate 166, dragon-captured 26, fifty-move 185, repetition 2, stalemate 1. Games in which it happened: dragon-out 9, king-captured:dark 72, king-captured:light 261, tail-stone:dark 5, tail-stone:light 4. 548.9 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
