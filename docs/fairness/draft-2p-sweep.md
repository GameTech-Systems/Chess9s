# Fairness report: draft-2p 0.2.0

Verdict: **incomplete** (2026-10-20).

Measured as decision 0008 (version 2) sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only: a sweep combination is flagged when its whole 95% interval misses the band.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| king.range=1 | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| king.range=3 | 1 | 40 | 43.8% | 29.6–59.0% | 47.5% | 8 | 13 | 119 / 99.5 / 14–368 | 40 | score outside 47–53%, too few games |
| king.range=4 | 1 | 40 | 42.5% | 28.5–57.8% | 60.0% | 5 | 11 | 136 / 119.5 / 17–318 | 40 | score outside 47–53%, too few games |
| king.canJump=true | 1 | 40 | 61.3% | 45.8–74.7% | 32.5% | 18 | 9 | 121 / 100.5 / 28–353 | 40 | score outside 47–53%, too few games |
| king.canEnterCoast=false | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–339 | 40 | score outside 47–53%, too few games |
| castling.enabled=true | 1 | 40 | 47.5% | 32.9–62.5% | 40.0% | 11 | 13 | 115 / 102 / 10–284 | 40 | too few games |
| queen.canEnterVoid=true | 1 | 40 | 43.8% | 29.6–59.0% | 52.5% | 7 | 12 | 125 / 116 / 10–248 | 40 | score outside 47–53%, too few games |
| queen.voidCrossings=e5-only | 1 | 40 | 46.3% | 31.8–61.3% | 42.5% | 10 | 13 | 119 / 105 / 10–363 | 40 | score outside 47–53%, too few games |
| queen.voidCrossings=none | 1 | 40 | 46.3% | 31.8–61.3% | 52.5% | 8 | 11 | 176 / 147.5 / 10–554 | 40 | score outside 47–53%, too few games |
| queen.canEnterCoast=false | 1 | 40 | 40.0% | 26.3–55.4% | 50.0% | 6 | 14 | 117 / 117 / 10–285 | 40 | score outside 47–53%, too few games |
| pawn.initialDoubleStep=false | 1 | 40 | 42.5% | 28.5–57.8% | 40.0% | 9 | 15 | 139 / 136 / 44–285 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-queen | 1 | 40 | 40.0% | 26.3–55.4% | 50.0% | 6 | 14 | 118 / 108 / 10–339 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-rook | 1 | 40 | 42.5% | 28.5–57.8% | 45.0% | 8 | 14 | 116 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-bishop | 1 | 40 | 42.5% | 28.5–57.8% | 45.0% | 8 | 14 | 116 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-knight | 1 | 40 | 42.5% | 28.5–57.8% | 45.0% | 8 | 14 | 116 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets+captured-piece | 1 | 40 | 42.5% | 28.5–57.8% | 45.0% | 8 | 14 | 115 / 108 / 10–304 | 40 | score outside 47–53%, too few games |
| pawn.safeZones=any-colored-square | 1 | 40 | 45.0% | 30.7–60.2% | 40.0% | 10 | 14 | 117 / 102.5 / 10–377 | 40 | score outside 47–53%, too few games |
| pawn.safeZones=off | 1 | 40 | 40.0% | 26.3–55.4% | 45.0% | 7 | 15 | 114 / 108 / 10–324 | 40 | score outside 47–53%, too few games |
| pawn.canEnterCenter=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| center.occupants=dragons-and-sun-moon | 1 | 40 | 46.3% | 31.8–61.3% | 47.5% | 9 | 12 | 120 / 115 / 10–305 | 40 | score outside 47–53%, too few games |
| center.occupants=any | 1 | 40 | 46.3% | 31.8–61.3% | 37.5% | 11 | 14 | 131 / 117 / 12–496 | 40 | score outside 47–53%, too few games |
| center.passThrough-dragon-head | 1 | 40 | 45.0% | 30.7–60.2% | 45.0% | 9 | 13 | 105 / 104 / 10–275 | 40 | score outside 47–53%, too few games |
| center.passThrough-queen | 1 | 40 | 36.3% | 23.2–51.7% | 22.5% | 10 | 21 | 127 / 115 / 10–447 | 40 | score outside 47–53%, too few games |
| center.passThrough-king | 1 | 40 | 46.3% | 31.8–61.3% | 47.5% | 9 | 12 | 130 / 118.5 / 10–305 | 40 | score outside 47–53%, too few games |
| center.passThrough-sun-moon-pawn | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| center.passThrough-knight | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| center.passThrough+rook | 1 | 40 | 45.0% | 30.7–60.2% | 35.0% | 11 | 15 | 124 / 116.5 / 10–284 | 40 | score outside 47–53%, too few games |
| center.passThrough+bishop | 1 | 40 | 52.5% | 37.5–67.1% | 45.0% | 12 | 10 | 118 / 106 / 10–310 | 40 | too few games |
| center.passThrough+pawn | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| coast.2p.initiation=open-at-start | 1 | 40 | 41.3% | 27.4–56.6% | 52.5% | 6 | 13 | 134 / 122.5 / 27–317 | 40 | score outside 47–53%, too few games |
| coast.2p.exit=a5-only | 1 | 40 | 47.5% | 32.9–62.5% | 65.0% | 6 | 8 | 122 / 117.5 / 10–256 | 40 | too few games |
| coast.returnAllowed=false | 1 | 40 | 42.5% | 28.5–57.8% | 55.0% | 6 | 12 | 121 / 118 / 10–269 | 40 | score outside 47–53%, too few games |
| coast.2p.capturable=false | 1 | 40 | 41.3% | 27.4–56.6% | 47.5% | 7 | 14 | 116 / 111.5 / 10–342 | 40 | score outside 47–53%, too few games |
| tail.2p.path=e5-i5-only | 1 | 40 | 47.5% | 32.9–62.5% | 40.0% | 11 | 13 | 123 / 104 / 9–306 | 40 | too few games |
| tail.repeatLimit=0 | 1 | 40 | 45.0% | 30.7–60.2% | 60.0% | 6 | 10 | 90 / 84 / 10–223 | 40 | score outside 47–53%, too few games |
| tail.2p.canCapture=true | 1 | 40 | 41.3% | 27.4–56.6% | 42.5% | 8 | 15 | 120 / 106 / 10–351 | 40 | score outside 47–53%, too few games |
| tail.canCheck=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 118 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| tail.capturable=true | 1 | 40 | 45.0% | 30.7–60.2% | 60.0% | 6 | 10 | 122 / 110.5 / 10–422 | 40 | score outside 47–53%, too few games |
| dragonHead.range=1 | 1 | 40 | 41.3% | 27.4–56.6% | 57.5% | 5 | 12 | 135 / 116 / 10–317 | 40 | score outside 47–53%, too few games |
| dragonHead.range=2 | 1 | 40 | 40.0% | 26.3–55.4% | 45.0% | 7 | 15 | 126 / 115.5 / 10–341 | 40 | score outside 47–53%, too few games |
| dragonHead.range=3 | 1 | 40 | 46.3% | 31.8–61.3% | 42.5% | 10 | 13 | 122 / 110.5 / 10–342 | 40 | score outside 47–53%, too few games |
| dragonHead.range=4 | 1 | 40 | 41.3% | 27.4–56.6% | 57.5% | 5 | 12 | 114 / 111.5 / 10–291 | 40 | score outside 47–53%, too few games |
| dragonHead.range=5 | 1 | 40 | 42.5% | 28.5–57.8% | 50.0% | 7 | 13 | 109 / 113.5 / 10–249 | 40 | score outside 47–53%, too few games |
| dragonHead.range=6 | 1 | 40 | 47.5% | 32.9–62.5% | 40.0% | 11 | 13 | 112 / 112 / 10–288 | 40 | too few games |
| dragonHead.range=7 | 1 | 40 | 45.0% | 30.7–60.2% | 40.0% | 10 | 14 | 116 / 106 / 10–305 | 40 | score outside 47–53%, too few games |
| dragon.canJump=true | 1 | 40 | 56.3% | 41.0–70.4% | 37.5% | 15 | 10 | 94 / 91 / 4–431 | 40 | score outside 47–53%, too few games |
| coastPieces.2p.giveCheck=false | 1 | 40 | 46.3% | 31.8–61.3% | 72.5% | 4 | 7 | 141 / 119.5 / 10–405 | 40 | score outside 47–53%, too few games |
| sunMoon.range=2 | 1 | 40 | 45.0% | 30.7–60.2% | 45.0% | 9 | 13 | 111 / 104.5 / 10–243 | 40 | score outside 47–53%, too few games |
| sunMoon.firstMoveDouble=false | 1 | 40 | 42.5% | 28.5–57.8% | 45.0% | 8 | 14 | 125 / 111.5 / 10–362 | 40 | score outside 47–53%, too few games |
| sunMoon.capture=diagonal-only | 1 | 40 | 38.8% | 25.3–54.2% | 57.5% | 4 | 13 | 127 / 108 / 10–361 | 40 | score outside 47–53%, too few games |
| sunMoon.capture=none | 1 | 40 | 41.3% | 27.4–56.6% | 47.5% | 7 | 14 | 129 / 120 / 10–421 | 40 | score outside 47–53%, too few games |
| sunMoon.canPromote=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| turn.firstMove=light | 1 | 40 | 60.0% | 44.6–73.7% | 45.0% | 15 | 7 | 115 / 110.5 / 9–253 | 40 | score outside 47–53%, too few games |
| draw.stalemate=loss-for-stalemated | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 114 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| draw.stalemate=win-for-stalemated | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| draw.threefoldRepetition=false | 1 | 40 | 40.0% | 26.3–55.4% | 35.0% | 9 | 17 | 171 / 172 / 10–379 | 40 | score outside 47–53%, too few games |
| draw.fiftyMove=false | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| draw.insufficientMaterial=false | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 118 / 108 / 10–305 | 40 | score outside 47–53%, too few games |

## How the games ended

- Depth 1: checkmate 23, insufficient-material 1, repetition 16. Wins by color: dark 9, light 14. Shallowest search finished: depth 1; 3.6 s per game.

## Flagged combinations

None.

## Skipped combinations

- queen.pawnSwap=true: not built yet: queen.pawnSwap
- setup.swapKingQueen=true: not built yet: setup.swapKingQueen
