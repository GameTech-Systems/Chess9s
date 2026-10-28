# Balance report: standard-3p 0.1.0

Verdict: **incomplete** (2026-10-28).

Measured as decision 0015 (version 1, provisional) sets out (ledger D60): each seat's score, a win counting 1 and a draw split among the seats that share it, must be 28–38% over at least 2,000 games at each of depths 1 and 2. Games stopped at the cap (2,000 plies) are reported, not scored; more than 5% of them flags the run for the owner. The paranoid search (S62) plays every seat, so the seats are measured with equal play. Each game opens with 6 random plies; at most 100,000 positions per move. Runs with fewer games are screening only: a sweep combination is flagged when a seat's whole 95% interval misses the band. Every 3-player ruleset stays experimental whatever these numbers show.

## Runs

Seat scores, with the 95% interval in brackets.

| Combination | Depth | Games | dark | light | dragon | Draws | Capped | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| king.range=2 | 1 | 40 | 41.3% (27.4–56.6%) | 45.0% (30.7–60.2%) | 13.8% (6.2–27.6%) | 18 | 0 | 349 / 371.5 / 14–778 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| king.range=3 | 1 | 40 | 57.5% (42.2–71.5%) | 31.3% (19.1–46.7%) | 11.3% (4.7–24.6%) | 18 | 0 | 352 / 334 / 49–659 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| king.range=4 | 1 | 40 | 50.0% (35.2–64.8%) | 45.0% (30.7–60.2%) | 5.0% (1.4–16.5%) | 27 | 0 | 372 / 388 / 86–714 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| king.canJump=true | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| king.canEnterCoast=false | 1 | 40 | 30.0% (18.1–45.4%) | 51.2% (36.3–65.9%) | 18.8% (9.6–33.4%) | 13 | 0 | 261 / 215 / 48–636 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| castling.enabled=true | 1 | 40 | 25.0% (14.2–40.2%) | 53.8% (38.7–68.2%) | 21.3% (11.4–36.1%) | 10 | 0 | 244 / 192.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| queen.canCrossVoid=true | 1 | 40 | 25.0% (14.2–40.2%) | 48.8% (34.1–63.7%) | 26.3% (15.1–41.5%) | 9 | 0 | 210 / 185.5 / 46–538 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| queen.canStandOnVoid=true | 1 | 40 | 21.3% (11.4–36.1%) | 51.2% (36.3–65.9%) | 27.5% (16.1–42.8%) | 10 | 0 | 225 / 189.5 / 48–594 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| queen.voidCrossings=e5-only | 1 | 40 | 22.5% (12.3–37.5%) | 35.0% (22.1–50.5%) | 42.5% (28.5–57.8%) | 11 | 0 | 250 / 210.5 / 20–640 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| queen.voidCrossings=none | 1 | 40 | 20.0% (10.5–34.8%) | 51.2% (36.3–65.9%) | 28.7% (17.1–44.1%) | 17 | 0 | 263 / 262 / 20–567 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| queen.canEnterCoast=false | 1 | 40 | 18.8% (9.6–33.4%) | 55.0% (39.8–69.3%) | 26.3% (15.1–41.5%) | 16 | 0 | 290 / 254 / 86–633 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.initialDoubleStep=false | 1 | 40 | 28.7% (17.1–44.1%) | 33.8% (21.1–49.2%) | 37.5% (24.2–53.0%) | 9 | 0 | 254 / 205 / 37–721 | 40 | too few games |
| pawn.promotion.targets-queen | 1 | 40 | 27.5% (16.1–42.8%) | 50.0% (35.2–64.8%) | 22.5% (12.3–37.5%) | 13 | 0 | 275 / 225.5 / 48–579 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.promotion.targets-rook | 1 | 40 | 23.8% (13.2–38.9%) | 53.8% (38.7–68.2%) | 22.5% (12.3–37.5%) | 12 | 0 | 264 / 225.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.promotion.targets-bishop | 1 | 40 | 23.8% (13.2–38.9%) | 53.8% (38.7–68.2%) | 22.5% (12.3–37.5%) | 12 | 0 | 264 / 225.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.promotion.targets-knight | 1 | 40 | 23.8% (13.2–38.9%) | 53.8% (38.7–68.2%) | 22.5% (12.3–37.5%) | 12 | 0 | 264 / 225.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.promotion.targets+captured-piece | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.safeZones=any-colored-square | 1 | 40 | 22.5% (12.3–37.5%) | 56.3% (41.0–70.4%) | 21.3% (11.4–36.1%) | 8 | 0 | 254 / 171 / 48–667 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.safeZones=off | 1 | 40 | 33.8% (21.1–49.2%) | 50.0% (35.2–64.8%) | 16.3% (7.9–30.5%) | 11 | 0 | 264 / 224.5 / 48–719 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.canEnterCoast=true | 1 | 40 | 25.0% (14.2–40.2%) | 47.5% (32.9–62.5%) | 27.5% (16.1–42.8%) | 12 | 0 | 253 / 240.5 / 23–542 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| pawn.canEnterCenter=true | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.occupants=dragons-and-sun-moon | 1 | 40 | 26.3% (15.1–41.5%) | 55.0% (39.8–69.3%) | 18.8% (9.6–33.4%) | 11 | 0 | 282 / 309 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.occupants=any | 1 | 40 | 27.5% (16.1–42.8%) | 47.5% (32.9–62.5%) | 25.0% (14.2–40.2%) | 14 | 0 | 264 / 250 / 55–683 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough-dragon-head | 1 | 40 | 32.5% (20.1–48.0%) | 36.3% (23.2–51.7%) | 31.3% (19.1–46.7%) | 15 | 0 | 253 / 228.5 / 43–552 | 40 | too few games |
| center.passThrough-queen | 1 | 40 | 18.8% (9.6–33.4%) | 50.0% (35.2–64.8%) | 31.3% (19.1–46.7%) | 9 | 0 | 244 / 210.5 / 48–733 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| center.passThrough-king | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough-sun-moon-pawn | 1 | 40 | 26.3% (15.1–41.5%) | 50.0% (35.2–64.8%) | 23.8% (13.2–38.9%) | 11 | 0 | 254 / 171 / 48–720 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough-knight | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough+rook | 1 | 40 | 31.3% (19.1–46.7%) | 48.8% (34.1–63.7%) | 20.0% (10.5–34.8%) | 12 | 0 | 243 / 196 / 48–495 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| center.passThrough+bishop | 1 | 40 | 23.8% (13.2–38.9%) | 46.3% (31.8–61.3%) | 30.0% (18.1–45.4%) | 13 | 0 | 241 / 197 / 11–641 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| center.passThrough+pawn | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| coast.openToAll=true | 1 | 40 | 38.8% (25.3–54.2%) | 36.3% (23.2–51.7%) | 25.0% (14.2–40.2%) | 10 | 0 | 243 / 204 / 25–521 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| coast.returnAllowed=false | 1 | 40 | 28.7% (17.1–44.1%) | 45.0% (30.7–60.2%) | 26.3% (15.1–41.5%) | 13 | 0 | 234 / 213.5 / 44–505 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| coast.3p.capturable=true | 1 | 40 | 23.8% (13.2–38.9%) | 52.5% (37.5–67.1%) | 23.8% (13.2–38.9%) | 14 | 0 | 265 / 256.5 / 48–578 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.3p.movement=two-player-path | 1 | 40 | 71.3% (55.9–82.9%) | 16.3% (7.9–30.5%) | 12.5% (5.5–26.1%) | 8 | 0 | 251 / 215 / 40–637 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.3p.captures=none | 1 | 40 | 51.2% (36.3–65.9%) | 32.5% (20.1–48.0%) | 16.3% (7.9–30.5%) | 9 | 0 | 244 / 214.5 / 14–634 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.canCheck=true | 1 | 40 | 22.5% (12.3–37.5%) | 45.0% (30.7–60.2%) | 32.5% (20.1–48.0%) | 12 | 0 | 260 / 225.5 / 46–552 | 40 | dark score outside 28–38%, light score outside 28–38%, too few games |
| tail.capturable=true | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=1 | 1 | 40 | 41.3% (27.4–56.6%) | 55.0% (39.8–69.3%) | 3.8% (0.9–14.7%) | 11 | 0 | 252 / 269 / 44–642 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=2 | 1 | 40 | 41.3% (27.4–56.6%) | 38.8% (25.3–54.2%) | 20.0% (10.5–34.8%) | 6 | 0 | 262 / 215.5 / 13–620 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=3 | 1 | 40 | 37.5% (24.2–53.0%) | 45.0% (30.7–60.2%) | 17.5% (8.7–32.0%) | 11 | 0 | 251 / 229.5 / 13–603 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=4 | 1 | 40 | 28.7% (17.1–44.1%) | 46.3% (31.8–61.3%) | 25.0% (14.2–40.2%) | 11 | 0 | 283 / 272.5 / 14–743 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=5 | 1 | 40 | 36.3% (23.2–51.7%) | 36.3% (23.2–51.7%) | 27.5% (16.1–42.8%) | 7 | 0 | 224 / 158.5 / 53–738 | 40 | dragon score outside 28–38%, too few games |
| dragonHead.range=6 | 1 | 40 | 22.5% (12.3–37.5%) | 30.0% (18.1–45.4%) | 47.5% (32.9–62.5%) | 9 | 0 | 242 / 203.5 / 36–595 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| dragonHead.range=7 | 1 | 40 | 37.5% (24.2–53.0%) | 37.5% (24.2–53.0%) | 25.0% (14.2–40.2%) | 17 | 0 | 281 / 251.5 / 66–747 | 40 | dragon score outside 28–38%, too few games |
| dragon.canJump=true | 1 | 40 | 3.8% (0.9–14.7%) | 1.3% (0.1–10.9%) | 95.0% (83.5–98.6%) | 3 | 0 | 41 / 19 / 6–230 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragon.3p.givesCheck=true | 1 | 40 | 22.5% (12.3–37.5%) | 38.8% (25.3–54.2%) | 38.8% (25.3–54.2%) | 8 | 0 | 229 / 207 / 21–618 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| sunMoon.3p.range=1 | 1 | 40 | 35.0% (22.1–50.5%) | 40.0% (26.3–55.4%) | 25.0% (14.2–40.2%) | 13 | 0 | 249 / 210 / 37–589 | 40 | light score outside 28–38%, dragon score outside 28–38%, too few games |
| sunMoon.capture=diagonal-only | 1 | 40 | 27.5% (16.1–42.8%) | 47.5% (32.9–62.5%) | 25.0% (14.2–40.2%) | 6 | 0 | 222 / 197.5 / 29–553 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| sunMoon.capture=none | 1 | 40 | 52.5% (37.5–67.1%) | 32.5% (20.1–48.0%) | 15.0% (7.1–29.1%) | 13 | 0 | 302 / 264 / 29–741 | 40 | dark score outside 28–38%, dragon score outside 28–38%, too few games |
| sunMoon.canPromote=true | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 257 / 211.5 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| endings.3p=first-checkmate | 1 | 40 | 18.3% (9.3–32.9%) | 20.8% (11.1–35.7%) | 60.8% (45.4–74.4%) | 4 | 0 | 126 / 50 / 10–666 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| dragon.3p.lastKing=capture | 1 | 40 | 26.3% (15.1–41.5%) | 53.8% (38.7–68.2%) | 20.0% (10.5–34.8%) | 12 | 0 | 258 / 211.5 / 38–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| tail.3p.mateTiming=dragon-turn | 1 | 40 | 23.8% (13.2–38.9%) | 52.5% (37.5–67.1%) | 23.8% (13.2–38.9%) | 12 | 0 | 258 / 192.5 / 47–652 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| draw.3p.threefoldRepetition=false | 1 | 40 | 26.3% (15.1–41.5%) | 52.5% (37.5–67.1%) | 21.3% (11.4–36.1%) | 11 | 0 | 261 / 242 / 48–552 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| draw.3p.fiftyMove=false | 1 | 40 | 25.0% (14.2–40.2%) | 53.8% (38.7–68.2%) | 21.3% (11.4–36.1%) | 6 | 0 | 303 / 211.5 / 48–1255 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |
| check.3p.exposedKing=counts-as-checkmate | 1 | 40 | 22.5% (12.3–37.5%) | 51.2% (36.3–65.9%) | 26.3% (15.1–41.5%) | 13 | 0 | 256 / 193 / 47–652 | 40 | dark score outside 28–38%, light score outside 28–38%, dragon score outside 28–38%, too few games |

## How the games ended

### Depth 1

| Ending (decision 0016) | Games |
| --- | --- |
| A Kinged player checkmates the other King | 13 |
| In the duel, the Dragon checkmates (or captures) the last King | 5 |
| In the duel, the last Kinged player checkmates the Tail | 4 |
| In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon | 6 |
| A draw while both Kings are on the board (between the Kinged players) | 6 |
| A draw in the duel (the last Kinged player and the Dragon) | 6 |

Wins by seat: dark 7 (checkmate 6, dragon-captured 1); light 16 (checkmate 11, dragon-captured 5); dragon 5 (checkmate 3, king-capture 2). Draws by who shares them: dark+dragon 1, dark+light 6, light+dragon 5. By reason: checkmate 20, dragon-captured 6, fifty-move 7, insufficient-material 1, king-capture 2, repetition 4. Games in which it happened: dragon-out 17, king-captured:dark 17, king-captured:light 4, tail-stone:dark 14, tail-stone:light 5. 38.9 s per game.

## Flagged combinations

- king.range=2 at depth 1: dragon interval 6.2–27.6% outside 28–38%
- king.range=3 at depth 1: dark interval 42.2–71.5% outside 28–38%, dragon interval 4.7–24.6% outside 28–38%
- king.range=4 at depth 1: dragon interval 1.4–16.5% outside 28–38%
- king.canJump=true at depth 1: light interval 38.7–68.2% outside 28–38%
- castling.enabled=true at depth 1: light interval 38.7–68.2% outside 28–38%
- queen.canEnterCoast=false at depth 1: light interval 39.8–69.3% outside 28–38%
- pawn.promotion.targets-rook at depth 1: light interval 38.7–68.2% outside 28–38%
- pawn.promotion.targets-bishop at depth 1: light interval 38.7–68.2% outside 28–38%
- pawn.promotion.targets-knight at depth 1: light interval 38.7–68.2% outside 28–38%
- pawn.promotion.targets+captured-piece at depth 1: light interval 38.7–68.2% outside 28–38%
- pawn.safeZones=any-colored-square at depth 1: light interval 41.0–70.4% outside 28–38%
- pawn.canEnterCenter=true at depth 1: light interval 38.7–68.2% outside 28–38%
- center.occupants=dragons-and-sun-moon at depth 1: light interval 39.8–69.3% outside 28–38%
- center.passThrough-king at depth 1: light interval 38.7–68.2% outside 28–38%
- center.passThrough-knight at depth 1: light interval 38.7–68.2% outside 28–38%
- center.passThrough+pawn at depth 1: light interval 38.7–68.2% outside 28–38%
- tail.3p.movement=two-player-path at depth 1: dark interval 55.9–82.9% outside 28–38%, dragon interval 5.5–26.1% outside 28–38%
- tail.capturable=true at depth 1: light interval 38.7–68.2% outside 28–38%
- dragonHead.range=1 at depth 1: light interval 39.8–69.3% outside 28–38%, dragon interval 0.9–14.7% outside 28–38%
- dragon.canJump=true at depth 1: dark interval 0.9–14.7% outside 28–38%, light interval 0.1–10.9% outside 28–38%, dragon interval 83.5–98.6% outside 28–38%
- sunMoon.canPromote=true at depth 1: light interval 38.7–68.2% outside 28–38%
- endings.3p=first-checkmate at depth 1: dragon interval 45.4–74.4% outside 28–38%
- dragon.3p.lastKing=capture at depth 1: light interval 38.7–68.2% outside 28–38%
- draw.3p.fiftyMove=false at depth 1: light interval 38.7–68.2% outside 28–38%

## Skipped combinations

- queen.pawnSwap=true: not built yet: queen.pawnSwap
- coast.3p.exit=a5-always: not built yet: coast.3p.exit
- setup.swapKingQueen=true: not built yet: setup.swapKingQueen
