# rules/

- `parameters.json`: the registry of every rule variable, with defaults and options.
- `rulesets/`: named, versioned bundles of overrides. `draft-2p.json` is the 2-player Candidate and `draft-3p.json` the experimental 3-player Dragon mode.
- `boards/`: the board layout (`standard-9x9.json`). `pieces/`: one file per piece. Both are unverified seeds entered in S10.
- `schema/`: JSON Schemas that validate all of them.

Values follow the owner's **rule set v0.2** ([docs/RULES.md](../docs/RULES.md), decision [0006](../docs/decisions/0006-rule-set-v0.2.md)). They are draft rules, not ratified: 2-player defaults still need the fairness check, and everything is confirmed through the process in [docs/GOVERNANCE.md](../docs/GOVERNANCE.md). Values marked `seed` in `source` are unverified. See [docs/RULES-FRAMEWORK.md](../docs/RULES-FRAMEWORK.md) for how it works.
