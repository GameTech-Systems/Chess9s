# 0020: No attacks from the Coast, and two balance options (3-player)

**Status:** Accepted (owner in chat, 29 Oct 2026, S70 review; D70 to D74). Built in S71.

## Context
The A5 exit of [decision 0019](0019-three-player-coast-exit.md) brought every seat of `standard-3p` 0.2.0 into the 28–38% band at depth 1, but not at depth 2: dark 22.9%, light 5.7%, Dragon 71.4% over 2,000 games ([report](../fairness/standard-3p@0.2.0.md)). Light's King was captured in 1,331 games (Dark's in 271), and 860 of the Dragon's 1,366 wins came from capturing a King. The owner reviewed the reports in chat and chose the next Standard ruleset to test, with two more levers to screen on their own.

## Decision
**D70: no attacks from the Coast.** A Coast piece (the Dragon Heads, the Sun, the Moon and the Tail) standing on a Coast square attacks nothing: it can't capture, gives no check and guards no square. A King may stand in its line or next to it. It still blocks lines like any piece. It may come back onto any Coast square, and its first way off the Coast is still through A5 (decision 0019), because without that the Dragon's pieces take Light and Dark pieces at once. The rule is a parameter, with the old behavior kept as an option:

| `coast.3p.attackFrom` | What it plays |
| --- | --- |
| `allowed` (registry default) | Coast pieces attack from the Coast, as in every 3-player game up to `standard-3p` 0.2.0. |
| `blocked` (`standard-3p` 0.3.0) | A Coast piece on a Coast square captures nothing, gives no check and guards nothing, but still blocks. |

**D71: Kings and Queens may take the Dragon's pieces on the Coast.** They were already the only pieces that may enter the Coast (`king.canEnterCoast`, `queen.canEnterCoast`; Rooks and the others may not, or Rooks would take the Dragon Heads at once). `standard-3p` 0.3.0 sets the existing option `coast.3p.capturable` = true, so a King or Queen may capture a Coast piece standing there. The Tail still can't be captured (`tail.capturable` off).

**D72: checkmate only, as an option.** King capture stays the default. The option to screen is the existing `dragon.3p.givesCheck` = true: the Dragon's attacks are check, so a Kinged player must answer them, no King is ever left to be captured, and the Dragon removes a King only by checkmating it (rule 3 of [RULES.md, Check](../RULES.md#check)). Nothing new is built for it.

**D73: turn order, as an option.** Light's King was captured about five times as often as Dark's. A guess to test: in the order of decision D26, Dark moves between the Dragon's move and Light's reply, so a Dragon threat on Light can be added to before Light answers it. With dark, Dragon, light, Light answers the Dragon at once. D26's order stays the default:

| `turn.3p.order` | Order of play |
| --- | --- |
| `dark-light-dragon` (default, D26) | Dark, light, the Dragon |
| `dark-dragon-light` (S71) | Dark, the Dragon, light |

The rules that depend on who moves next follow the order: a move may not leave a King in check from a seat that moves before its owner can answer (rule 6), and checkmates are judged as if the checkmated side moved next (rule 7).

**D74: Standard only.** Only `standard-3p` gets the Coast rule, as version 0.3.0 (D70 and D71). Good Practice (`draft-3p` 0.4.0, Dragon 11%) and Easy Start (`easy-3p` 0.2.0, Dragon 0%) keep their rules; their sweeps screen the rule as an option. Every 3-player ruleset stays experimental.

How it reads. **(owner)** marks the owner's answers, **(reading)** a case they don't name:

1. "On the Coast" means standing on a square of file A, A5 included. A piece on A5 takes nothing off the Coast either: it walks out first. **(reading,** from "no captures from any Coast square"**)**
2. A piece off the Coast may capture a piece standing on the Coast, landing there: the rule is about attacks from a Coast square, not onto one. **(reading)**
3. A disarmed Coast piece still counts as a piece for every other rule: it blocks, it may be captured where the rules allow, and the Tail is still the Dragon's royal piece. **(reading)**

## How it is built
- Piece data, not engine code. The piece format gains `moveOnly: { when }`: while its condition holds, every move of the piece is move-only (it captures and attacks nothing) and its capture-only moves are not played. The five Coast pieces set it for "3-player, `coast.3p.attackFrom` = blocked, standing on a Coast square". Attack maps come from the same walk, so check, guarding and the computer players follow.
- `turn.3p.order` names the seats in order of play, joined by `-`; the engine checks it seats exactly the board's 3-player sides (`src/game/turns.ts`).
- The registry is version 0.5.0.
- The computer Dragon (S68's development score) counts a piece as developed only while it stands off the Coast when attacks from the Coast are blocked, so it does not park pieces back there; the greedy player rates the Tail's ways out by where its moves go (`reachFrom`), not by its attacks, which are none on the Coast.

## Versions
`standard-3p` 0.3.0 is new. Version 0.2.0 is archived with a lock (`pnpm lock keep`, then `pnpm lock archive`), as S68 kept the earlier versions, so its recorded games, room records and fairness reports replay as they were played. Its reports are renamed `docs/fairness/<report>@0.2.0`. The locks of the versions archived in S68 record the two new parameters at `allowed` and `dark-light-dragon`, how they played (`pnpm lock add-keys <id>@<version>`).

## Balance
Not measured yet. S72 screens each lever alone (a few hundred games at depths 1 and 2): the Coast rule (`standard-3p` 0.3.0), checkmate only and the turn order (each on 0.2.0's rules), with the S69 runs as the baseline. Full 2,000-game runs only for a variant that screens inside 28–38%; levers are combined only if none passes alone. The `Sim depth 2` workflow's `set` and `label` inputs run a screen with parameters changed, as `docs/fairness/standard-3p.<label>`. The owner then chooses the defaults.
