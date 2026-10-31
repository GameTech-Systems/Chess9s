# 0021: Heavy-Handed and Light-Handed Dragon, and clockwise turn orders (3-player)

**Status:** Accepted (owner in chat, 31 Oct 2026, S73 review; D75 to D78; readings confirmed in the S74 brief). Built in S74, screened in S75.

## Context
The S72 screens put no single lever inside 28–38% at depth 2 (reports `docs/fairness/standard-3p.md`, `.checkmate-only`, `.turn-order`, `.old-rules`). The Coast rule of [decision 0020](0020-three-player-coast-attacks.md) was the only one that stopped the Dragon capturing Kings, but it left dark ahead at depth 2 (45.8 / 34.9 / 19.4) and overshot at depth 1 (Dragon 8.5%). The owner read the screens in chat and chose two new 3-player rulesets to test, and ruled the counter-clockwise turn order out.

How it reads. **(owner)** marks the owner's words, **(reading)** a case they don't name. The owner confirmed the four open readings in the S74 brief (below); the others stay provisional.

## D75: Heavy-Handed Dragon
1. Each of the Dragon's pieces leaves the Coast first through A5, then may come back onto the Coast with any legal move. **(owner;** the existing `coast.3p.exit` = a5-first-then-any and `coast.returnAllowed` on**)**
2. While it stands on a Coast square, a Dragon piece (Dragon Heads, Sun, Moon, Tail) can't attack a piece that is not on the Coast. **(owner)** It may still attack a piece standing on the Coast, which can only be a King or a Queen (rule 3): it may capture it, and its attack on a King there counts as for any Dragon attack. It guards Coast squares only, and it still blocks lines. **(reading,** from "a piece that's not on the coast"; this differs from 0020's `blocked`, where a piece on the Coast attacks nothing**)**
3. Kings and Queens are the only other pieces that may enter the Coast, with any legal move. **(owner;** as D71: `king.canEnterCoast`, `queen.canEnterCoast`, and `coast.3p.capturable` on, so they may capture a Dragon piece there; the Tail still can't be captured**)**
4. The Dragon loses when the Sun, the Moon and both Dragon Heads are captured **and** the Tail is checkmated. **(owner)** This holds in the duel too: the last Kinged player must do both, where the full rules let either one win. **(reading)**
5. If both Kinged players are still in when the Dragon loses, the Tail turns to stone where it stands and the game goes on with it as a stone. **(owner)** The Tail does not switch places with the checkmating piece (0016 rule 9). **(owner,** "where it stands"**)** The Kinged players play on under 0016 rule 17. **(reading)**
6. A Tail checkmated while any of the four pieces is still on the board turns to stone where it stands at once, and the Dragon plays on with the rest, as in 0016 rule 9 without the swap; the Dragon is out once the four are captured too, in either order. **(reading)**
7. Everything the owner didn't name plays as `standard-3p` 0.3.0: the King moves one square, the Dragon captures Kings (Dragon check off), the Tail captures pieces that aren't Coast pieces (off the Coast, rule 2), checkmates are judged after the move. **(reading)**

## D76: Light-Handed Dragon
The same as Heavy-Handed, except the Tail:
1. The Tail only blocks: it can't attack, so it captures nothing and gives no check, and it can't be captured. **(owner;** the existing `tail.3p.captures` = none, `tail.canCheck` off, `tail.capturable` off**)** It is not the Dragon's King: it is never checkmated, and the Dragon need not keep it out of attack. **(reading,** from "blockage only" and the loss rule below**)**
2. The Dragon loses when the Sun, the Moon and both Dragon Heads are all captured. **(owner)** In the duel the last Kinged player wins by capturing them. **(reading)**
3. Until then the Tail may move to and stand on any square of the board with a legal move. **(owner)** It moves like a Dragon Head (`tail.3p.movement` = like-dragon-head), under the square rules the Tail has now: first off the Coast through A5, and it may stand on E5. **(reading)**
4. When the four are captured while both Kinged players are in, the Tail turns to stone where it stands and stays until the game ends. **(owner)**

## D77: Clockwise turn orders only
The order of play must go clockwise around the board, so a 3-player game has three orders, each starting with a different seat. **(owner)**

| `turn.3p.order` | Order of play |
| --- | --- |
| `dark-light-dragon` (default, D26) | Dark, light, the Dragon |
| `light-dragon-dark` | Light, the Dragon, dark |
| `dragon-dark-light` | The Dragon, dark, light |

`dark-dragon-light` (0020, D73) goes the other way round and is withdrawn from the registry. No ruleset or lock uses it; the S72 screen that played it (`docs/fairness/standard-3p.turn-order`) stays as a record of that run. The three orders share the same cycle, so they differ only in who moves first: the seat that answers the Dragon is the same in all three.

## D78: What to screen
Both rulesets at each of the three clockwise orders: six screens of 400 games at depths 1 and 2, as S72 ran them (`Sim depth 2`, `set` and `label`). A ruleset that screens inside 28–38% at both depths gets the full 2,000-game runs. Both stay experimental whatever the numbers show (D60). **(reading,** from "interesting for testing"**)**

## How S74 builds it (proposed; S74 may rename)
Each new setting is a parameter, tested at its default and every option, so the full rules and `standard-3p` play as before:

| Parameter | Options (default first) | Heavy | Light |
| --- | --- | --- | --- |
| `coast.3p.attackFrom` | allowed, blocked, **coast-only** (new) | coast-only | coast-only |
| `dragon.3p.defeat` (new) | tail-or-pieces-in-duel (the full rules), pieces-and-tail, pieces-only | pieces-and-tail | pieces-only |
| `tail.3p.stone` (new) | swap (0016 rule 9), where-it-stands | where-it-stands | where-it-stands |
| `turn.3p.order` | dark-light-dragon, light-dragon-dark, dragon-dark-light | default | default |

Light also sets `tail.3p.captures` = none; `pieces-only` makes the Tail a plain blocker that is never checkmated. `pieces-only` needs `tail.3p.captures` = none and `tail.canCheck` off, and the engine refuses a ruleset that sets it without them.

Two new experimental rulesets on `standard-3p` 0.3.0's values: `heavy-3p` "Heavy-Handed Dragon" and `light-3p` "Light-Handed Dragon". Every bundled ruleset is playable in the browser, so both appear with the 3-player presets, marked experimental. Registry 0.6.0. The computer Dragon learns the new loss rules (it guards the Tail only where the Tail is royal). RULES.md gets both rulesets and the turn-order line.

## The owner's answers (31 Oct 2026, S74 brief)
- Rule D75.2: a Dragon piece on the Coast may still capture a King or Queen that has entered the Coast. **Confirmed** (`coast-only` built).
- Rule D75.4: in the duel the last Kinged player needs both the four pieces and the Tail checkmate. **Confirmed.**
- Rule D75.6: a Tail checkmated before the four are captured turns to stone where it stands and the Dragon plays on. **Confirmed, with one addition (owner):** the Dragon then loses a turn: the Tail turning to stone by checkmate counts as the Dragon's move, then play continues normally. Built as part of `tail.3p.stone` = where-it-stands: the Dragon's next turn is skipped whenever its Tail turns to stone where it stands and it plays on (a `turn-skipped` event with `lost`). Under the Light-Handed rules the Tail turns to stone only with the Dragon out, so no turn is lost.
- Rule D76.3: the Light-Handed Tail moves like a Dragon Head under the Tail's square rules (first off the Coast through A5). **Confirmed.**

## How S74 built it
As the table above, with these names. The new piece field `attackOnly` (`when`, `on`: square types) carries coast-only on the five Coast pieces. `pieces-only` requires `tail.3p.captures` = none, `tail.canCheck` off and `tail.capturable` off (D76.1). `dragon.3p.defeat` and `tail.3p.stone` apply with `endings.3p` = stones-and-duel. Reading (S74, provisional): a Tail captured under `tail.capturable` with where-it-stands turns to stone where it stands and the capturing piece stays on its square, as on E5 before.
