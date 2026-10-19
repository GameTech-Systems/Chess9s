# Chess Nines rules (draft v0.2)

This is the suggested default rule set for 2-player games (draft, ruleset `draft-2p` 0.2.0) and the experimental 3-player Dragon mode (ruleset `draft-3p` 0.2.0). It is **not official**. 2-player defaults become a Candidate only after the fairness check, and official tournament rules come only after public discussion and ratification ([Governance](GOVERNANCE.md)).

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

- The King moves up to 2 squares in any one straight direction (`king.range` = 2). It slides, so it can't jump a piece on the first square (`king.canJump` = false).
- It attacks every square it could move to, so it gives check from 2 squares away, and two Kings can never stand within 2 open squares of each other.
- No castling by default (`castling.enabled` = false). As an option, castling works as in chess: the King moves 2 squares toward an unmoved Rook, and the Rook lands on the square the King crossed (light short: King F1 to H1, Rook I1 to G1; light long: King F1 to D1, Rook B1 to E1). The usual chess conditions apply.
- Kings may enter the Coast and may pass over an empty E5.

### Queen

- The Queen moves as in chess, but she can never land on or pass through the void squares B5, C5, D5, F5, G5 and H5 (`queen.canEnterVoid` = false).
- She has three ways across the void: A5 on the Coast, the center E5, and the Ting Yang square I5. Each is open only when empty (`queen.voidCrossings`).
- At E5 she may only pass over, in a straight line, and continue on the far side. She can never stop on E5, and if a dragon is on E5 that crossing is closed. Lines through E5: the E-file and the two diagonals D4 to F6 and F4 to D6.
- She may enter the Coast and may stop on A5 or I5, crossing along the A-file through A5 or the I-file through I5.
- **Option, off by default** (`queen.pawnSwap`): once per game, a Queen may trade squares with her green pawn, the pawn that starts on E2 (light) or E8 (dark). The swap uses her turn and may be made at any time, but only when both pieces may legally stand on their new squares: the Queen not on a barred void square, the pawn not on its own back rank, and her King not left in check. A pawn swapped onto its promotion rank promotes at once.
- A pawn that promotes to a Queen follows the same rules.

### Pawns

- Pawns move, take their initial double step, capture, take en passant and promote as in chess, and may stand on void squares. Light pawns promote on rank 9 and dark pawns on rank 1, to a Queen, Rook, Bishop or Knight. Option, off by default (`pawn.promotion.targets` = captured-piece): a pawn may instead promote to a piece its side has lost (Queen, Rook, Bishop, Knight or Coast piece). If its side has lost none, the pawn stays a pawn.
- No pawn may enter E5, so an E-file pawn is blocked at E4 or E6 until it captures off the file.
- **Pawn-safe zones** (`pawn.safeZones`). Each pawn is named by the color of its starting file. After it crosses the void, it can't be captured while it stands on the opponent's colored square in its own starting file. A pawn on its own side's colored squares gets no protection. A safe pawn can still move, capture and give check; only capturing it is blocked.

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
2. Kings and Queens may enter the Coast; Rooks, Knights, Bishops and pawns may not.
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
- **Draws, 3-player**: a Kinged player who is not in check and has no legal move on their turn ends the game as a draw between the two Kinged players.

## 3-player Dragon mode (experimental)

The third player is the Dragon: it moves third each round and plays all 5 Coast pieces, each of which first emerges from the Coast through A5. 3-player stays experimental until bot self-play shows the seats are balanced. The two players with Kings are the **Kinged players**.

- **First Coast move**: the Sun or Moon one square, or the Tail off A5 to any legal square, which frees A5.
- **Movement**: Dragon Heads and the Tail any distance in any direction; the Sun and Moon one square at a time on the Coast, then up to 2 squares in any direction. All in straight lines.
- **Check**: Dragon pieces don't give check to Kings. A King attacked by a Dragon piece isn't forced to respond, but the Dragon may capture it on its turn. The two Kings still check each other as usual.
- **The Tail**: it can capture any light or dark piece that isn't a Coast piece. It can't be captured, but it can be checkmated: a Kinged player's piece attacks it and the Dragon has no move that ends the attack. It plays the role of the Dragon's King.
- **Tail turned to stone**: if the Tail is checkmated while both Kinged players are active, it switches places with the checkmating piece and turns to stone, blocking that square until a Kinged player checkmates the other King or the game ends in stalemate. If the Tail is on E5, no swap happens; it turns to stone where it stands. The Dragon plays on with its other pieces.
- **Captured King**: when the Dragon captures a King, the King is removed like any captured piece, that side's turn is skipped, and its remaining pieces stay on the board in stone: they block, can't move, and can't be captured.
- Both Kinged sides may capture Dragon Heads and the Sun and Moon once they are off the Coast.

### How 3-player games end

| What happened | Result |
|---|---|
| A Kinged player checkmates the other King | That player wins; the game ends at once |
| The Dragon captures one King, then checkmates the other | The Dragon wins |
| The Dragon captures one King; the other Kinged player then captures both Dragon Heads, the Sun and the Moon, or checkmates the Tail | That Kinged player wins |
| The Tail is checkmated while both Kinged players are active | No winner yet: the Tail turns to stone, and the Dragon plays on and can still win by capturing a King and then checkmating the other |
| A Kinged player captures both Dragon Heads, the Sun and the Moon while the Tail is in stone | The Dragon is out; the Kinged players play on |
| A Kinged player is stalemated | Draw between the Kinged players |

**Fairness**: a checkmate between Kinged players ends the game immediately, whichever side delivers it, so the Dragon never gets a turn to rescue the mated King. The winner and the Dragon may then agree to continue in extended play.

### Extended play (not in v1)

After a King checkmates the other King, the Dragon may play on against the winning King if both agree, using the pieces it captured from the losing side. The captured pieces line up on the Coast and re-enter through A5. How many come back depends on what the winning King still has, so the terms will be settled after the core rules (`extendedPlay.enabled` = false). In extended play the remaining King wins by checkmating the Tail or by capturing both Dragon Heads, the Sun and the Moon.

## Fairness testing

The 2-player start is a mirror image across the void, so the only built-in edge is moving first. Bot self-play will check these risks before the default becomes a Candidate:

| Risk | Why it matters | Plan |
|---|---|---|
| Tail as a free pass | A Tail move works like a pass, which removes zugzwang and can stall a lost game | Covered by the Tail repeat limit |
| Opening the Coast costs a move | The opener spends a turn and the opponent may get a Coast piece out first | Measure whether it offsets moving first |
| Dragon Heads are very strong | An unlimited Head moves like a Queen and crosses the void freely while the Queen can't | Test `dragonHead.range` at 3 and 4 against unlimited |
| Kings are harder to mate | Range 2 gives the King more escape squares, and safe-zone pawns are hard to remove | Track the draw rate; if it is high, test `king.range` = 1 |

The fairness report covers win rate by seat, draw rate and average game length, published with the evidence.
