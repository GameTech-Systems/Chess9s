# Chess Nines rules (draft v0.2, 3-player v0.3)

This page explains the Chess Nines rules at their defaults (rule set v0.2): the 2-player ruleset `draft-2p` 0.2.0, shown in the game as **Good Practice** (a **Candidate** since the fairness check passed: [report](fairness/draft-2p.md), [decision 0010](decisions/0010-draft-2p-candidate.md)), and the experimental 3-player Dragon mode, rule set v0.3 (ruleset `draft-3p` 0.3.0, [decision 0016](decisions/0016-three-player-rules-v0.3.md)). None of it is **official**. Official tournament rules come only after public discussion and ratification ([Governance](GOVERNANCE.md)).

## Presets

The game offers these 2-player presets ([decision 0011](decisions/0011-presets.md)). Each has its own rules page in the game, at `chess9s.com/rules/<id>`, listing every setting it plays.

| Preset | Ruleset | Status | Differs from this page |
|---|---|---|---|
| **Standard** (the default) | `standard-2p` | Candidate, since its fairness check passed ([report](fairness/standard-2p.md), [decision 0012](decisions/0012-standard-2p-candidate.md)) | The King moves one square in any direction, as in regular chess (`king.range` = 1) |
| **Good Practice** | `draft-2p` | Candidate | Nothing: every setting at its default. The 2-square King makes checkmate harder to force, which is good practice |
| **Easy Start** | `easy-2p` | Experimental, casual play | Closest to regular chess: light moves first, a 1-square King that may castle, the Queen may cross the void anywhere, e5 is an ordinary square for every piece but the Queen, and no pawn-safe zones |

The 3-player presets are all experimental, and none is fairness-checked yet ([decision 0016](decisions/0016-three-player-rules-v0.3.md)):

| Preset | Ruleset | What it plays |
|---|---|---|
| **Standard** (the 3-player default, D63) | `standard-3p` | Good Practice, except the King moves one square (`king.range` = 1), as in the 2-player Standard |
| **Good Practice** | `draft-3p` | Every 3-player setting at its default: the full Dragon rules below |
| **Easy Start** | `easy-3p` | Easy Start's piece settings and a shorter Dragon game: the first checkmate wins ([below](#easy-start-for-3-players-the-first-checkmate-wins)) |

Every rule here is a parameter with a default and a list of options, so players can experiment. The data in [`rules/parameters.json`](../rules/parameters.json) and [`rules/rulesets/`](../rules/rulesets/) is what the engine reads; this page explains it. Where the two disagree, the data is a bug to report.

Rooks, Knights, Bishops and pawns play as in 8×8 chess unless a rule below says otherwise.

## Board

The board is 9 by 9: the Coast column (A) plus an 8-column checkered board (B to I), split across the middle by the void (rank 5).

```
      A    B  C  D  E  F  G  H  I      2-player start
  9   DDH  R  N  B  Q  K  B  N  R      dark back rank
  8   Moon p* p  p  p  p  p  p* p
  7        .  *  .  .  .  *  .  .
  6        .  .  *  .  *  .  .  .
  5   Tail ~  ~  ~  E5 ~  ~  ~  I5     void; E5 center; I5 Ting Yang
  4        .  .  *  .  *  .  .  .
  3        .  *  .  .  .  *  .  .
  2   Sun  p* p  p  p  p  p  p* p
  1   LDH  R  N  B  Q  K  B  N  R      light back rank

  * = pawn-safe zone (colored square)
  DDH / LDH = Dark / Light Dragon Head
```

| Square or area | What it is | Who may stand there |
|---|---|---|
| Coast, A1 to A9 | Home of the 5 Coast pieces | Coast pieces, Kings and Queens |
| A5 | The Dragon Tail's start. In 3-player games, the exit for each Coast piece's first emergence | Coast pieces, Kings and Queens |
| Void: B5, C5, D5, F5, G5, H5 | Gray row between the halves | Any piece except a Queen |
| E5, center | Green center of the board | The 3 dragons only: both Dragon Heads and the Dragon Tail |
| I5, Ting Yang | Marked end square of row 5 | Any piece; one of the Tail's three squares |
| Pawn-safe zones | 6 color pairs mirrored across the void: B2/B8, C3/C7, D4/D6, F4/F6, G3/G7, H2/H8 | Any piece; safe only for the matching pawn after it crosses the void |

Coordinates follow regular chess: files A to I left to right from the Coast, ranks 1 to 9 from the light side. The board is a mirror image across rank 5, so both sides start with identical positions. Kings start on F1 and F9 (dark squares) and Queens on E1 and E9 (white squares).

**3-player setup**: the same, except the Sun and Moon switch (Sun A8, Moon A2), and all 5 Coast pieces belong to the Dragon player.

## Standard pieces

Rooks, Knights and Bishops move exactly as in regular chess, except that Rooks and Bishops can't slide through E5 (see [Center square](#center-square-and-general-rules)).

### King

- The King moves up to 2 squares in any one straight direction (`king.range` = 2). It slides, so it can't jump a piece on the first square (`king.canJump` = false). In the Standard and Easy Start presets it moves one square, as in regular chess.
- It attacks every square it could move to, so it gives check from 2 squares away, and two Kings can never stand within 2 open squares of each other.
- No castling by default (`castling.enabled` = false). As an option, castling works as in chess: the King moves 2 squares toward an unmoved Rook, and the Rook lands on the square the King crossed (light short: King F1 to H1, Rook I1 to G1; light long: King F1 to D1, Rook B1 to E1). The usual chess conditions apply.
- Kings may enter the Coast and may pass over an empty E5.

### Queen

- The Queen moves as in chess, but she can never land on or pass through the void squares B5, C5, D5, F5, G5 and H5. Two options, off by default: she may pass over empty void squares (`queen.canCrossVoid`), and she may stop on one (`queen.canStandOnVoid`). They replace `queen.canEnterVoid`, which turned both on at once.
- She has three ways across the void: A5 on the Coast, the center E5, and the Ting Yang square I5. Each is open only when empty (`queen.voidCrossings`).
- At E5 she may only pass over, in a straight line, and continue on the far side. She can never stop on E5, and if a dragon is on E5 that crossing is closed. Lines through E5: the E-file and the two diagonals D4 to F6 and F4 to D6.
- She may enter the Coast and may stop on A5 or I5, crossing along the A-file through A5 or the I-file through I5.
- **Option, off by default** (`queen.pawnSwap`): once per game, a Queen may trade squares with her green pawn, the pawn that starts on E2 (light) or E8 (dark). The swap uses her turn and may be made at any time, but only when both pieces may legally stand on their new squares: the Queen not on a barred void square, the pawn not on its own back rank, and her King not left in check. A pawn swapped onto its promotion rank promotes at once.
- A pawn that promotes to a Queen follows the same rules.

### Pawns

- Pawns move, take their initial double step, capture, take en passant and promote as in chess, and may stand on void squares. Option, off by default (`pawn.canEnterCoast`): once the Coast is open, a pawn may enter it. It gets there only by capturing onto file A, then moves forward along file A and promotes on its last rank as usual. Light pawns promote on rank 9 and dark pawns on rank 1, to a Queen, Rook, Bishop or Knight. Option, off by default (`pawn.promotion.targets` = captured-piece): a pawn may instead promote to a piece its side has lost (Queen, Rook, Bishop, Knight or Coast piece). If its side has lost none, the pawn stays a pawn.
- No pawn may enter E5, so an E-file pawn is blocked at E4 or E6 until it captures off the file.
- **Pawn-safe zones** (`pawn.safeZones`). Each pawn is named by the color of its starting file, and the game draws that color as a ring on its token. After it crosses the void, it can't be captured while it stands on the opponent's colored square in its own starting file. A pawn on its own side's colored squares gets no protection. A safe pawn can still move, capture and give check; only capturing it is blocked.

| Starting file | Light pawn | Safe on | Dark pawn | Safe on |
|---|---|---|---|---|
| B | Red | B8 | Pink | B2 |
| C | Orange | C7 | Burnt orange | C3 |
| D | Yellow | D6 | Dark yellow | D4 |
| F | Blue | F6 | Dark blue | F4 |
| G | Indigo | G7 | Dark indigo | G3 |
| H | Violet | H8 | Dark violet | H2 |

E-file and I-file pawns have no safe zone. A pawn that captures onto another file keeps its color but is safe only on its starting file's square.

## Coast play

In 2-player games the Coast stays closed until a player opens it with the Dragon Tail; each side then has its own Dragon Head and its Sun or Moon. In 3-player games the Dragon player has all 5 Coast pieces and opens the Coast itself.

| Coast piece | 2-player owner | 2-player movement | 3-player movement | Captures |
|---|---|---|---|---|
| Dragon Tail | Neither side; either player may move it | Jumps among A5, E5 and I5 only | Any direction, any distance, like a Dragon Head | 2-player: never, and never checks. 3-player: any light or dark piece that isn't a Coast piece |
| Light / Dark Dragon Head (A1 / A9) | Light / Dark | Any direction, any distance | Same | Yes, like any piece |
| Sun / Moon | Light (A2) / Dark (A8) | 1 square in any direction, or 2 straight forward on its first move. Option: 2 squares in any direction | 1 square at a time on the Coast; off it, up to 2 squares in any direction | Onto any square it can move to |

All Coast pieces move in straight lines and stop when blocked; none may turn a corner (`dragon.rangeMode` = squares).

### Opening the Coast: 2-player

1. Either player, on their turn, may use their move to put the Dragon Tail from A5 on E5. This opens the Coast (`coast.2p.initiation` = tail-to-center). Until then no Coast piece may move, and none gives check. Once open, the Coast stays open, even if the Tail returns to A5.
2. After that, either player may use a turn to jump the Tail to whichever of A5, E5 and I5 is empty. Pieces in between don't block it, and it may never stand anywhere else.
3. A player may not move the Tail on two of their own turns in a row (`tail.repeatLimit` = 1). One exception: the player who opens the Coast may move the Tail A5 to E5 and then E5 to I5 on their next turn, the first time it reaches those squares.
4. The Tail can't capture, can't check a King, and can't be captured; it is neutral, so it never takes a piece of the player moving it, whatever `tail.2p.canCapture` says. It blocks lines like any piece, so moving it can block or open a check.

### Leaving the Coast: 2-player

1. Once the Coast is open, Coast pieces leave and return with any legal move. Example: the Light Dragon Head may go from A1 diagonally to B2 if the way is clear.
2. Kings and Queens may enter the Coast; Rooks, Knights, Bishops and pawns may not. Option, off by default (`coast.openToAll`): every piece may enter the Coast at any time. The Coast is then open from the start, Coast pieces may move from the first turn, and no piece's own Coast setting keeps it off file A.
3. Coast pieces standing on the Coast can be captured like any piece, except the Tail.
4. Dragon Heads may stand on E5 and cross the void freely. Dragon Heads and the Sun and Moon give check and count toward checkmate like any piece.

### Leaving the Coast: 3-player

1. Each Coast piece's first emergence is through A5. After that, Coast pieces enter and leave the Coast with any legal move.
2. The Dragon player's first Coast move is either the Sun or Moon one square, or the Tail off A5 to any legal square, which frees A5.
3. The Sun and Moon move along the Coast one square at a time. Once the way is clear, a Dragon Head may move to A5 and then leave the Coast.
4. From A5 a piece moves out along rank 5 toward E5, or diagonally to B4 or B6.
5. Coast pieces can't be captured while they stand on the Coast.

## Center square and general rules

Only the 3 dragons (both Dragon Heads and the Dragon Tail) may ever stand on E5, in both 2- and 3-player games (`center.occupants` = dragons).

- **Passing through E5**: Rooks and Bishops can't slide through E5. Dragon Heads, the Queen, the King, and the Sun and Moon may pass over an empty E5 in a straight line, and Knights jump over it as usual. No piece passes through an occupied E5.
- **Capturing on E5**: a Dragon Head on E5 can be captured only by the other Dragon Head, since no other piece may land there.
- **Turn order**: in 2-player games the dark side moves first, then light. In 3-player games: dark, light, Dragon, repeating.
- **Winning, 2-player**: checkmate wins.
- **Draws, 2-player**: stalemate is a draw, as are threefold repetition, the 50-move rule and insufficient material, as in chess. Tail moves count as moves for the 50-move rule and repetition.
- **Winning and draws, 3-player**: see [3-player Dragon mode](#3-player-dragon-mode-experimental).

## 3-player Dragon mode (experimental)

The third player is the Dragon: it moves third each round (dark, light, Dragon) and plays all 5 Coast pieces, each of which first emerges from the Coast through A5. The two players with Kings are the **Kinged players**. 3-player stays experimental until bot self-play shows the seats are balanced. These are the full Dragon rules of Good Practice and Standard ([decision 0016](decisions/0016-three-player-rules-v0.3.md)).

- **First Coast move**: the Sun or Moon one square, or the Tail off A5 to any legal square, which frees A5.
- **Movement**: Dragon Heads and the Tail any distance in any direction; the Sun and Moon one square at a time on the Coast, then up to 2 squares in any direction. All in straight lines.
- **The Tail** can capture any light or dark piece that isn't a Coast piece, and can't be captured.
- Both Kinged sides may capture Dragon Heads and the Sun and Moon once they are off the Coast.

### Check

1. Kings check each other as usual. A Kinged player may never leave its own King in check from the other Kinged player.
2. Dragon pieces don't give check (`dragon.3p.givesCheck` off). A Kinged player may leave its King on a square a Dragon piece attacks, or move it onto one, at its own risk: the Dragon may capture it on its turn.
3. With `dragon.3p.givesCheck` on, attacks by the Dragon Heads, the Sun and the Moon are check, so a Kinged player must answer them. The Dragon then removes a King by checkmating it, which counts as capturing it. The Tail gives check only when `tail.canCheck` is also on; a King attacked only by a Tail that doesn't give check can still be captured by it.
4. The Tail is the Dragon's King while it is active: the Dragon must end any attack on it when it can, and may not move the Tail onto an attacked square or make a move that leaves it attacked.
5. **The duel.** Once the Dragon has captured one King, the last Kinged player and the Dragon play the game out. Dragon attacks on the last King are now check, whatever `dragon.3p.givesCheck` says, and the Dragon wins by checkmating that King. Option `dragon.3p.lastKing` = capture: Dragon attacks keep rule 2 or 3, and the Dragon wins by capturing the last King.
6. No move may leave a King in check from a player who moves before that King's owner can answer: the Dragon may not leave light's King in check from dark, and with Dragon check on, light may not leave dark's King in check from the Dragon. Option `check.3p.exposedKing` = counts-as-checkmate: such a move is allowed, and the King's owner loses at once to the owner of the piece giving check.

### Checkmate, the Tail and stones

7. Every checkmate is judged right after the move that gives it, as if the checkmated side moved next: a checkmate between Kinged players ends the game at once, so the Dragon never gets a turn to rescue the King, and after dark checkmates the Tail, light gets no move to undo it. Option `tail.3p.mateTiming` = dragon-turn: the Tail is checkmated only if, at the start of the Dragon's turn, it is attacked and the Dragon has no move that ends the attack.
8. The checkmating piece is the piece that just moved, if it gives the check; otherwise the only piece giving check; if two or more give check and none of them just moved, the player who made the move chooses one, as part of the move. The checkmate belongs to the owner of the checkmating piece.
9. When the Tail is checkmated while both Kinged players are active, it switches places with the checkmating piece and turns to stone; on E5 it turns to stone where it stands, and so it does if the checkmating piece may not stand on the Tail's square. A pawn that swaps onto its last rank promotes at once, as part of the move. A move whose swap leaves the mover's King in check is not allowed.
10. Stones only block: they never move, can't be captured, don't attack, don't give check and don't guard squares. No piece may move onto a stone.
11. When the Dragon captures a King, that side's remaining pieces turn to stone and its turn is skipped. A side in stone, a Tail in stone and a Dragon that is out stay that way until the game ends.

### Draws and stalls

12. While both Kings are on the board, every draw is a draw between the two Kinged players. Threefold repetition and the 50-move rule apply (`draw.3p.threefoldRepetition`, `draw.3p.fiftyMove`, both on).
13. Repetition: the same position, stones and seat statuses included, with the same player to move, for the third time. The 50-move rule: every player still in the game has made 50 moves with no capture, no pawn move, no King captured and no piece turned to stone. Tail, Sun and Moon moves count as moves.
14. Insufficient material applies only once the Dragon is out.
15. If the Dragon has no legal move while both Kings are on the board, and the Tail is not checkmated, its turn is skipped.
16. In the duel, stalemate of either side, repetition and the 50-move rule are a draw between the last Kinged player and the Dragon.
17. Once the Dragon is out, the Kinged players finish the game under the 2-player end rules: checkmate wins; stalemate, repetition, the 50-move rule and insufficient material are draws.

### How 3-player games end

| What happened | Result |
|---|---|
| A Kinged player checkmates the other King | That player wins; the game ends at once |
| The Dragon captures a King (or checkmates it, with Dragon check on) | That side turns to stone and its turn is skipped; the duel begins |
| In the duel, the Dragon checkmates the last King (captures it, with `dragon.3p.lastKing` = capture) | The Dragon wins |
| In the duel, the last Kinged player checkmates the Tail, or captures both Dragon Heads, the Sun and the Moon | That Kinged player wins |
| The Tail is checkmated while both Kinged players are active | The Tail turns to stone; play goes on, and the Dragon can still win |
| A Kinged player captures both Dragon Heads, the Sun and the Moon while the Tail is in stone | The Dragon is out; the Kinged players play on (rule 17) |
| A draw while both Kings are on the board | Draw between the Kinged players |
| A draw in the duel | Draw between the last Kinged player and the Dragon |

### Easy Start for 3 players: the first checkmate wins

Easy Start (`easy-3p`, `endings.3p` = first-checkmate) is a shorter Dragon game:

- **Pieces**: Easy Start's 2-player settings where they apply to 3 players: King range 1 with castling, the Queen may cross and stand on void squares, no pawn-safe zones, and any piece may stand on and pass over E5.
- **Captures**: every piece except the Kings and the Tail can be captured anywhere, the Coast included.
- **Check**: the Dragon Heads, the Sun and the Moon give check, and every King must get out of check, as in chess. No King is ever captured.
- **The Tail is the Dragon's King**: it jumps among A5, E5 and I5, whichever is empty; it never captures, never gives check and can't be captured. The Dragon must get it out of check.
- **The first checkmate wins**: a Kinged player wins by checkmating the other King or the Tail, and the Dragon wins by checkmating either King. There are no stones, no King captures and no duel. Rules 6, 7 and 8 apply.
- **Draws**, shared by all three: the player to move is not in check and has no legal move, threefold repetition, or the 50-move rule. Insufficient material doesn't apply.

`endings.3p` = first-checkmate needs `dragon.3p.givesCheck` on; a ruleset that sets one without the other is refused.

### Extended play (not in v1)

After a King checkmates the other King, the Dragon may play on against the winning King if both agree, using the pieces it captured from the losing side. The captured pieces line up on the Coast and re-enter through A5. How many come back depends on what the winning King still has, so the terms will be settled after the core rules (`extendedPlay.enabled` = false). In extended play the remaining King wins by checkmating the Tail or by capturing both Dragon Heads, the Sun and the Moon.

## Fairness testing

The 2-player start is a mirror image across the void, so the only built-in edge is moving first. Bot self-play checked these risks before the default became a Candidate (first-player score 49.0% at depth 1 and 49.3% at depth 2, 2,000 games each):

| Risk | Why it matters | Plan |
|---|---|---|
| Tail as a free pass | A Tail move works like a pass, which removes zugzwang and can stall a lost game | Covered by the Tail repeat limit |
| Opening the Coast costs a move | The opener spends a turn and the opponent may get a Coast piece out first | Measure whether it offsets moving first |
| Dragon Heads are very strong | An unlimited Head moves like a Queen and crosses the void freely while the Queen can't | Test `dragonHead.range` at 3 and 4 against unlimited |
| Kings are harder to mate | Range 2 gives the King more escape squares, and safe-zone pawns are hard to remove | Track the draw rate; if it is high, test `king.range` = 1 |

The fairness report covers win rate by seat, draw rate and average game length, published with the evidence.
