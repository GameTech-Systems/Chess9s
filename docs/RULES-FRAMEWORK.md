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

## New movement as data

New piece movement is proposed as data, not code. A small structured description covers directions, range, jumping, capture mode, and restricted squares. Betza notation, which the fairy-chess community already uses, may be accepted as a shorthand. Sketch only; the final format is defined in Phase 1:

```json
{
  "piece": "example",
  "moves": [
    { "directions": ["orthogonal"], "range": 2, "canJump": false, "capture": "replace" }
  ]
}
```

## Engine requirements

- Pure TypeScript with no UI dependencies, and deterministic.
- Check and checkmate are computed from attack maps, not hardcoded per piece, because variables such as `king.range` change what counts as an attack.
- Turn order supports any number of players.
- Rulesets are validated against the schemas, and the engine also checks that each default is one of its options.
- Combinations of parameters that interact (see `affects`) are flagged for simulation before they can become a default or Official.

## Open parameters

Parameters with `needsDecision: true` have no agreed default yet. The engine must refuse to start a game that depends on one until a ruleset sets it. Seed values in the registry are unverified.
