# 0022: Limited Dragon rulesets (3-player)

**Status:** Accepted (owner in chat, 1 Nov 2026, S78 review; D80). Built in S79, screened after.

## Context
The S77 depth-3 screen did not settle the seat before the Dragon (see `docs/fairness/heavy-3p.depth3.md`). The owner chose another test: weaken the Dragon Heads.

## D80: Dragon Heads move at most 4 squares
1. Two experimental rulesets, each its 0.1.0 base with `dragonHead.range` = 4 (registry options 1 to 8, default 8) and nothing else changed: `heavy-limited-3p` "Heavy-Handed Dragon, Limited" (on `heavy-3p`) and `light-limited-3p` "Light-Handed Dragon, Limited" (on `light-3p`). **(owner)** No engine change; the range is data.
2. In the Light-Handed ruleset the Tail moves like a Dragon Head (`tail.3p.movement` = like-dragon-head) and reads the same parameter, so it is limited to 4 too. In the Heavy-Handed ruleset the Tail reads it the same way. **(owner,** confirmed in the S78 brief**)**
3. Screens (provisional default): depth 3, about 150 games, default turn order, of `light-3p` (the baseline), `heavy-limited-3p` and `light-limited-3p`; and 400-game screens at depths 1 and 2 of both Limited rulesets, to compare with S75. Every 3-player ruleset stays experimental (D60).

## S80: results of the screens
Seat scores are dark / light / Dragon (percent; the report tables list seats in turn order, which here is dark, light, Dragon). Brackets are 95% intervals. All are screens, not measures (D60, decision 0015): no run reaches 2,000 games, and every 3-player ruleset stays experimental. The Light-Handed Limited depth 1 and 2 runs have 380 games each, because shard 5 of run 41346778144 lost its runner and the merge ran on the other 19.

| Ruleset | Depth 1 (400) | Depth 2 (400) | Depth 3 (about 150) |
| --- | --- | --- | --- |
| `heavy-3p` (S75, S77) | 36.6 / 28.6 / 34.8 | 27.5 / 10.5 / 62.0 | 24.5 / 24.8 / 50.7 |
| `heavy-limited-3p` | 44.5 / 32.5 / 23.0 | 38.3 / 13.6 / 48.1 | 28.7 / 28.7 / 42.7 |
| `light-3p` (S75, S80) | 55.8 / 32.9 / 11.4 | 22.5 / 4.8 / 72.8 | 22.8 / 16.0 / 61.2 |
| `light-limited-3p` | 55.9 / 33.6 / 10.5 (380) | 34.6 / 8.6 / 56.8 (380) | 23.6 / 20.3 / 56.1 |

Readings (facts from the reports; the choice of what to do next is the owner's):
- Range 4 lowers the Dragon at depth 2 beyond doubt: Heavy 62.0 [57.2–66.6] to 48.1 [43.3–53.0], Light 72.8 [68.2–76.9] to 56.8 [51.8–61.7]. At depth 3 the drop (Heavy 50.7 to 42.7, Light 61.2 to 56.1) is inside the intervals at about 150 games.
- `heavy-limited-3p` at depth 3 is the closest to the 28–38% band of any 3-player screen so far: dark 28.7 [22.0–36.4], light 28.7 [22.0–36.4], Dragon 42.7 [35.0–50.7]. Only the Dragon's point value is outside.
- At depth 1 the limit overshoots in Heavy-Handed: the Dragon falls from 34.8 to 23.0 and dark rises to 44.5, where `heavy-3p` had all three inside the band.
- At depth 2 the light seat (just before the Dragon) stays last in both Limited rulesets (13.6 and 8.6), as in every S75 turn order. At depth 3 it recovers in Heavy (28.7) and partly in Light (20.3).
- `light-limited-3p` at depth 3 stays far from the band (dragon 56.1 [48.0–63.8]) with almost the same Dragon checkmate count as `light-3p` (60 of 148 and 60 of 147). Its Kinged players capture both Dragon Heads more often (19 games against 4).
- The three measures disagree on size and sometimes on direction, so depth 2 misleads for 3 players, as S77 found; the balance measure at depth 3 or higher is still an open owner question.
