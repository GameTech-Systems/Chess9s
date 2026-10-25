---
paths:
  - "rules/**"
---

# Rules data

- Validate every change against `rules/schema/`. Every default must be one of its options.
- Never edit a ruleset whose status is `official`. Create a new version instead (semantic versioning, see `docs/RULES-FRAMEWORK.md`).
- A Candidate or Official ruleset has a lock in `rules/locks/`. A test fails when its values change; never edit a lock by hand. A new version goes through `pnpm lock archive <id>`, then the edit, then `pnpm lock write <id>`; new parameters are recorded with `pnpm lock add-keys <id>`.
- Seed and provisional values say so in `source` or `notes`.
- New parameters, options, pieces, or squares come only from the owner (see `/new-parameter`). Don't add options that nobody asked for.
- A change to a default needs an owner decision, and 2-player defaults need a fairness check before they become Candidate.
