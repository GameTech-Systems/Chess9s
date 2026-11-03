# Balance report: heavy-limited3-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-02).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 149 | 35.6% (28.3–43.5%) | 41.9% (34.3–50.0%) | 22.5% (16.5–29.8%) | 46 | 0 | 415 / 383 / 7–974 | 149 | light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 59 |
| In the duel, the Dragon checkmates (or captures) the last King | 19 |
| In the duel, the last Kinged player checkmates the Tail | 9 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 16 |
| A draw while both Kings are on the board (between the Kinged players) | 17 |
| A draw in the duel (the last Kinged player and the Dragon) | 29 |

Wins by seat: dark 38 (checkmate 30, dragon-captured 8); light 46 (checkmate 38, dragon-captured 8); dragon 19 (checkmate 14, king-capture 5). Draws by who shares them: dark+dragon 13, dark+light 17, light+dragon 16. By reason: checkmate 82, dragon-captured 16, fifty-move 41, king-capture 5, repetition 1, stalemate 4. Games in which it happened: dragon-out 47, king-captured:dark 40, king-captured:light 33, tail-stone:dark 58, tail-stone:light 44. 4193.8 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
