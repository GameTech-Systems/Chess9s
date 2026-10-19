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

## 6. The Tail and the closed Coast (S17)
Owner answers, 19 Oct 2026, to the two questions left open by S16.
- **Tail and its mover's pieces.** "The Tail in 2-player games can't capture or be captured, it's a neutral piece." Applied: the Tail never captures a piece of the side moving it. `tail.2p.canCapture` stays as an option (it is in the registry): when on, the Tail may take only the other side's pieces; by default it captures nothing. If the option should go away altogether, the owner says so and it is removed in a new ruleset version.
- **Check from a closed Coast.** "In 2-player games, Coast pieces don't give check when the Coast is closed. In 3-player games, the Dragon could use a Coast piece to check from A5 only." Applied for 2 players: until the Tail opens the Coast, no piece standing on the Coast gives check (they still block lines). The 3-player sentence is recorded, not built (3-player check and game end are not built); its exact meaning is an open question in the handoff.
- **Provisional readings (S17, to confirm):** a closed Coast is closed to every piece, so no piece moves onto a Coast square before it opens (Kings and Queens included); a promotion that gives back a lost piece takes one piece of that type off the lost list (the "second pawn" question: it may not promote to it again unless another is lost); the opener's repeat-limit exception is the A5-to-E5 move followed by E5 to I5 on that player's very next turn, and is lost if the Tail is no longer on E5 then.

## 7. Owner answers to the S17 questions (19 Oct 2026, after S17)
Settled spec unless marked open.
- **Tail, 2-player default.** Neutral: it can stand only on A5, E5 and I5, can't capture or be captured, gives no check, and only blocks lines. Confirmed ("Correct").
- **`tail.2p.canCapture`** stays in the registry as an **option, not the default** (default `false`). When on, either side may use the Tail as a piece: it can check and capture the other side's pieces (never a piece of the side moving it). Turning it on also needs `tail.canCheck` for the Tail to give check.
- **Closed Coast.** Confirmed: it is closed to Kings and Queens as well as every other piece, and Coast pieces give no check while it is closed. Owner wording: "The only lines they block are the coast, so when the coast is closed, they give no check." Read as matching the build (inert pieces still block, and nothing but Coast squares is affected). The opening move is judged with the Coast open (S17), so a player can't open it into check of their own King.
- **Opener's exception** (A5-to-E5, then E5-to-I5 on that player's very next turn only): quoted back for confirmation, no answer given. Stays as written, provisional.
- **3-player, emerged Coast pieces (recorded, not built).** The Dragon's Coast pieces may give check only from A5 until they have emerged. Once a piece has emerged it can return to the Coast and then check and capture. So the game state needs an **emerged** marker per Coast piece (3-player only), so a piece that has not emerged differs from one that has. The 3-player game state, check and game end are still unbuilt.
  - **Answered (19 Oct 2026, later):** the opener's exception is correct as written. "E5" was a slip: Coast pieces first emerge through A5.
  - **Answered:** in 3-player games Dragon pieces give no check while both Kings are in play, but may capture a King; the Dragon player then has to checkmate the remaining King to win. In 2-player games Dragon Heads, Sun and Moon must give check. (Settled spec; 3-player still unbuilt.)
  - **Answered (19 Oct 2026, later; supersedes the Dragon-check lines above):** default for 3-player: Dragon Heads may capture a King with no check given as notice, then must checkmate the remaining King to win. The Dragon player needn't announce check.
  - **Answered: the `emerged` marker is a visible mark on the piece.** It tells the other players which Coast pieces can capture or checkmate from inside the Coast (anywhere but A5). A piece that has not emerged can attack only from A5; an emerged piece that has returned to the Coast can attack from any Coast square. The marker is shown on the board so players don't have to remember it in a long game. Needs a piece-state field in the game state and a mark in the web view when 3-player is built (no art; a plain mark is enough). Settled spec, not built.
