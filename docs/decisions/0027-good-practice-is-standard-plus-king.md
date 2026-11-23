# 0027: Good Practice is Standard with a 2-square King

**Status:** Accepted (owner, 23 Nov 2026, in chat: "both 2 and 3 player games", option 1).

## Context
The How to play page and the rules pages say Good Practice is Standard with a King that moves 2 squares. That was true for 2 players (`draft-2p` differs from `standard-2p` only in `king.range`). For 3 players it was not: `draft-3p` 0.4.0 had every setting at its registry default, so it also differed from Standard (`heavy-h3-3p`) in `dragonHead.range`, `coast.3p.attackFrom`, `coast.3p.capturable`, `dragon.3p.defeat` and `tail.3p.stone`.

## Decision
1. `draft-3p` 0.5.0 (experimental) is `heavy-h3-3p` 0.1.0 with `king.range` = 2: the same overrides plus that one. No setting is new.
2. `draft-3p` 0.4.0 goes to the archive (deprecated, no lock: it was never a Candidate).
3. The recorded 3-player games and the browser-check games for Good Practice are recorded again under 0.5.0. Tests of single settings that used 0.4.0 as the ruleset with every setting at its default read it as `draft-3p` with no overrides.
4. The balance report of 0.4.0 no longer describes the ruleset. A short screening report for 0.5.0 replaces it; the full run (decision 0015) is still to do.

## Consequences
- The sentence "Everything else is the same as Standard (default)" is true for both player counts.
- The balance of 3-player Good Practice is untested at full size.
