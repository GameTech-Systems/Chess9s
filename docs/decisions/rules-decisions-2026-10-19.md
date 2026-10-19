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
