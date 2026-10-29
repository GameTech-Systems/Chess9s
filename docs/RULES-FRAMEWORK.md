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
| `requires` | Values other parameters must have while this one takes an option: `{ option: { parameterId: value } }`. The loader refuses a ruleset that breaks one (`endings.3p` = first-checkmate needs `dragon.3p.givesCheck` on) |
| `source`, `notes` | Where the value came from, and any caveats |

Example, the King's reach: default 2 squares, with 1, 3, or 4 as options.

## Rulesets

Rulesets live in [`rules/rulesets/`](../rules/rulesets/) and are validated by [`rules/schema/ruleset.schema.json`](../rules/schema/ruleset.schema.json). A ruleset lists only the parameters it changes in `overrides`. Version numbers follow semantic versioning:

- **patch:** wording or metadata only
- **minor:** additive change that does not alter existing games
- **major:** any gameplay change

An **Official** ruleset is immutable. Any change is a new version, and the old one stays available for replays.

### Locks and kept versions (S45)

A ruleset stores only its overrides, so editing a registry default would silently change a Candidate or Official ruleset. A **lock** prevents that: `rules/locks/<id>@<version>.json` (schema `rules/schema/lock.schema.json`) holds every resolved value of one version of a Candidate or Official ruleset. A test (`packages/sim/src/locks.test.ts`) resolves each locked ruleset and fails, naming the ruleset, version and key, when a value **changed**, a key was **lost** (a parameter deprecated or removed), or a key is **new** and the lock does not record it yet. A registry default only moves the rulesets that inherit it; a ruleset that overrides the key keeps its value.

`pnpm lock` is the script (it never overwrites a lock or an archived file):

- `pnpm lock write <id>` locks the current version of a Candidate or Official ruleset.
- `pnpm lock add-keys <id>` records parameters added since the lock was written, at their current value; it refuses while any locked value differs, so recording a key never changes a locked value.
- `pnpm lock archive <id>` copies the current file to `rules/rulesets/archive/<id>@<version>.json` with status `deprecated`.

To release a new version of a Candidate or Official ruleset: run `pnpm lock archive <id>`, edit `rules/rulesets/<id>.json` (new version, new status), then `pnpm lock write <id>`. An archived version plays from its lock's values, not from today's registry, so a game recorded under it replays exactly. Engine (`resolveVersion`), sim (`rulesFor(source, id, overrides, version)`) and web (`findRuleset(id, version)`, `createRules(id, version)`) find a ruleset by id and version. The picker lists current versions only; saved games and game records may name an archived one. Every fairness report must name a ruleset version that exists in `rules/`, and a Candidate, Official or archived one must also have a lock. An Experimental version is archived without a lock unless its games or reports must replay: S68 locked the 3-player versions played before `coast.3p.exit` was built (`draft-3p` 0.3.0, `standard-3p` 0.1.0, `easy-3p` 0.1.0) at `any-legal-move`, how they played (decision 0019).

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
| `moveOnly` | `when`: while the condition holds, every move of the piece is move-only. It captures and attacks nothing (no check, it guards no square) and its capture-only moves are not played, but it still blocks lines. A Coast piece on the Coast with `coast.3p.attackFrom` = blocked (S71, decision 0020) |
| `promotion` | `to`: piece ids. Promotes on the last rank in the side's forward direction |
| `castle` | `partner` (a piece id), `steps` and `when`: castling as in chess (below) |
| `irreversible` | Its moves can't be taken back (the pawn): like a capture, a move by it restarts the fifty-move count and the repetition record |

A **move** is exactly one of:

- `directions`: `orthogonal`, `diagonal`, `forward`, `backward`, `sideways`, `forward-diagonal`, `backward-diagonal`.
- `vectors`: steps as `[files, ranks]`, with positive ranks toward the side's forward; `symmetry` is `none` (default), `mirror` (adds the left-right image) or `all` (all 8 images). `[[1, 2]]` with `all` and `range: 1` is the Knight's move.
- `targets`: square types; the piece moves straight to any square of those types, whatever stands in between.

It may also set `range` (most steps; omitted means unlimited), `jump` (may pass occupied squares; default false), `capture` (`move-or-capture`, the default, `move-only` or `capture-only`), its own `squares` rules, a `when` condition, and the two halves of en passant: `passable` (a move of more than one step that an enemy may answer on the very next turn by capturing on a square it passed) and `inPassing` (a capture-only move that may make that capture).

A **square rule** names a square type and says whether the piece may `stop` there (end a move on it, including a capture) or `pass` over it (cross it on the way). Both default to true. `pass` rules apply to the squares a sliding move steps through; a jumping move ignores them, and a leaper's single step crosses no squares. A piece-level rule may also say whether the piece is `capturable` while it stands on such a square (pawn-safe zones, capture on the Coast). Three fields narrow which squares a rule covers: `outside` (every square *not* of the type), `owner` (`own` or `other`: only squares whose `side` is the piece's own, or another side's) and `homeFile` (only squares in the file the piece started on, which the position keeps as `home`).

**Parameters** plug in two ways:

- A value may be `{ "param": "<id>" }`, read from the resolved ruleset: an integer parameter for `range`, a boolean one for `jump`, `stop`, `pass`, `capturable` and `givesCheck`, and an enumSet one for `promotion.to`.
- A move, square rule, promotion or `moveOnly` may carry `when`, which applies it only if the condition holds: `{ "param", "is" }`, `{ "param", "in" }`, `{ "param", "has" }` (for enumSet parameters), `{ "players": [3] }`, `{ "from": "<square type>" }`, `{ "firstMove": true }`, `{ "hasLeft": "<square type>" }` (the piece has moved off a square of that type onto one without it at least once: a Coast piece's first way out, S68, decision 0019), or `not`, `all` and `any` around other conditions. The game keeps what `hasLeft` reads per piece (`PlacedPiece.left`), only for the square types its own data names, and the repetition key includes it.

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

Rules that need game state, such as opening the Coast, are engine features switched by parameters; the format grows to describe the rest as they are built (S22a added en passant, castling, pawn-safe zones and the Coast's exit and capture rules). Betza notation, which the fairy-chess community already uses, may later be accepted as a shorthand that converts into this format.

## Move generation

`packages/engine/src/moves/generate.ts` turns this data into pseudo-legal moves; `check.ts` adds check and legality (next section). It has no piece-specific code. The square-rule, neutral-piece and promotion choices below are settled by `docs/decisions/rules-decisions-2026-10-19.md`.

- **Steps**: named directions and vectors are turned around for a side whose forward is `down`. A side without a forward direction may only use moves that read the same either way.
- **Range**: a move repeats its step up to `range` times along a line, or to the edge when unlimited. Each square reached is a possible destination; the earlier ones are stepped through.
- **Blocking**: without `jump`, the line ends at the first occupied square (a capture there if allowed). With `jump`, it continues past occupied squares, and each one on the way may still be captured.
- **Captures**: never your own side's pieces. Any other piece, `neutral` ones included, may be captured if the move allows captures, the piece's `capturable` flag is true and none of its `capturable` square rules covers the square it stands on (no special-casing by piece name). The Dragon Tail is not capturable by default. Stones (3-player, `PlacedPiece.stone`: a captured King's side and a checkmated Tail) never move, attack, give check or get captured, and only block (decision 0016, rule 10). `move-only` moves need an empty square; `capture-only` moves need a piece to capture.
- **Square rules**: the piece's own rules and the move's rules both apply when their `when` holds. Deny wins: any applicable `stop: false` forbids ending on that square type, and a move's own rule cannot override the piece's. The result does not depend on the order rules are evaluated. Any applicable `pass: false` ends a **sliding** line on that square: the piece may still stop there if stopping is allowed, but not continue. **Jumping moves (`jump: true`) are not affected by `pass: false`**; their `stop` rules still apply.
- **Castling** (`castle`): an unmoved piece moves `steps` squares along its rank toward an unmoved own `partner` with only empty squares between them, and the partner lands on the last square it crossed. Both must be allowed to stand on their new squares. Legal only when the side is not in check and the piece would not be in check on any square it crosses or lands on. Notation adds the partner's move: `f1-h1/i1-g1`.
- **En passant**: the game passes the squares the last `passable` move crossed; an enemy `inPassing` move may land on one of them and take the piece that passed, on that turn only (`b4xc3`).
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
- **Game status**: no legal move is checkmate when in check and stalemate otherwise; stalemate reads `draw.stalemate` (draw, loss for the stalemated side, or win for it). 3-player games judge check and game end in `game/three.ts` instead (next section): a Coast piece's flag names a 2-player parameter and is never read there.
- **Turn order** (`packages/engine/src/game/turns.ts`): the setup's `turnOrder`, rotated so that `turn.firstMove` starts where the ruleset resolves it, for any number of seats; where `turn.3p.order` resolves, its value names the whole order instead (seat ids joined by `-`, which must seat exactly the setup's sides; S71, decision 0020). `nextSide` skips seats that are out.
- **Interactions** (`packages/engine/src/rules/interactions.ts`): every pair of parameters that can vary in a game of that player count and share an `affects` system, for the simulation harness.

## Game state

`packages/engine/src/game/game.ts` keeps one game: `newGame(rules, { id, version })` returns an immutable `GameState` and `playMove(state, move)` the next one. It refuses a ruleset with an undecided value. It supplies what `legalMoves` and `gameStatus` take; 3-player games use `game/three.ts` instead.

- **Kept**: the position, the side to move, the `Lost` list per side, whether the Coast is open, each side's run of Tail moves, what may be captured in passing, the plies since the last capture or irreversible move (`quiet`), the positions since then (`seen`), the moves played (with notation) and the result. `gameRecord` returns the ruleset id and version, the turn order, the notation and the result.
- **The Coast** is closed until the Tail lands on the center square (`coast.2p.initiation = tail-to-center`; `open-at-start` starts it open) and stays open. While closed, no piece moves from or onto a `coast` square except the Tail's opening move, and the Tail may move only to the center. Coast pieces give no check while it is closed (owner, 19 Oct 2026); the opening move itself is judged with the Coast open, so it can't expose its own King.
- **The Tail** (the neutral side's piece) may be moved by whoever's turn it is, subject to `tail.repeatLimit`: a side whose latest `limit` turns were all Tail moves may not move it again (0 = no limit). The exception (docs/RULES.md): the side that opened the Coast may play E5 to I5 on its very next turn. It never captures a piece of the side moving it.
- **Lost pieces**: each capture adds the captured piece type to its side's list. A promotion removes one piece of the chosen type from the promoting side's list (provisional, docs/decisions/rules-decisions-2026-10-19.md, section 6).
- **Result**: `ongoing`; a win by checkmate (the side that moved wins); or stalemate read from `draw.stalemate` (a draw, or a win for one side). Otherwise, in this order, a draw by insufficient material (`draw.insufficientMaterial`: no piece but a royal one could give check), threefold repetition (`draw.threefoldRepetition`: the same pieces with the same rights, the same side to move, the same Coast and the same legal moves, a third time) or the fifty-move rule (`draw.fiftyMove`: 50 turns of every seat with no capture and no irreversible move). Draws are automatic, and Tail moves count as moves. Once the game is over, `legal` is empty. `unbuiltFeatures` lists the rules a ruleset has on that this game does not play yet: the Queen and pawn swap and the swapped King and Queen start. (The 3-player Coast pieces' first way out through A5, `coast.3p.exit`, was listed until S68 built it.)

### 3-player games

`packages/engine/src/game/three.ts` (S56) plays [decision 0016](decisions/0016-three-player-rules-v0.3.md) (docs/RULES.md, 3-player Dragon mode). The Kinged players are the sides with a royal piece in the 3-player setup; the Dragon is the side holding the Tail, which is its royal piece while it is active.

- **Seats**: `GameState.seats` holds each seat's status: `active`, `out` (a captured King's side, in stone; the Dragon once it is out) or `tail-stone` (the Dragon with its Tail in stone). `nextSide` skips the seats that are out.
- **Check** is per pair of attacker and King: Kinged pieces check as their data says; Dragon pieces check a King only with `dragon.3p.givesCheck`, in the first-checkmate ending, or in the duel (unless `dragon.3p.lastKing` = capture); the Tail then only with `tail.canCheck`.
- **Legal moves** leave the mover's royal piece out of check and no King in check from a seat that moves before its owner (rule 6; with `check.3p.exposedKing` = counts-as-checkmate allowed, and that King's owner loses). Each move is judged on the position after it and everything it causes: a King captured, checkmates, the Tail's swap.
- **Checkmate** is judged right after each move for every royal side but the mover's, as if it moved next (the Tail at the Dragon's turn under `tail.3p.mateTiming` = dragon-turn). When two or more pieces give check and none just moved, and the choice changes the outcome, each choice is its own move (`#<square>` in the notation); a pawn swapped onto its last rank adds `=<piece>`. Whether a checked side can escape counts its escapes' own checkmates one level deep (an engine limit).
- **Events**: a move's `events` say what it did besides moving: a King captured, the Tail in stone, the Dragon out, the Dragon's turn skipped.
- **Results**: wins add `king-capture`, `dragon-captured` and `exposed-king`; `loser` is the seat the deciding move beat. Draws name the seats that share them (`between`). Repetition counts seat statuses and stones; the fifty-move rule counts 50 turns of every seat still in the game (a skipped turn counts as one, provisional). Resigning and agreed draws are 2-player only.

## Engine requirements

- Pure TypeScript with no UI dependencies, and deterministic.
- Check and checkmate are computed from attack maps, not hardcoded per piece, because variables such as `king.range` change what counts as an attack.
- Turn order supports any number of players.
- Rulesets are validated against the schemas, and the engine also checks that each default is one of its options.
- Combinations of parameters that interact (see `affects`) are flagged for simulation before they can become a default or Official.

## Open parameters

Parameters with `needsDecision: true` have no agreed default yet. The engine must refuse to start a game that depends on one until a ruleset sets it. Seed values in the registry are unverified.
