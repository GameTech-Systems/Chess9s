# Balance report: heavy-limited-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-02).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 150 | 28.7% (22.0–36.4%) | 28.7% (22.0–36.4%) | 42.7% (35.0–50.7%) | 43 | 0 | 387 / 334.5 / 7–986 | 150 | dragon score outside 28–38%, too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 45 |
| In the duel, the Dragon checkmates (or captures) the last King | 47 |
| In the duel, the last Kinged player checkmates the Tail | 7 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 8 |
| A draw while both Kings are on the board (between the Kinged players) | 9 |
| A draw in the duel (the last Kinged player and the Dragon) | 34 |

Wins by seat: dark 31 (checkmate 27, dragon-captured 4); light 29 (checkmate 25, dragon-captured 4); dragon 47 (checkmate 26, king-capture 21). Draws by who shares them: dark+dragon 15, dark+light 9, light+dragon 19. By reason: checkmate 78, dragon-captured 8, fifty-move 40, king-capture 21, repetition 2, stalemate 1. Games in which it happened: dragon-out 34, king-captured:dark 46, king-captured:light 50, tail-stone:dark 31, tail-stone:light 46. 4649.0 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
