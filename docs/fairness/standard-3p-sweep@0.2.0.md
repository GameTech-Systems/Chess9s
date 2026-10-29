# Balance report: standard-3p 0.2.0

Verdict: **incomplete** (2026-10-29).

Measured as decision 0015 (version 1) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| king.range=2 | 1 | 40 | 47.5% (32.9–62.5%) | 45.0% (30.7–60.2%) | 7.5% (2.6–19.9%) | 12 | 0 | 307 / 304 / 49–594 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| king.range=3 | 1 | 40 | 56.3% (41.0–70.4%) | 37.5% (24.2–53.0%) | 6.3% (2.0–18.2%) | 27 | 0 | 382 / 390 / 13–702 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| king.range=4 | 1 | 40 | 55.0% (39.8–69.3%) | 38.8% (25.3–54.2%) | 6.3% (2.0–18.2%) | 28 | 0 | 396 / 409.5 / 52–821 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| king.canJump=true | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| king.canEnterCoast=false | 1 | 40 | 38.8% (25.3–54.2%) | 38.8% (25.3–54.2%) | 22.5% (12.3–37.5%) | 7 | 0 | 265 / 265.5 / 28–548 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| castling.enabled=true | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 280 / 256.5 / 73–598 | 40 | dragon score outside 28–38%, too few games |
| queen.canCrossVoid=true | 1 | 40 | 35.0% (22.1–50.5%) | 26.3% (15.1–41.5%) | 38.8% (25.3–54.2%) | 5 | 0 | 236 / 187 / 25–678 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| queen.canStandOnVoid=true | 1 | 40 | 41.3% (27.4–56.6%) | 25.0% (14.2–40.2%) | 33.8% (21.1–49.2%) | 5 | 0 | 204 / 167 / 74–472 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| queen.voidCrossings=e5-only | 1 | 40 | 36.3% (23.2–51.7%) | 31.3% (19.1–46.7%) | 32.5% (20.1–48.0%) | 13 | 0 | 310 / 311.5 / 28–826 | 40 | too few games |
| queen.voidCrossings=none | 1 | 40 | 35.0% (22.1–50.5%) | 50.0% (35.2–64.8%) | 15.0% (7.1–29.1%) | 11 | 0 | 299 / 281 / 28–664 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| queen.canEnterCoast=false | 1 | 40 | 33.8% (21.1–49.2%) | 31.3% (19.1–46.7%) | 35.0% (22.1–50.5%) | 12 | 0 | 266 / 193.5 / 16–730 | 40 | too few games |
| pawn.initialDoubleStep=false | 1 | 40 | 26.3% (15.1–41.5%) | 41.3% (27.4–56.6%) | 32.5% (20.1–48.0%) | 8 | 0 | 253 / 212.5 / 23–610 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| pawn.promotion.targets-queen | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 13 | 0 | 294 / 261 / 28–671 | 40 | dragon score outside 28–38%, too few games |
| pawn.promotion.targets-rook | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 273 / 236.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| pawn.promotion.targets-bishop | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 273 / 236.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| pawn.promotion.targets-knight | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 273 / 236.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| pawn.promotion.targets+captured-piece | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| pawn.safeZones=any-colored-square | 1 | 40 | 35.0% (22.1–50.5%) | 38.8% (25.3–54.2%) | 26.3% (15.1–41.5%) | 6 | 0 | 275 / 249 / 28–646 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.safeZones=off | 1 | 40 | 32.5% (20.1–48.0%) | 37.5% (24.2–53.0%) | 30.0% (18.1–45.4%) | 9 | 0 | 262 / 243 / 28–610 | 40 | too few games |
| pawn.canEnterCoast=true | 1 | 40 | 27.5% (16.1–42.8%) | 41.3% (27.4–56.6%) | 31.3% (19.1–46.7%) | 6 | 0 | 243 / 235.5 / 28–582 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| pawn.canEnterCenter=true | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| center.occupants=dragons-and-sun-moon | 1 | 40 | 37.5% (24.2–53.0%) | 35.0% (22.1–50.5%) | 27.5% (16.1–42.8%) | 12 | 0 | 270 / 224.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| center.occupants=any | 1 | 40 | 43.8% (29.6–59.0%) | 32.5% (20.1–48.0%) | 23.8% (13.2–38.9%) | 9 | 0 | 243 / 220 / 79–499 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough-dragon-head | 1 | 40 | 32.5% (20.1–48.0%) | 38.8% (25.3–54.2%) | 28.7% (17.1–44.1%) | 9 | 0 | 288 / 197.5 / 28–758 | 40 | light score outside 28–38%, too few games |
| center.passThrough-queen | 1 | 40 | 41.3% (27.4–56.6%) | 35.0% (22.1–50.5%) | 23.8% (13.2–38.9%) | 7 | 0 | 294 / 246 / 28–733 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough-king | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| center.passThrough-sun-moon-pawn | 1 | 40 | 37.5% (24.2–53.0%) | 36.3% (23.2–51.7%) | 26.3% (15.1–41.5%) | 10 | 0 | 278 / 243.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| center.passThrough-knight | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| center.passThrough+rook | 1 | 40 | 41.3% (27.4–56.6%) | 36.3% (23.2–51.7%) | 22.5% (12.3–37.5%) | 7 | 0 | 273 / 226.5 / 28–592 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough+bishop | 1 | 40 | 31.3% (19.1–46.7%) | 42.5% (28.5–57.8%) | 26.3% (15.1–41.5%) | 14 | 0 | 299 / 303.5 / 28–564 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough+pawn | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| coast.3p.exit=a5-always | 1 | 40 | 46.3% (31.8–61.3%) | 33.8% (21.1–49.2%) | 20.0% (10.5–34.8%) | 11 | 0 | 297 / 291.5 / 28–670 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| coast.3p.exit=any-legal-move | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| coast.openToAll=true | 1 | 40 | 35.0% (22.1–50.5%) | 37.5% (24.2–53.0%) | 27.5% (16.1–42.8%) | 10 | 0 | 247 / 197.5 / 28–664 | 40 | dragon score outside 28–38%, too few games |
| coast.returnAllowed=false | 1 | 40 | 43.8% (29.6–59.0%) | 42.5% (28.5–57.8%) | 13.8% (6.2–27.6%) | 15 | 0 | 305 / 270 / 28–622 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| coast.3p.capturable=true | 1 | 40 | 41.3% (27.4–56.6%) | 36.3% (23.2–51.7%) | 22.5% (12.3–37.5%) | 10 | 0 | 275 / 225 / 28–561 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.3p.movement=two-player-path | 1 | 40 | 70.0% (54.6–81.9%) | 22.5% (12.3–37.5%) | 7.5% (2.6–19.9%) | 12 | 0 | 291 / 272 / 40–727 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.3p.captures=none | 1 | 40 | 71.3% (55.9–82.9%) | 17.5% (8.7–32.0%) | 11.3% (4.7–24.6%) | 11 | 0 | 214 / 205.5 / 40–503 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.canCheck=true | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 268 / 212.5 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| tail.capturable=true | 1 | 40 | 35.0% (22.1–50.5%) | 37.5% (24.2–53.0%) | 27.5% (16.1–42.8%) | 10 | 0 | 249 / 194 / 28–564 | 40 | dragon score outside 28–38%, too few games |
| dragonHead.range=1 | 1 | 40 | 68.8% (53.3–80.9%) | 25.0% (14.2–40.2%) | 6.3% (2.0–18.2%) | 9 | 0 | 315 / 312.5 / 31–913 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=2 | 1 | 40 | 45.0% (30.7–60.2%) | 41.3% (27.4–56.6%) | 13.8% (6.2–27.6%) | 13 | 0 | 284 / 259 / 73–518 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=3 | 1 | 40 | 51.2% (36.3–65.9%) | 33.8% (21.1–49.2%) | 15.0% (7.1–29.1%) | 9 | 0 | 276 / 240.5 / 23–832 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=4 | 1 | 40 | 38.8% (25.3–54.2%) | 48.8% (34.1–63.7%) | 12.5% (5.5–26.1%) | 14 | 0 | 342 / 323.5 / 113–832 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=5 | 1 | 40 | 30.0% (18.1–45.4%) | 42.5% (28.5–57.8%) | 27.5% (16.1–42.8%) | 5 | 0 | 235 / 208.5 / 28–832 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=6 | 1 | 40 | 33.8% (21.1–49.2%) | 41.3% (27.4–56.6%) | 25.0% (14.2–40.2%) | 9 | 0 | 298 / 261 / 28–784 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=7 | 1 | 40 | 35.0% (22.1–50.5%) | 40.0% (26.3–55.4%) | 25.0% (14.2–40.2%) | 10 | 0 | 267 / 245 / 28–712 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragon.canJump=true | 1 | 40 | 8.8% (3.3–21.5%) | 12.5% (5.5–26.1%) | 78.8% (63.9–88.6%) | 8 | 0 | 89 / 55 / 13–375 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragon.3p.givesCheck=true | 1 | 40 | 37.5% (24.2–53.0%) | 26.3% (15.1–41.5%) | 36.3% (23.2–51.7%) | 14 | 0 | 274 / 274 / 28–767 | 40 | light score outside 28–38%, too few games |
| sunMoon.3p.range=1 | 1 | 40 | 50.0% (35.2–64.8%) | 35.0% (22.1–50.5%) | 15.0% (7.1–29.1%) | 8 | 0 | 290 / 270.5 / 28–598 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| sunMoon.capture=diagonal-only | 1 | 40 | 41.3% (27.4–56.6%) | 27.5% (16.1–42.8%) | 31.3% (19.1–46.7%) | 16 | 0 | 274 / 277 / 28–628 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| sunMoon.capture=none | 1 | 40 | 55.0% (39.8–69.3%) | 26.3% (15.1–41.5%) | 18.8% (9.6–33.4%) | 8 | 0 | 277 / 270 / 28–571 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| endings.3p=first-checkmate | 1 | 40 | 38.3% (24.9–53.8%) | 15.8% (7.6–30.0%) | 45.8% (31.4–61.0%) | 1 | 0 | 97 / 67 / 10–492 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragon.3p.lastKing=capture | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 11 | 0 | 270 / 226 / 28–598 | 40 | dragon score outside 28–38%, too few games |
| tail.3p.mateTiming=dragon-turn | 1 | 40 | 28.7% (17.1–44.1%) | 41.3% (27.4–56.6%) | 30.0% (18.1–45.4%) | 13 | 0 | 269 / 212.5 / 28–598 | 40 | light score outside 28–38%, too few games |
| draw.3p.threefoldRepetition=false | 1 | 40 | 33.8% (21.1–49.2%) | 36.3% (23.2–51.7%) | 30.0% (18.1–45.4%) | 9 | 0 | 271 / 214.5 / 28–598 | 40 | too few games |
| draw.3p.fiftyMove=false | 1 | 40 | 32.1% (19.6–47.7%) | 39.7% (26.0–55.3%) | 28.2% (16.5–43.8%) | 5 | 1 | 334 / 212.5 / 28–2000 | 40 | light score outside 28–38%, too few games |
| check.3p.exposedKing=counts-as-checkmate | 1 | 40 | 37.5% (24.2–53.0%) | 33.8% (21.1–49.2%) | 28.7% (17.1–44.1%) | 11 | 0 | 263 / 191 / 28–598 | 40 | too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 17 |
| In the duel, the Dragon checkmates (or captures) the last King | 10 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 2 |
| A draw while both Kings are on the board (between the Kinged players) | 9 |
| A draw in the duel (the last Kinged player and the Dragon) | 2 |

Wins by seat: dark 9 (checkmate 9); light 10 (checkmate 8, dragon-captured 2); dragon 10 (checkmate 9, king-capture 1). Draws by who shares them: dark+dragon 2, dark+light 9. By reason: checkmate 26, dragon-captured 2, fifty-move 7, insufficient-material 2, king-capture 1, repetition 2. Games in which it happened: dragon-out 22, king-captured:dark 5, king-captured:light 9, tail-stone:dark 18, tail-stone:light 9. 35.3 s per game.

## Flagged combinations

- king.range=2 at depth 1: dragon interval 2.6–19.9% outside 28–38%
- king.range=3 at depth 1: dark interval 41.0–70.4% outside 28–38%, dragon interval 2.0–18.2% outside 28–38%
- king.range=4 at depth 1: dark interval 39.8–69.3% outside 28–38%, dragon interval 2.0–18.2% outside 28–38%
- coast.3p.exit=any-legal-move at depth 1: light interval 38.7–68.2% outside 28–38%
- coast.returnAllowed=false at depth 1: dragon interval 6.2–27.6% outside 28–38%
- tail.3p.movement=two-player-path at depth 1: dark interval 54.6–81.9% outside 28–38%, dragon interval 2.6–19.9% outside 28–38%
- tail.3p.captures=none at depth 1: dark interval 55.9–82.9% outside 28–38%, dragon interval 4.7–24.6% outside 28–38%
- dragonHead.range=1 at depth 1: dark interval 53.3–80.9% outside 28–38%, dragon interval 2.0–18.2% outside 28–38%
- dragonHead.range=2 at depth 1: dragon interval 6.2–27.6% outside 28–38%
- dragonHead.range=4 at depth 1: dragon interval 5.5–26.1% outside 28–38%
- dragon.canJump=true at depth 1: dark interval 3.3–21.5% outside 28–38%, light interval 5.5–26.1% outside 28–38%, dragon interval 63.9–88.6% outside 28–38%
- sunMoon.capture=none at depth 1: dark interval 39.8–69.3% outside 28–38%

## Skipped combinations

- queen.pawnSwap=true: not built yet: queen.pawnSwap
- sunMoon.canPromote=true: not built yet: sunMoon.canPromote
- setup.swapKingQueen=true: not built yet: setup.swapKingQueen
