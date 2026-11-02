# Balance report: heavy-limited-3p 0.1.0

Verdict: **incomplete** (2026-11-02).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 400 | 44.5% (39.7–49.4%) | 32.5% (28.1–37.2%) | 23.0% (19.1–27.4%) | 119 | 0 | 302 / 286 / 7–837 | 400 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| default | 2 | 400 | 38.3% (33.6–43.1%) | 13.6% (10.6–17.3%) | 48.1% (43.3–53.0%) | 110 | 0 | 310 / 284 / 7–1186 | 400 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 206 |
| In the duel, the Dragon checkmates (or captures) the last King | 68 |
| In the duel, the last Kinged player checkmates the Tail | 3 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 4 |
| A draw while both Kings are on the board (between the Kinged players) | 71 |
| A draw in the duel (the last Kinged player and the Dragon) | 48 |

Wins by seat: dark 134 (checkmate 131, dragon-captured 3); light 79 (checkmate 78, dragon-captured 1); dragon 68 (checkmate 37, king-capture 31). Draws by who shares them: dark+dragon 17, dark+light 71, light+dragon 31. By reason: checkmate 246, dragon-captured 4, fifty-move 95, king-capture 31, repetition 24. Games in which it happened: dragon-out 166, king-captured:dark 79, king-captured:light 44, tail-stone:dark 167, tail-stone:light 79. 38.1 s per game.

### Depth 2

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 116 |
| In the duel, the Dragon checkmates (or captures) the last King | 151 |
| In the duel, the last Kinged player checkmates the Tail | 1 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 22 |
| A draw while both Kings are on the board (between the Kinged players) | 27 |
| A draw in the duel (the last Kinged player and the Dragon) | 83 |

Wins by seat: dark 109 (checkmate 90, dragon-captured 19); light 30 (checkmate 27, dragon-captured 3); dragon 151 (checkmate 50, king-capture 101). Draws by who shares them: dark+dragon 61, dark+light 27, light+dragon 22. By reason: checkmate 167, dragon-captured 22, fifty-move 103, king-capture 101, repetition 6, stalemate 1. Games in which it happened: dragon-out 61, king-captured:dark 56, king-captured:light 201, tail-stone:dark 93, tail-stone:light 119. 524.2 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
