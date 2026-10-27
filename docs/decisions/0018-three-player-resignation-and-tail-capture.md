# 0018: 3-player resignation and capturing the Tail

**Status:** Accepted (owner answers of 27 Oct 2026 to the S57 handoff questions; Claude decided the Easy Start parts, as the owner allowed). Neither is built yet: step S67 builds both. Until then 3-player games have no Resign button and no preset turns Tail capture on.

## Resignation (owner)
A player who resigns in a 3-player game turns its pieces to stone, and the others play on. This is the same thing that happens to a side whose King the Dragon captures (decision 0016 rules 10 and 11). Agreed draws stay refused in 3-player games.

How that reads in each case. **(reading)** marks a case the owner's answer doesn't name:

| Who resigns, and when | What happens |
| --- | --- |
| A Kinged player, both Kings on the board | That side is out: its King leaves the board and its other pieces turn to stone, as after a King capture. Its turn is skipped from then on. The duel begins between the other Kinged player and the Dragon. No result yet **(owner)** |
| The last Kinged player, in the duel | The Dragon wins **(reading)** |
| The Dragon, in the duel | The last Kinged player wins **(reading)** |
| The Dragon, both Kings on the board | The Dragon is out: all its pieces, the Tail included, turn to stone. The Kinged players finish under the 2-player end rules (0016 rule 17) **(reading)** |
| A seat that is already out | It can't resign |

A seat may resign on any turn, as in 2-player games (S51). If the resigning seat is the one to move, play passes to the next seat. Draws that need the Kinged players or the Dragon (0016 rules 12 and 16) follow the seats still in the game. The result carries the reason `resignation`.

### Easy Start (Claude)
The first checkmate wins and there are no stones in Easy Start, but a resignation needs somewhere for the resigning side's pieces to go. Provisional: the same table applies, so the resigning seat's pieces turn to stone, the only place stones appear in that preset. After a Kinged player resigns the other Kinged player and the Dragon play on, and the first checkmate wins as before; stalemate, repetition and the 50-move rule are draws between the seats still in. If the Dragon resigns, its pieces and Tail turn to stone and the Kinged players finish as in chess. Revisit with the owner if the stones look wrong in a casual preset.

## Capturing the Tail (owner)
The Tail never leaves the board. A piece that captures it switches places with it, and the Tail turns to stone, as when it is checkmated (0016 rule 9). This is for `tail.capturable` in 3-player games, which no preset sets.

How that reads. **(reading)** again:
- The capture is handled exactly as a checkmate of the Tail, with the same swap, the same stone and the same results: while both Kinged players are in, the Tail turns to stone and the Dragon plays on; in the duel the last Kinged player wins **(reading)**. The `tail-stone` event records it, with the capturing piece's owner as `by`. The capture is not a second kind of result, so the end tables don't change.
- A capturing piece that may not stand on the Tail's square (rule 9) leaves the Tail in stone where it stands, and the piece stays on its own square. The capture still counts.
- A pawn that swaps onto its last rank promotes at once, with the choice asked as in rule 9.
- The swap is part of the move, so a move whose swap leaves the mover's King in check is not allowed.

### Easy Start (Claude)
Easy Start keeps its Tail uncapturable: `tail.capturable` is not offered there, and its preset stays as decision 0016 sets it ("can't be captured", checkmate only). The swap and the stone belong to the full rules, where stones exist; Easy Start's Dragon is easier to learn with one way to lose its King-piece. A player who builds an Easy Start variant with the option on gets the same swap and stone as above (S64's builder lists it).

## What S67 builds
Engine `resign(state, side)` for 3 seats and `endedBy` for 3-player records; the Resign button and result card on the game screen (hot-seat and against the computer, where the computer never resigns); the Tail capture in `game/three.ts` as the same effect as a checkmate (the `tail.capturable` parameter's 3-player option, `requires` and tests at each option); online rooms take both in S63.
