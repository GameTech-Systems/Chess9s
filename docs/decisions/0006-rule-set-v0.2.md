# 0006: Rule set v0.2 (2-player draft and 3-player experimental)

**Status:** Accepted (draft rules, not ratified)

## Decision
The owner's rule set v0.2, worked out over four rounds of clarity checks on 18 Oct 2026, becomes the draft default rules. The readable version is [docs/RULES.md](../RULES.md). The data is `rules/parameters.json` 0.2.0, `rules/rulesets/draft-2p.json` 0.2.0 (status `proposed`) and `rules/rulesets/draft-3p.json` 0.2.0 (status `experimental`).

Main points:
- Standard pieces play as in chess, except: the King moves up to 2 squares, castling is off by default, the Queen can't enter the void and crosses it only at A5, E5 (pass over only) or I5, and pawns are safe on the opponent's colored square in their starting file once they cross the void.
- Only the 3 dragons may stand on E5. Rooks and Bishops can't slide through it.
- In 2-player games, either player opens the Coast by moving the Dragon Tail from A5 to E5. Each side then plays its Dragon Head and its Sun or Moon. The neutral Tail jumps among A5, E5 and I5, never captures or checks, and can't be moved on two of a player's turns in a row.
- In 3-player games, the Dragon player plays all 5 Coast pieces, moves third, and wins by capturing one King and checkmating the other. The Tail acts as the Dragon's King.
- All Coast pieces move in straight lines.

## Superseded or settled
- D2 (promotion targets): queen, rook, bishop, knight.
- D3 (`dragons.2p.mode`): superseded; the parameter is deprecated because Coast pieces now play in 2-player games.
- D4 (`dragon.rangeMode`): squares, with no corner-turn option.
- D5 (Dragon parameters' player counts): superseded by per-mode parameters.
- D6 (`sunMoon.capture`): any-move-square, with diagonal-only and none as options.
- D14 (public wording of 3-player features): the owner chose to publish the full 3-player rules.
- `queen.enemyTerritoryEntry` is deprecated in favor of `queen.voidCrossings`; `dragon.range` in favor of `dragonHead.range` and `tail.3p.movement`.

## Consequences
- S8's loader must load deprecated parameters but never resolve them into a new game.
- Colored squares, the Coast and the void need board data (S9 formats, S10 entry).
- The 2-player defaults still need the fairness check (D12) before they become a Candidate (decision 0004).
- Extended play in 3-player games (D31) is set aside; `extendedPlay.enabled` stays off.
