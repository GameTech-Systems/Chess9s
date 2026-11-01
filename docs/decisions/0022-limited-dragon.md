# 0022: Limited Dragon rulesets (3-player)

**Status:** Accepted (owner in chat, 1 Nov 2026, S78 review; D80). Built in S79, screened after.

## Context
The S77 depth-3 screen did not settle the seat before the Dragon (see `docs/fairness/heavy-3p.depth3.md`). The owner chose another test: weaken the Dragon Heads.

## D80: Dragon Heads move at most 4 squares
1. Two experimental rulesets, each its 0.1.0 base with `dragonHead.range` = 4 (registry options 1 to 8, default 8) and nothing else changed: `heavy-limited-3p` "Heavy-Handed Dragon, Limited" (on `heavy-3p`) and `light-limited-3p` "Light-Handed Dragon, Limited" (on `light-3p`). **(owner)** No engine change; the range is data.
2. In the Light-Handed ruleset the Tail moves like a Dragon Head (`tail.3p.movement` = like-dragon-head) and reads the same parameter, so it is limited to 4 too. In the Heavy-Handed ruleset the Tail reads it the same way. **(owner,** confirmed in the S78 brief**)**
3. Screens (provisional default): depth 3, about 150 games, default turn order, of `light-3p` (the baseline), `heavy-limited-3p` and `light-limited-3p`; and 400-game screens at depths 1 and 2 of both Limited rulesets, to compare with S75. Every 3-player ruleset stays experimental (D60).
