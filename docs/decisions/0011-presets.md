# 0011: Presets: Standard (the new default), Good Practice and Easy Start

**Status:** Accepted (S36, owner's playtest feedback in chat, 24 Oct 2026). Applies [0008](0008-fairness-measures.md) (ledger D12) and [0010](0010-draft-2p-candidate.md).

## Context
After playing the game, the owner found that with the King moving up to 2 squares (`king.range` = 2) checkmate is a challenge to force, which is good practice but not the game most players should start on. The owner asked for three presets in the ruleset picker.

## Decision
| Preset | Ruleset | Status | What it plays |
| --- | --- | --- | --- |
| **Standard** (default) | `standard-2p` 0.1.0 | candidate (since S38, [0012](0012-standard-2p-candidate.md)) | Good Practice, except `king.range` = 1: the King moves one square in any direction, as in regular chess |
| **Good Practice** | `draft-2p` 0.2.0 | candidate (unchanged) | Every 2-player parameter at its registry default (rule set v0.2), King range 2 |
| **Easy Start** | `easy-2p` 0.1.0 | experimental, casual play only | The closest Chess Nines gets to regular chess, chosen only among existing options (below) |

- `draft-2p` keeps its id, version, status and overrides. Only its display name and description change, so saved games, its fairness report and decision 0010 still apply.
- The registry defaults in `rules/parameters.json` don't change: `king.range` stays 2 there, and Standard overrides it. Changing a registry default would have changed `draft-2p`, which plays every default.
- The app starts new games on Standard (`DEFAULT_RULESET_ID`). The picker lists Standard first and marks it Default.
- **Easy Start** overrides: `turn.firstMove` = light (light moves first, as white does), `king.range` = 1, `castling.enabled` = true, `queen.canEnterVoid` = true (since version 0.2.0, S40: `queen.canCrossVoid` and `queen.canStandOnVoid` = true, the same moves), `pawn.safeZones` = off, `pawn.canEnterCenter` = true, `center.occupants` = any, `center.passThrough` = every piece. The Queen still never stops on e5 and never crosses it along rank 5 (her piece data), and the Coast still opens only when the Dragon Tail moves to e5. Not fairness-checked; Experimental rulesets are for casual play ([Governance](../GOVERNANCE.md)). A 100-game depth-1 screen ([docs/fairness/easy-2p.md](../fairness/easy-2p.md)) gave the first player (light) 61.0% (95% interval 51.2–70.0%): moving first looks like an advantage here, as it is in chess. Screening only; it would need the full check before Easy Start could be a Candidate.

## Fairness of Standard
Standard becomes a Candidate only when it passes decision 0008 at both depths (2,000 games each, first-player score 47–53%). Depth 1 was run in S36 and passes; depth 2 needs the manual `Sim depth 2` workflow with ruleset `standard-2p`.

| Depth | Games | First-player score (draw = half) | 95% interval | Draw rate |
| --- | --- | --- | --- | --- |
| 1 | 2,000 | 50.2% | 48.0–52.4% | 46.0% |
| 2 | not run yet | | | |

For comparison, Good Practice at depth 1: 49.0%, draw rate 40.6%. The 1-square King draws more often (repetition ended 884 of the 2,000 games). Report: [docs/fairness/standard-2p.md](../fairness/standard-2p.md). Until then it shows as Experimental, although it is the default.

## Which ruleset goes to the tournament discussion
Open (ledger). Default: once Standard passes, it becomes the Candidate for the 21-day discussion (D20) and the eventual Official 2-player ruleset; Good Practice stays a Candidate for casual and practice play.

## Rules pages
Every ruleset now has a rules page at `/rules/<id>` (for example `chess9s.com/rules/standard-2p`), built from the data: what it changes from the defaults, every setting with its value, and the pawn colors and safe zones. The "?" dialog links to the page of the ruleset being played.
