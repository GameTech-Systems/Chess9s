# Balance report: heavy-h3-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-07).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 2076 | 31.0% (29.1–33.0%) | 32.2% (30.2–34.2%) | 36.8% (34.8–38.9%) | 697 | 0 | 418 / 384 / 7–1180 | 2076 | none |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 668 |
| In the duel, the Dragon checkmates (or captures) the last King | 464 |
| In the duel, the last Kinged player checkmates the Tail | 105 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 142 |
| A draw while both Kings are on the board (between the Kinged players) | 97 |
| A draw in the duel (the last Kinged player and the Dragon) | 600 |

Wins by seat: dark 446 (checkmate 370, dragon-captured 76); light 469 (checkmate 403, dragon-captured 66); dragon 464 (checkmate 238, king-capture 226). Draws by who shares them: dark+dragon 299, dark+light 97, light+dragon 301. By reason: checkmate 1011, dragon-captured 142, fifty-move 677, king-capture 226, repetition 14, stalemate 6. Games in which it happened: dragon-out 411, king-captured:dark 660, king-captured:light 651, tail-stone:dark 536, tail-stone:light 463. 5527.3 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
