# 0016: 3-player rules v0.3 and the 3-player presets

**Status:** Accepted (S55, owner with Claude in chat, 26 Oct 2026). Answers ledger D55 to D57 and D65. D62 to D64 are defaults the owner can change in the ledger. D58 (the timer) stays open. S56 builds this record and moves its rules into [docs/RULES.md](../RULES.md) as `draft-3p` 0.3.0; until then RULES.md still shows rule set v0.2. Decision records 0014 (S50) and 0015 (S59) are reserved, so this one is 0016.

## Context
S32 found cases the 3-player rules (rule set v0.2, [0006](0006-rule-set-v0.2.md)) leave open (D55 to D58). On 26 Oct 2026 the owner asked for 3-player versions of the three presets ([0011](0011-presets.md)): Good Practice and Standard fill the gaps from the owner's earlier notes on the third player, and for Easy Start Claude decides how the Dragon plays and wins. The owner also said the Dragon settings may be options for players to experiment with, and that the computer can play the Dragon in a game, starting with a greedy heuristic.

The earlier notes used here:
- The owner's reference of 18 Oct 2026 and D27: the Dragon can capture a King, then tries to checkmate the other King; if a King checkmates the other King, that player wins and the game ends.
- Rule set v0.2 (RULES.md): Dragon pieces don't give check; a King attacked by a Dragon piece isn't forced to respond, and the Dragon may capture it on its turn; the Tail plays the role of the Dragon's King; the Tail turned to stone; the captured King's side in stone; the end table; the fairness rule (a checkmate between Kinged players ends the game at once, so the Dragon never gets a turn to rescue the mated King); 3-player stalemate is a draw between the Kinged players.
- The public ledger of 19 Oct 2026 ([LEDGER.md](LEDGER.md)): stones from eliminated Kings are permanent walls.

Below, **(notes)** marks a rule the owner's notes state, and **(reading)** a case the notes don't name, read from them as closely as possible.

## Three 3-player presets
| Preset | Ruleset | Status | What it plays |
| --- | --- | --- | --- |
| **Standard** (3-player default, D63) | `standard-3p` 0.1.0 | experimental | Good Practice, except `king.range` = 1, as in the 2-player Standard |
| **Good Practice** | `draft-3p` 0.3.0 | experimental | Every 3-player parameter at its default: the full Dragon rules below |
| **Easy Start** | `easy-3p` 0.1.0 | experimental, casual play | Easy Start's piece settings and a shorter Dragon game: the first checkmate wins (below) |

Turn order is dark, light, Dragon in all three (D26). `turn.firstMove` is a 2-player setting.

## The full Dragon rules (Good Practice and Standard)

### Check (D55)
1. Kings check each other as usual. A Kinged player may never leave its own King in check from the other Kinged player. **(notes)**
2. With `dragon.3p.givesCheck` off (the default), Dragon attacks are not check. A Kinged player may leave its King on a square a Dragon piece attacks **(notes)**, or move it onto one **(reading)**, at its own risk: the Dragon may capture it on its turn.
3. With `dragon.3p.givesCheck` on, attacks by the Dragon Heads, the Sun and the Moon are check, so a Kinged player must answer them. A King then can't be captured by those pieces; the Dragon removes it by checkmating it, which counts as capturing it. The Tail gives check only when `tail.canCheck` is also on; a King attacked only by a Tail that doesn't give check can still be captured by it. **(reading)**
4. The Tail is the Dragon's King while it is active: the Dragon must end any attack on it when it can, and may not move the Tail onto an attacked square or make a move that leaves it attacked. **(notes:** "it plays the role of the Dragon's King"**)**
5. **The duel.** Once the Dragon has captured one King, the last Kinged player and the Dragon play the game out. Dragon attacks on the last King are now check, whatever `dragon.3p.givesCheck` says, and the Dragon wins by checkmating that King. **(notes:** D27, "then tries to checkmate the other King"**)** Option `dragon.3p.lastKing` = `capture`: Dragon attacks keep the rule from 2 or 3, and the Dragon wins by capturing the last King (the owner's first reference had the Dragon capture both Kings).
6. No move may leave a King in check from a player who moves before that King's owner can answer (D62). In practice: the Dragon may not make a move that leaves light's King in check from dark, since dark moves next; and with Dragon check on, light may not make a move that leaves dark's King in check from the Dragon. **(reading,** from the fairness rule**)**

### Checkmate, the Tail and stones (D56)
7. Every checkmate is judged right after the move that gives it, as if the mated side moved next. This is the owner's fairness rule for King checkmates, applied to the Tail too: after dark checkmates the Tail, light gets no move to undo it. **(reading)** Option `tail.3p.mateTiming` = `dragon-turn`: the Tail is checkmated only if, at the start of the Dragon's turn, it is attacked and the Dragon has no move that ends the attack.
8. The checkmating piece is the piece that just moved, if it gives the check; otherwise the only piece giving check; if two or more give check and none of them just moved, the player who made the move chooses one, as part of the move (like a promotion choice). The checkmate belongs to the owner of the checkmating piece. **(reading)**
9. When the Tail is checkmated while both Kinged players are active, it switches places with the checkmating piece and turns to stone; on E5 it turns to stone where it stands. **(notes)** If the checkmating piece may not stand on the Tail's square under the ruleset in play, no swap happens and the Tail turns to stone where it stands: the owner's E5 rule applied to every such square (a Rook, Bishop, Knight or pawn on the Coast, or a Queen on a void square, unless the ruleset allows it). A pawn that swaps onto its last rank promotes at once, as in the Queen and green pawn swap. The swap is part of the move, so a move whose swap leaves the mover's King in check is not allowed (rule 1). **(reading)**
10. Stones only block: they never move, can't be captured, don't attack, don't give check and don't guard squares. No piece may move onto a stone. **(notes:** "they block, can't move, and can't be captured"; "permanent walls"**;** not attacking: **reading)**
11. A side in stone, a Tail in stone and a Dragon that is out stay that way until the game ends. **(notes)**

### Draws and stalls (D57)
12. While both Kings are on the board, every draw is a draw between the two Kinged players, as for stalemate (`draw.3p.stalemate`). **(notes** for stalemate**)** Threefold repetition and the 50-move rule apply in 3-player games, with the two new switches `draw.3p.threefoldRepetition` and `draw.3p.fiftyMove`, on by default as in 2-player. **(reading)**
13. Repetition: the same position, stones and seat statuses included, with the same player to move, for the third time. The 50-move rule: every player still in the game has made 50 moves with no capture, no pawn move, no King captured and no piece turned to stone. Tail, Sun and Moon moves count as moves. **(reading)**
14. Insufficient material applies only once the Dragon is out (rule 17). **(reading)**
15. If the Dragon has no legal move while both Kings are on the board, and the Tail is not checkmated, its turn is skipped. **(reading)**
16. In the duel, stalemate of either side, repetition and the 50-move rule are a draw between the last Kinged player and the Dragon. A last King that is not in check and has no legal move is stalemated. **(reading)**
17. Once the Dragon is out, the Kinged players finish the game under the 2-player end rules: checkmate wins; stalemate, repetition, the 50-move rule and insufficient material are draws. **(notes:** "the Kinged players play on"**;** the draw rules: **reading)**

### How 3-player games end (full rules)
| What happened | Result |
| --- | --- |
| A Kinged player checkmates the other King | That player wins; the game ends at once **(notes)** |
| The Dragon captures a King (or checkmates it, with Dragon check on) | That side turns to stone and its turn is skipped; the duel begins **(notes)** |
| In the duel, the Dragon checkmates the last King (captures it, with `dragon.3p.lastKing` = capture) | The Dragon wins **(notes)** |
| In the duel, the last Kinged player checkmates the Tail, or captures both Dragon Heads, the Sun and the Moon | That Kinged player wins **(notes)** |
| The Tail is checkmated while both Kinged players are active | The Tail turns to stone; play goes on, and the Dragon can still win **(notes)** |
| A Kinged player captures both Dragon Heads, the Sun and the Moon while the Tail is in stone | The Dragon is out; the Kinged players play on (rule 17) **(notes)** |
| A draw while both Kings are on the board | Draw between the Kinged players (rule 12) |
| A draw in the duel | Draw between the last Kinged player and the Dragon (rule 16) |

Extended play stays off (`extendedPlay.enabled`, D31).

## Easy Start for 3 players: the first checkmate wins (D65)
The owner left this preset's Dragon to Claude. The aim is rules a chess player can learn in a minute: every attack on a King is check, every King must get out of check, and the first checkmate wins.

- **Pieces**: Easy Start's 2-player settings where they apply to 3 players: King range 1 with castling, the Queen may cross and stand on void squares, no pawn-safe zones, and any piece may stand on and pass over E5.
- **Captures**: every piece except the Kings and the Tail can be captured anywhere, the Coast included (`coast.3p.capturable` = true).
- **Check**: the Dragon Heads, the Sun and the Moon give check (`dragon.3p.givesCheck` = true), and every King must get out of check, as in chess. No King is ever captured.
- **The Tail is the Dragon's King**: it jumps among A5, E5 and I5, whichever is empty, as in 2-player games (`tail.3p.movement` = two-player-path); it never captures (`tail.3p.captures` = none), never gives check and can't be captured. The Dragon must get it out of check.
- **The first checkmate wins** (`endings.3p` = first-checkmate): a Kinged player wins by checkmating the other King or the Tail, and the Dragon wins by checkmating either King. There are no stones, no King captures and no duel. Rules 6, 7 and 8 above apply.
- **Draws**, shared by all three: the player to move is not in check and has no legal move, threefold repetition, or the 50-move rule. Insufficient material doesn't apply.

Why this design: one goal for every seat, the same check rule as chess, and a Dragon King small enough to hunt (three squares), so the Kinged players have a second target and the Dragon has something to guard. Not fairness-checked; S59 screens it.

## New parameters (registry 0.3.0, all experimental)
| Id | Group | Default | Other options | Applies |
| --- | --- | --- | --- | --- |
| `endings.3p` | Turns and draws | `stones-and-duel` (the full rules) | `first-checkmate` | 3 players |
| `dragon.3p.lastKing` | Dragon Heads | `checkmate` | `capture` | with `stones-and-duel` |
| `tail.3p.mateTiming` | Dragon Tail | `after-move` | `dragon-turn` | with `stones-and-duel` |
| `draw.3p.threefoldRepetition` | Turns and draws | true | false | 3 players |
| `draw.3p.fiftyMove` | Turns and draws | true | false | 3 players |

`endings.3p` = `first-checkmate` needs `dragon.3p.givesCheck` on; the engine refuses a ruleset that sets one without the other. Rulesets:

- `draft-3p` 0.3.0: no overrides. 0.2.0 goes to the archive for replay; it has no lock (experimental).
- `standard-3p` 0.1.0: `king.range` = 1.
- `easy-3p` 0.1.0: `king.range` = 1, `castling.enabled` = true, `queen.canCrossVoid` = true, `queen.canStandOnVoid` = true, `pawn.safeZones` = off, `pawn.canEnterCenter` = true, `center.occupants` = any, `center.passThrough` = every piece, `coast.3p.capturable` = true, `dragon.3p.givesCheck` = true, `tail.3p.movement` = two-player-path, `tail.3p.captures` = none, `endings.3p` = first-checkmate.

No 2-player parameter, ruleset or lock changes.

## The computer and the Dragon (D59)
The owner (26 Oct 2026): the computer can play the Dragon in a game, starting with a greedy heuristic. S58 builds a greedy player for any seat: it plays a winning move first, then a King capture, then the move with the best immediate result by S23's piece values and evaluation, with no look-ahead and ties broken by the seed. Paranoid search (S62) follows as the stronger level and plays every seat in the balance runs (S59), so the seats are measured with equal play; games with a greedy Dragon are reported separately.

## Open
- D58, the timer: no rule yet. Each seat's elapsed time is shown, for display only.
- D62 (rule 6), D63 (Standard as the 3-player default) and D64 (3-player rulesets in the builder) are defaults until the owner confirms them.
