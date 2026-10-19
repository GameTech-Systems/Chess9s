# Rules Decisions: 2026-10-19

Owner-approved answers to the four open rules questions. These supersede the provisional choices. Treat them as settled spec.

## 1. Several square rules apply to one square
- If more than one rule applies to a square, any "not allowed" wins (deny wins).
- A move's own rule cannot override the piece's rule.
- Result must not depend on the order rules are evaluated.
- If an override is ever needed, add an explicit override flag later. Not needed now.

## 2. "No passing over a square"
- The piece's line of movement ends on that square. It may still stop there if stopping is allowed.
- Applies to **sliding moves only**.
- Jumping moves (e.g., knight, Dragon-style jumpers) are NOT affected by a no-passing rule. State this explicitly in the engine and the rule docs.

## 3. Neutral (ownerless) pieces
- Use a per-piece `capturable` flag. No special-casing by piece name.
- **Dragon Tail** (2-player games): ownerless, `capturable = false`.
- **Stone** (3-player games, when a player's king is eliminated): the eliminated player's pieces become stones. Stones are ownerless, cannot move, give no check.
- **Default: stones stay as permanent walls and are not capturable** (`capturable = false`).
- Capturability of stones is a game-mode setting, not hard-coded, so a variant can enable it later.

## 4. Promotion
- Default matches standard chess. A pawn reaching the promotion zone **must** promote.
- Options: queen, rook, bishop, knight. Always available. Never depends on what has been captured.
- An empty promotion list means the piece does not promote (correct for knight, queen, etc.).
- **Validation:** if a piece has a promotion zone defined but an empty options list, raise a config validation error. Do not silently skip promotion.
- Optional later mode: `promote_to_captured_only`, **off by default**.

## 5. Promotion to a captured piece
- `pawn.promotion.targets` option `captured-piece` (off by default): a pawn that reaches the promotion zone may promote to any piece type its own side has lost: queen, rook, bishop, knight or Coast piece.
- If the side has lost none of those, there is nothing to promote to and the pawn stays a pawn.
- Confirmed by the owner (19 Oct 2026, S15): with other targets in the list, the lost pieces are added to them. Lost Coast pieces (Sun, Moon, Dragon Heads) count as lost pieces, are capturable, and a pawn reaching the far side may promote to one in 2-player games. This applies only under `captured-piece`; otherwise the pawn promotes to a queen, rook, bishop or knight. Kings and pawns are never targets.
- The engine takes the lost list as given; the game state (S16/S17) decides what is on it. Whether promoting to a lost piece removes it from the list: the owner said "not really, because the pawn traded for it, so instead of a queen and pawn on the board, it's just a queen". Read provisionally as: the promotion costs the pawn and gives back one piece, and nothing else changes. Still to confirm with the owner whether a second pawn may then promote to the same lost type.
