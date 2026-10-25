# 0013: Custom rulesets built in the browser

**Status:** Accepted (S41, by the step text and D46). Applies [0011](0011-presets.md) and the governance rules for non-official rulesets.

## Decision
- **Change ruleset** (`/build`) lets a player start from a 2-player preset (Standard, Good Practice, Easy Start), change any setting, and play or save the result. Only options already in `rules/parameters.json` can be chosen; the builder adds no rules.
- A custom ruleset is status **`proposed`**, named by the player (1 to 40 characters), never official, and never a tournament ruleset (D46: a submitted ruleset becomes Official only through the S43 checklist).
- It is saved **in the player's browser only** (local storage key `chess9s.rulesets`). Nothing is sent anywhere. The privacy page names the key and its date is 25 October 2026.
- A saved ruleset is its name, the preset it started from, and its **full overrides**: every value that differs from the registry default. The game record (`GameState.ruleset`, `gameRecord`, the saved guest game and the computer's Web Worker request) carries those overrides, so a saved game replays without the preset or the ruleset being on file. A saved game loads only under the same id and the same overrides.
- Its id is `custom-<n>` and its version is `1.0.0`; a changed ruleset is told apart by its overrides, not its version.

## What the page shows
- A control per setting: switches for on/off, choices for enums, steppers for numbers, toggles for sets, grouped as on the rules page.
- `pawn.safeZones` is two switches (zones on or off; on any colored square), and `queen.canCrossVoid` and `queen.canStandOnVoid` sit side by side (S40).
- What differs from the starting preset, and a note when the build cannot play a switched-on feature yet.
- **Not fairness-checked together** (provisional reading, chosen in S41): a pair of settings is flagged when both are off the registry default, they share an `affects` system (`parameterInteractions`), and at least one differs from the starting preset. Pairs the preset itself already had are not flagged again. Every custom ruleset is unchecked regardless; the flags show where the risk is.

## Open
The flag rule above is a default reading. If the owner wants a different one (for example, flagging only pairs the sweep has not covered), say so in the ledger.

## S42 additions (provisional)

- Files and links: a ruleset file is the ruleset format with status `proposed`; on load the file's id and status are ignored. A share link is `/build#ruleset=<base64url of {n, o}>` (the plan said `/play?ruleset=`); the hash is never sent to the site.
- Invitation mail has no address and is built from the draft: link, "unofficial" note, and what differs from Standard. The tournament version says custom rulesets are not tournament rulesets (D46).
