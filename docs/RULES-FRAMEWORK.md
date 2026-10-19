# Rules framework

Chess Nines rules are **data**. The engine reads them; it never hardcodes a piece rule. The current draft rules are explained in plain words in [RULES.md](RULES.md).

## Concepts

- **Parameter:** one variable rule, such as `king.range`. It has a default, a list of options, and a status.
- **Ruleset:** a named, versioned bundle of overrides on the parameter defaults. A ruleset with no overrides plays every parameter at its default.
- **Status:** where a parameter or ruleset is in the [governance](GOVERNANCE.md) process: `proposed`, `experimental`, `candidate`, `official`, or `deprecated`.

Every saved game and tournament records the ruleset **id and version**, so a game can always be replayed under the rules it was played with.

## Parameters

Parameters live in [`rules/parameters.json`](../rules/parameters.json) and are validated by [`rules/schema/parameters.schema.json`](../rules/schema/parameters.schema.json).

| Field | Meaning |
|---|---|
| `id` | Dotted name, `<piece>.<aspect>`, such as `king.range` |
| `label`, `description` | Human-readable text |
| `piece` | The piece affected, or `null` for global rules |
| `players` | Player counts it applies to: `[2]`, `[3]`, or `[2, 3]` |
| `type` | `integer`, `boolean`, `enum`, or `enumSet` |
| `default` | The default value, or `null` if the rule is still undecided |
| `options` | Allowed values. The default must be one of them |
| `status` | Governance status |
| `affects` | Systems it touches, such as `check-detection`, flagged for simulation when combined |
| `needsDecision` | `true` if the owner must choose a default |
| `source`, `notes` | Where the value came from, and any caveats |

Example, the King's reach: default 2 squares, with 1, 3, or 4 as options.

## Rulesets

Rulesets live in [`rules/rulesets/`](../rules/rulesets/) and are validated by [`rules/schema/ruleset.schema.json`](../rules/schema/ruleset.schema.json). A ruleset lists only the parameters it changes in `overrides`. Version numbers follow semantic versioning:

- **patch:** wording or metadata only
- **minor:** additive change that does not alter existing games
- **major:** any gameplay change

An **Official** ruleset is immutable. Any change is a new version, and the old one stays available for replays.

## Boards

Boards live in `rules/boards/` (the Chess Nines board is `standard-9x9.json`) and are validated by [`rules/schema/board.schema.json`](../rules/schema/board.schema.json). The format is recorded in [decision 0007](decisions/0007-board-and-piece-formats.md).

| Field | Meaning |
|---|---|
| `id`, `name`, `version` | Identity; versions follow semantic versioning |
| `squareTypes` | The kinds of special square, each with an `id` and `label` |
| `squares` | The special squares: `at` (such as `e5`), one or more `types`, an optional owning `side`, a display `label` and a display `color` (`#rrggbb`). Unlisted squares are plain |
| `sides` | Each side's `id`, its `forward` direction (`up`, toward rank 9, or `down`) and an optional `view`: how the board is drawn for that seat, as a clockwise `rotate` of the standard diagram (0, 90, 180 or 270). A side may have no forward direction if none of its moves in that player count is forward-relative |
| `setups` | One start position per player count: side id, or `neutral` for unowned pieces, to square to piece id, and a `turnOrder`: the seats in order of play, every side with pieces once and never `neutral` |

Coordinates are lowercase: files `a` to `i` from the left, ranks `1` to `9` from the light side.

```json
{
  "squareTypes": [{ "id": "void", "label": "Void" }],
  "squares": [{ "at": "c4", "types": ["void"] }],
  "sides": [{ "id": "light", "forward": "up" }, { "id": "dark", "forward": "down" }],
  "setups": [{ "players": 2, "pieces": { "light": { "e1": "guard" }, "dark": { "e9": "guard" } } }]
}
```

## Pieces

Each piece is one file in `rules/pieces/`, validated by [`rules/schema/piece.schema.json`](../rules/schema/piece.schema.json). New movement is proposed as data in this format, not as code.

| Field | Meaning |
|---|---|
| `id`, `name`, `letter` | Identity, and a placeholder letter until art exists |
| `moves` | One or more moves (below) |
| `squares` | Square rules for every move of the piece |
| `royal` | The checkmate target. Default false |
| `capturable`, `givesCheck` | Default true |
| `promotion` | `to`: piece ids. Promotes on the last rank in the side's forward direction |

A **move** is exactly one of:

- `directions`: `orthogonal`, `diagonal`, `forward`, `backward`, `sideways`, `forward-diagonal`, `backward-diagonal`.
- `vectors`: steps as `[files, ranks]`, with positive ranks toward the side's forward; `symmetry` is `none` (default), `mirror` (adds the left-right image) or `all` (all 8 images). `[[1, 2]]` with `all` and `range: 1` is the Knight's move.
- `targets`: square types; the piece moves straight to any square of those types, whatever stands in between.

It may also set `range` (most steps; omitted means unlimited), `jump` (may pass occupied squares; default false), `capture` (`move-or-capture`, the default, `move-only` or `capture-only`), its own `squares` rules and a `when` condition.

A **square rule** names a square type and says whether the piece may `stop` there (end a move on it, including a capture) or `pass` over it (cross it on the way). Both default to true. `pass` rules apply to the squares a sliding move steps through; a jumping move ignores them, and a leaper's single step crosses no squares.

**Parameters** plug in two ways:

- A value may be `{ "param": "<id>" }`, read from the resolved ruleset: an integer parameter for `range`, a boolean one for `jump`, `stop`, `pass`, `capturable` and `givesCheck`, and an enumSet one for `promotion.to`.
- A move, square rule or promotion may carry `when`, which applies it only if the condition holds: `{ "param", "is" }`, `{ "param", "in" }`, `{ "param", "has" }` (for enumSet parameters), `{ "players": [3] }`, `{ "from": "<square type>" }`, `{ "firstMove": true }`, or `not`, `all` and `any` around other conditions.

```json
{
  "id": "slider",
  "name": "Slider",
  "letter": "S",
  "moves": [{ "directions": ["orthogonal"] }],
  "squares": [
    { "type": "void", "stop": { "param": "slider.canEnterVoid" }, "pass": { "param": "slider.canEnterVoid" } }
  ]
}
```

The engine checks what a schema can't: unique ids, declared square types and sides, parameter references that exist, aren't deprecated and have the right type, condition values that are options, setups that place only known pieces, and no forward-relative piece starting for a side without a forward direction (moves limited by `players` to other player counts don't count). The test layout in `packages/engine/test/fixtures/` shows every field and is deliberately not the Chess Nines board.

Special rules such as en passant, castling and opening the Coast are engine features switched by parameters; the format grows to describe them as they are built. Betza notation, which the fairy-chess community already uses, may later be accepted as a shorthand that converts into this format.

## Move generation

`packages/engine/src/moves/generate.ts` turns this data into pseudo-legal moves; `check.ts` adds check and legality (next section). It has no piece-specific code. The square-rule, neutral-piece and promotion choices below are settled by `docs/decisions/rules-decisions-2026-10-19.md`.

- **Steps**: named directions and vectors are turned around for a side whose forward is `down`. A side without a forward direction may only use moves that read the same either way.
- **Range**: a move repeats its step up to `range` times along a line, or to the edge when unlimited. Each square reached is a possible destination; the earlier ones are stepped through.
- **Blocking**: without `jump`, the line ends at the first occupied square (a capture there if allowed). With `jump`, it continues past occupied squares, and each one on the way may still be captured.
- **Captures**: never your own side's pieces. Any other piece, `neutral` ones included, may be captured if the move allows captures and the piece's `capturable` flag is true (no special-casing by piece name). Dragon Tail (2-player) and stones (3-player, from an eliminated king's pieces) are ownerless and not capturable by default; stone capturability is to become a game-mode setting. `move-only` moves need an empty square; `capture-only` moves need a piece to capture.
- **Square rules**: the piece's own rules and the move's rules both apply when their `when` holds. Deny wins: any applicable `stop: false` forbids ending on that square type, and a move's own rule cannot override the piece's. The result does not depend on the order rules are evaluated. Any applicable `pass: false` ends a **sliding** line on that square: the piece may still stop there if stopping is allowed, but not continue. **Jumping moves (`jump: true`) are not affected by `pass: false`**; their `stop` rules still apply.
- **Targets**: every square of the listed types except the one the piece stands on. Stop rules and the capture mode still apply.
- **Conditions** are checked against the resolved ruleset. A parameter that is missing, still null or of the wrong type stops generation with an error rather than a guess.
- **Promotion**: a move that ends on the side's last rank produces one move per target. Promotion is mandatory and matches standard chess by default (queen, rook, bishop, knight, independent of captures). An empty target list means the piece does not promote. A piece with a promotion zone but an empty list is a configuration error (to be enforced when zones become data; today the zone is the last rank). The option `captured-piece` of `pawn.promotion.targets` (off by default) adds every piece type the side has lost, other than Kings and pawns; the caller passes the lost pieces (`Lost`, side id to piece ids) to `movesFrom` and `generateMoves`. A side that has lost none has no target, so the pawn stays a pawn. The generator refuses (`RulesError`) when such a promotion comes up and no lost list was given, or the list names an unknown piece.
- Results are sorted by notation (`e2-e4`, `e5xd6`, `d8-d9=slider`) with duplicates removed, so the same position always gives the same list.

## Check and legal moves

`packages/engine/src/moves/check.ts` builds on the generator; nothing in it names a piece.

- **Attack maps** come from the same walk as moves (`attacksFrom`, `attackMap`): a square is attacked when one of a piece's moves could capture an enemy piece standing there. Move-only steps never attack; lines, ranges, jumps, stop and pass rules apply exactly as for moves, so `king.range` and `king.canJump` change what a King attacks. Squares of the attacker's own pieces count (defended); whether the piece on a square may be captured does not. Attacks never need the lost-piece list.
- **Check**: a side is in check when a piece of any other side, `neutral` included, attacks one of its `royal` pieces and that piece's `givesCheck` holds (`coastPieces.2p.giveCheck` for Dragon Heads, Sun and Moon; `tail.canCheck` for the Tail, which also needs `tail.2p.canCapture` to attack at all). A side without a royal piece is never in check. The flag is read only for a piece that attacks.
- **Inert pieces**: a caller may mark pieces whose attacks give no check (`inert`, such as every piece on a closed Coast); they still block lines. `lifts` names the moves after which every piece counts again (the move that opens the Coast), and `allow` removes moves the game state forbids before the check test.
- **Legal moves** are the pseudo-legal moves after which none of the side's royal pieces is in check. A caller may let the side also move another side's pieces (`alsoMove`, such as `neutral` for the Tail in 2-player games), and a borrowed piece never captures a piece of the side moving it; whether it may move on this turn is game state.
- **Game status**: no legal move is checkmate when in check and stalemate otherwise; stalemate reads `draw.stalemate` (draw, loss for the stalemated side, or win for it). 3-player check and game end are not built yet: a Coast piece's flag names a 2-player parameter and is refused in a 3-player game rather than guessed.
- **Turn order** (`packages/engine/src/game/turns.ts`): the setup's `turnOrder`, rotated so that `turn.firstMove` starts where the ruleset resolves it, for any number of seats; `nextSide` skips seats that are out.
- **Interactions** (`packages/engine/src/rules/interactions.ts`): every pair of parameters that can vary in a game of that player count and share an `affects` system, for the simulation harness.

## Game state

`packages/engine/src/game/game.ts` keeps one game: `newGame(rules, { id, version })` returns an immutable `GameState` and `playMove(state, move)` the next one. It refuses a ruleset with an undecided value and any player count but 2 (3-player game end is not built). It supplies what `legalMoves` and `gameStatus` take.

- **Kept**: the position, the side to move, the `Lost` list per side, whether the Coast is open, each side's run of Tail moves, the moves played (with notation) and the result. `gameRecord` returns the ruleset id and version, the turn order, the notation and the result.
- **The Coast** is closed until the Tail lands on the center square (`coast.2p.initiation = tail-to-center`; `open-at-start` starts it open) and stays open. While closed, no piece moves from or onto a `coast` square except the Tail's opening move, and the Tail may move only to the center. Coast pieces give no check while it is closed (owner, 19 Oct 2026); the opening move itself is judged with the Coast open, so it can't expose its own King. Owner confirmed this on 19 Oct 2026 (decisions record, section 7). For 3-player, the game state will need an `emerged` marker per Coast piece (not built).
- **The Tail** (the neutral side's piece) may be moved by whoever's turn it is, subject to `tail.repeatLimit`: a side whose latest `limit` turns were all Tail moves may not move it again (0 = no limit). The exception (docs/RULES.md): the side that opened the Coast may play E5 to I5 on its very next turn. It never captures a piece of the side moving it.
- **Lost pieces**: each capture adds the captured piece type to its side's list. A promotion removes one piece of the chosen type from the promoting side's list (provisional, docs/decisions/rules-decisions-2026-10-19.md, section 6).
- **Result**: `ongoing`; a win by checkmate (the side that moved wins); or stalemate read from `draw.stalemate` (a draw, or a win for one side). `unbuiltFeatures` lists the rules a ruleset has on that this game does not play yet: en passant, castling, queen and pawn swap, pawn-safe zones, leaving the Coast by A5 only, no capture on the Coast, swapped King and Queen, and the three other draws (threefold repetition, fifty-move, insufficient material).

## Engine requirements

- Pure TypeScript with no UI dependencies, and deterministic.
- Check and checkmate are computed from attack maps, not hardcoded per piece, because variables such as `king.range` change what counts as an attack.
- Turn order supports any number of players.
- Rulesets are validated against the schemas, and the engine also checks that each default is one of its options.
- Combinations of parameters that interact (see `affects`) are flagged for simulation before they can become a default or Official.

## Open parameters

Parameters with `needsDecision: true` have no agreed default yet. The engine must refuse to start a game that depends on one until a ruleset sets it. Seed values in the registry are unverified.
