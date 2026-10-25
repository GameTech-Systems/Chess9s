# Fairness report: standard-2p 0.1.0

Verdict: **incomplete** (2026-10-25).

Measured as decision 0008 (version 2) sets out (ledger D12): the first player's score, counting a draw as half, must be 47–53% over at least 2,000 games at each of depths 1 and 2. The same search plays both seats; each game opens with 4 random plies; at most 100,000 positions per move; games stop at 2,000 plies. Runs with fewer games are screening only: a sweep combination is flagged when its whole 95% interval misses the band.

## Runs

| Combination | Depth | Games | First-player score | 95% interval | Draw rate | First wins | Second wins | Plies: mean / median / range | Distinct games | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| king.range=2 | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 115 / 108 / 10–305 | 40 | score outside 47–53%, too few games |
| king.range=3 | 1 | 40 | 43.8% | 29.6–59.0% | 47.5% | 8 | 13 | 119 / 99.5 / 14–368 | 40 | score outside 47–53%, too few games |
| king.range=4 | 1 | 40 | 42.5% | 28.5–57.8% | 60.0% | 5 | 11 | 136 / 119.5 / 17–318 | 40 | score outside 47–53%, too few games |
| king.canJump=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| king.canEnterCoast=false | 1 | 40 | 42.5% | 28.5–57.8% | 40.0% | 9 | 15 | 110 / 112 / 8–268 | 40 | score outside 47–53%, too few games |
| castling.enabled=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 116 / 8–359 | 40 | score outside 47–53%, too few games |
| queen.canCrossVoid=true | 1 | 40 | 57.5% | 42.2–71.5% | 60.0% | 11 | 5 | 119 / 105.5 / 8–361 | 40 | score outside 47–53%, too few games |
| queen.canStandOnVoid=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 117 / 103 / 8–359 | 40 | score outside 47–53%, too few games |
| queen.voidCrossings=e5-only | 1 | 40 | 47.5% | 32.9–62.5% | 55.0% | 8 | 10 | 147 / 135 / 8–654 | 40 | too few games |
| queen.voidCrossings=none | 1 | 40 | 43.8% | 29.6–59.0% | 77.5% | 2 | 7 | 223 / 209.5 / 8–591 | 40 | score outside 47–53%, too few games |
| queen.canEnterCoast=false | 1 | 40 | 45.0% | 30.7–60.2% | 45.0% | 9 | 13 | 115 / 105.5 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.initialDoubleStep=false | 1 | 40 | 51.2% | 36.3–65.9% | 37.5% | 13 | 12 | 130 / 119.5 / 7–458 | 40 | too few games |
| pawn.promotion.targets-queen | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-rook | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-bishop | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets-knight | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.promotion.targets+captured-piece | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.safeZones=any-colored-square | 1 | 40 | 38.8% | 25.3–54.2% | 42.5% | 7 | 16 | 112 / 105 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.safeZones=off | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 118 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| pawn.canEnterCoast=true | 1 | 40 | 35.0% | 22.1–50.5% | 35.0% | 7 | 19 | 134 / 127.5 / 9–362 | 40 | score outside 47–53%, too few games |
| pawn.canEnterCenter=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| center.occupants=dragons-and-sun-moon | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| center.occupants=any | 1 | 40 | 41.3% | 27.4–56.6% | 37.5% | 9 | 16 | 112 / 99.5 / 8–375 | 40 | score outside 47–53%, too few games |
| center.passThrough-dragon-head | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 123 / 110.5 / 8–502 | 40 | score outside 47–53%, too few games |
| center.passThrough-queen | 1 | 40 | 48.8% | 34.1–63.7% | 52.5% | 9 | 10 | 143 / 115.5 / 8–673 | 40 | too few games |
| center.passThrough-king | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| center.passThrough-sun-moon-pawn | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| center.passThrough-knight | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| center.passThrough+rook | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 130 / 125.5 / 8–299 | 40 | score outside 47–53%, too few games |
| center.passThrough+bishop | 1 | 40 | 50.0% | 35.2–64.8% | 25.0% | 15 | 15 | 111 / 103 / 8–383 | 40 | too few games |
| center.passThrough+pawn | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| coast.2p.initiation=open-at-start | 1 | 40 | 46.3% | 31.8–61.3% | 47.5% | 9 | 12 | 125 / 107.5 / 9–415 | 40 | score outside 47–53%, too few games |
| coast.2p.exit=a5-only | 1 | 40 | 50.0% | 35.2–64.8% | 50.0% | 10 | 10 | 134 / 123 / 8–415 | 40 | too few games |
| coast.openToAll=true | 1 | 40 | 57.5% | 42.2–71.5% | 35.0% | 16 | 10 | 121 / 100 / 13–309 | 40 | score outside 47–53%, too few games |
| coast.returnAllowed=false | 1 | 40 | 48.8% | 34.1–63.7% | 47.5% | 10 | 11 | 133 / 108.5 / 8–385 | 40 | too few games |
| coast.2p.capturable=false | 1 | 40 | 45.0% | 30.7–60.2% | 40.0% | 10 | 14 | 109 / 107.5 / 8–296 | 40 | score outside 47–53%, too few games |
| tail.2p.path=e5-i5-only | 1 | 40 | 45.0% | 30.7–60.2% | 35.0% | 11 | 15 | 101 / 97.5 / 8–286 | 40 | score outside 47–53%, too few games |
| tail.repeatLimit=0 | 1 | 40 | 43.8% | 29.6–59.0% | 47.5% | 8 | 13 | 87 / 66.5 / 8–237 | 40 | score outside 47–53%, too few games |
| tail.2p.canCapture=true | 1 | 40 | 41.3% | 27.4–56.6% | 47.5% | 7 | 14 | 123 / 118 / 8–312 | 40 | score outside 47–53%, too few games |
| tail.canCheck=true | 1 | 40 | 43.8% | 29.6–59.0% | 42.5% | 9 | 14 | 116 / 115 / 8–359 | 40 | score outside 47–53%, too few games |
| tail.capturable=true | 1 | 40 | 50.0% | 35.2–64.8% | 25.0% | 15 | 15 | 135 / 116 / 8–447 | 40 | too few games |
| dragonHead.range=1 | 1 | 40 | 52.5% | 37.5–67.1% | 40.0% | 13 | 11 | 137 / 154 / 8–309 | 40 | too few games |
| dragonHead.range=2 | 1 | 40 | 38.8% | 25.3–54.2% | 42.5% | 7 | 16 | 131 / 132 / 8–417 | 40 | score outside 47–53%, too few games |
| dragonHead.range=3 | 1 | 39 | 50.0% | 35.0–65.0% | 43.6% | 11 | 11 | 117 / 117 / 8–314 | 39 | too few games |
| dragonHead.range=4 | 1 | 1 | 0.0% | 0.0–79.3% | 0.0% | 0 | 1 | 8 / 8 / 8–8 | 1 | score outside 47–53%, too few games |
| dragonHead.range=5 | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| dragonHead.range=6 | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| dragonHead.range=7 | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| dragon.canJump=true | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| coastPieces.2p.giveCheck=false | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| sunMoon.range=2 | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| sunMoon.firstMoveDouble=false | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| sunMoon.capture=diagonal-only | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| sunMoon.capture=none | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| sunMoon.canPromote=true | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| turn.firstMove=light | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| draw.stalemate=loss-for-stalemated | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| draw.stalemate=win-for-stalemated | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| draw.threefoldRepetition=false | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| draw.fiftyMove=false | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |
| draw.insufficientMaterial=false | 1 | 0 | 0.0% | 0.0–100.0% | 0.0% | 0 | 0 | 0 / 0 / 0–0 | 0 | too few games |

## How the games ended

- Depth 1: checkmate 23, repetition 17. Wins by color: dark 9, light 14. Shallowest search finished: depth 1 (a search stops early once it finds a forced mate); 3.1 s per game. Moves the node budget cut short: 0.

## Flagged combinations

None.

## Skipped combinations

- queen.pawnSwap=true: not built yet: queen.pawnSwap
- setup.swapKingQueen=true: not built yet: setup.swapKingQueen
