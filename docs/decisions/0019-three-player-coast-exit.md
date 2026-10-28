# 0019: The 3-player way off the Coast (`coast.3p.exit`)

**Status:** Accepted (owner with Claude in chat, 28 Oct 2026). Built in S68.

## Context
The owner asked whether the 3-player imbalance came from the Dragon's pieces only being able to leave the Coast through A5. S68 found that the rule had never been built: `unbuiltFeatures` listed `coast.3p.exit` in every 3-player game (S56 to S67), so every 3-player game, test game and fairness report so far let each Coast piece leave the Coast with any legal move from the Dragon's first turn.

With `coast.3p.capturable` off (Coast pieces can't be captured on the Coast), that gave the Dragon free captures from squares no one could answer: on its first turn the Moon on A2 could take Light's Rook on B1 and the Sun on A8 Dark's Rook on B9, and a Head on A1 or A9 could fire along rank 1 or 9, or down a long diagonal as soon as a pawn moved. Self-play shows it: in two depth-2 games of Standard 0.1.0 played in S68 with the sim's search, the Dragon's second to sixth moves in one were `a1xh8`, `a8xb9`, `a2xb1`, `b1xc1` and `b9xc9`, and in the other it had taken both B-file Rooks, both C-file Knights and a Bishop within its first eight moves. In the S60 depth-2 run the Dragon scored 75.7% ([report](../fairness/standard-3p@0.1.0.md)). So the A5 exit can't be what unbalanced those games; the missing rule may be part of it.

## Decision
The owner chose to build the rule as written in [RULES.md](../RULES.md) (rule set v0.2) as the default, and to add a way off the Coast with any legal move as an option, so that both can be measured.

| `coast.3p.exit` | What it plays |
| --- | --- |
| `a5-first-then-any` (default) | Each Coast piece's first way off the Coast is from A5. After that it leaves and returns with any legal move. |
| `a5-always` | Every way off the Coast is from A5, for the whole game. |
| `any-legal-move` (new, S68) | Any legal move from the start: how every 3-player game played before S68. |

How it reads. **(notes)** marks the owner's rules, **(reading)** a case they don't name:

1. Until a Coast piece has left the Coast once, it moves only along the Coast (file A), or off it from A5. **(notes)**
2. A piece has left the Coast when it lands on a square that is not a Coast square. Moving along the Coast, A5 included, doesn't count. **(reading)**
3. A Coast piece's attacks follow its moves, as for every piece: one that hasn't left the Coast yet attacks no square off it except from A5, so it captures nothing there and, with `dragon.3p.givesCheck` on, gives no check. **(reading,** from the attack-map rule of [RULES-FRAMEWORK](../RULES-FRAMEWORK.md)**)**
4. The Tail starts on A5, so its first way off is always open; with `tail.3p.movement` = two-player-path it only ever stands on A5, E5 and I5. **(reading)**
5. The Dragon's first Coast move is therefore the Tail, the Sun A8 to A7 or the Moon A2 to A3 (RULES.md, "Leaving the Coast: 3-player", rule 2). The Heads are boxed in until the Sun or Moon has walked out through A5: bringing all five pieces out takes the Dragon at least 13 moves. **(notes)**

It applies to all three 3-player presets, Easy Start included, since none of them sets `coast.3p.exit`.

## How it is built
- Piece data, not engine code: the five Coast pieces carry two square rules each, read when `coast.3p.exit` is `a5-first-then-any` or `a5-always`, that bar stopping off the Coast from a Coast square other than A5 (`coast-gate`).
- A new condition, `{ "hasLeft": "<square type>" }`, holds once the piece has moved off a square of that type onto one without it. The game keeps it per piece (`PlacedPiece.left`), only for the square types a piece's own data reads, and the repetition key includes it, so a piece that has left the Coast is not the same piece as one that hasn't.
- The registry is version 0.4.0. `coast.3p.exit` gains the option `any-legal-move` and affects check detection and balance as well as movement.

## Versions
The rule changes how the three 3-player rulesets play, so each gets a new version: `draft-3p` 0.4.0, `standard-3p` 0.2.0 and `easy-3p` 0.2.0. Their earlier versions (0.3.0, 0.1.0 and 0.1.0) are archived **with locks** that record `coast.3p.exit` = `any-legal-move`, which is how they played. Experimental versions are usually archived without a lock (S56), but these have fairness reports, recorded test games and online room records, and with the lock they all replay as they were played.

## Balance
Not measured yet. Decision 0015's runs (2,000 games at each of depths 1 and 2) are to be played again for `standard-3p` 0.2.0 on the `Sim depth 2` workflow, with the screening sweep, which now plays `a5-always` and `any-legal-move` as well. Earlier reports stay labeled with the version they played, and S68 renamed them `<report>@<version>` in `docs/fairness/` (for example `standard-3p@0.1.0.md`), so the new runs start fresh reports beside them. Every 3-player ruleset stays experimental whatever the numbers show.

Why Light collapsed at depth 2 (decision 0015, S61 review) stays open until the new runs show whether it outlasts the free captures from the Coast.
