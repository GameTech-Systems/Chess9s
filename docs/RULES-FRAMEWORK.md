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

Boards live in `rules/boards/` (the real board arrives in S10) and are validated by [`rules/schema/board.schema.json`](../rules/schema/board.schema.json). The format is recorded in [decision 0007](decisions/0007-board-and-piece-formats.md).

| Field | Meaning |
|---|---|
| `id`, `name`, `version` | Identity; versions follow semantic versioning |
| `squareTypes` | The kinds of special square, each with an `id` and `label` |
| `squares` | The special squares: `at` (such as `e5`), one or more `types`, an optional owning `side` and a display `label`. Unlisted squares are plain |
| `sides` | Each side's `id` and its `forward` direction: `up` (toward rank 9) or `down`. A side may have none if it holds no forward-relative pieces |
| `setups` | One start position per player count: side id, or `neutral` for unowned pieces, to square to piece id |

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

A **square rule** names a square type and says whether the piece may `stop` there (end a move on it, including a capture) or `pass` over it (cross it on the way). Both default to true. Square rules apply to the squares a move steps through, even when it jumps. A leaper's single step crosses no squares.

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

The engine checks what a schema can't: unique ids, declared square types and sides, parameter references that exist, aren't deprecated and have the right type, condition values that are options, setups that place only known pieces, and no forward-relative piece starting for a side without a forward direction. The test layout in `packages/engine/test/fixtures/` shows every field and is deliberately not the Chess Nines board.

Special rules such as en passant, castling and opening the Coast are engine features switched by parameters; the format grows to describe them as they are built. Betza notation, which the fairy-chess community already uses, may later be accepted as a shorthand that converts into this format.

## Engine requirements

- Pure TypeScript with no UI dependencies, and deterministic.
- Check and checkmate are computed from attack maps, not hardcoded per piece, because variables such as `king.range` change what counts as an attack.
- Turn order supports any number of players.
- Rulesets are validated against the schemas, and the engine also checks that each default is one of its options.
- Combinations of parameters that interact (see `affects`) are flagged for simulation before they can become a default or Official.

## Open parameters

Parameters with `needsDecision: true` have no agreed default yet. The engine must refuse to start a game that depends on one until a ruleset sets it. Seed values in the registry are unverified.
