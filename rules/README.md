# rules/

- `parameters.json`: the registry of every rule variable, with defaults and options.
- `rulesets/`: named, versioned bundles of overrides. `draft-2p.json` is the working 2-player draft and `draft-3p.json` the experimental 3-player Dragon mode.
- `schema/`: JSON Schemas that validate both.

Values follow the owner's **rule set v0.2** ([docs/RULES.md](../docs/RULES.md), decision [0006](../docs/decisions/0006-rule-set-v0.2.md)). They are draft rules, not ratified: 2-player defaults still need the fairness check, and everything is confirmed through the process in [docs/GOVERNANCE.md](../docs/GOVERNANCE.md). Values marked `seed` in `source` are unverified. See [docs/RULES-FRAMEWORK.md](../docs/RULES-FRAMEWORK.md) for how it works.
