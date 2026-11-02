# Balance report: light-limited-3p 0.1.0 with turn.3p.order="dark-light-dragon"

Verdict: **incomplete** (2026-11-02).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 3 | 148 | 23.6% (17.5–31.1%) | 20.3% (14.6–27.5%) | 56.1% (48.0–63.8%) | 50 | 0 | 407 / 383.5 / 7–1035 | 148 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 3

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 19 |
| In the duel, the Dragon checkmates (or captures) the last King | 60 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 19 |
| A draw while both Kings are on the board (between the Kinged players) | 4 |
| A draw in the duel (the last Kinged player and the Dragon) | 46 |

Wins by seat: dark 22 (checkmate 10, dragon-captured 12); light 16 (checkmate 9, dragon-captured 7); dragon 60 (checkmate 60). Draws by who shares them: dark+dragon 22, dark+light 4, light+dragon 24. By reason: checkmate 79, dragon-captured 19, fifty-move 50. Games in which it happened: dragon-out 8, king-captured:dark 53, king-captured:light 72, tail-stone:dark 3, tail-stone:light 5. 5328.1 s per game.

## Flagged combinations

None.

## Skipped combinations

None.
