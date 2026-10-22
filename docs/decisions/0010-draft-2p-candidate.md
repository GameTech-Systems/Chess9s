# 0010: Publish `draft-2p` 0.2.0 as a Candidate

**Status:** Accepted (S26, owner's go-ahead in chat). Applies [0008](0008-fairness-measures.md) (ledger D12) and [0009](0009-search-speed-and-sharded-runs.md).

## Decision
Ruleset `draft-2p` version 0.2.0 moves from `proposed` to `candidate`, with its id, version and every parameter unchanged. The 21-day public discussion (D20) starts when this change merges. Ratification as an Official ruleset needs the owner's decision record after that period; any change to a default before then means a new version and a new fairness run.

## Evidence
Report: [docs/fairness/draft-2p.md](../fairness/draft-2p.md) (the manual `Sim depth 2` workflow, run 39409835954, merged from 20 shards).

| Depth | Games | First-player score (draw = half) | 95% interval | Draw rate |
| --- | --- | --- | --- | --- |
| 1 | 2,000 | 49.0% | 46.8–51.2% | 40.6% |
| 2 | 2,000 | 49.3% | 47.1–51.4% | 33.7% |

Both intervals lie inside the 47–53% band, so the verdict is **pass**. At depth 2 no move hit the node budget.

## Alternatives considered
- Changing a default before publishing (for example the provisional S22a rules): not chosen. It would need a new 4,000-game run, and the owner wanted the current defaults published.
- Renaming the ruleset: not chosen. The name now reads "Draft 2-Player (Candidate)".

## Limits
- The sweep (`draft-2p-sweep`) is screening only (40 games per combination) and says nothing about non-default options.
- Bot self-play measures fairness for the search used, not for human play. The discussion period is the place for playtest reports.
