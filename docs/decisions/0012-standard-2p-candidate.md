# 0012: Publish `standard-2p` 0.1.0 as a Candidate

**Status:** Accepted (S38, by the default in D43 and the S38 step). Applies [0008](0008-fairness-measures.md) (ledger D12), [0009](0009-search-speed-and-sharded-runs.md) and [0010](0010-draft-2p-candidate.md). The presets are in [0011](0011-presets.md).

## Decision
Ruleset `standard-2p` version 0.1.0 (shown as **Standard**) moves from `experimental` to `candidate`, with its id, version and every parameter unchanged. Per D43 it is the ruleset for the tournament discussion; Good Practice (`draft-2p`) stays a Candidate for practice play. The 21-day public discussion (D20) for Standard starts when this change merges. Ratification as an Official ruleset needs the owner's decision record after that period; any change to a default before then means a new version and a new fairness run.

## Evidence
Report: [docs/fairness/standard-2p.md](../fairness/standard-2p.md) (the manual `Sim depth 2` workflow, run 40160799287, merged from 20 shards; the depth-1 run from S36 is kept).

| Depth | Games | First-player score (draw = half) | 95% interval | Draw rate |
| --- | --- | --- | --- | --- |
| 1 | 2,000 | 50.2% | 48.0–52.4% | 46.0% |
| 2 | 2,000 | 50.1% | 47.9–52.3% | 10.7% |

Both intervals lie inside the 47–53% band, so the verdict is **pass**. At depth 2 no move hit the node budget.

The run used the S36 commit. S40 has since added options (`queen.canCrossVoid`, `queen.canStandOnVoid`, `pawn.canEnterCoast`, `coast.openToAll`), all off by default, so Standard's moves are unchanged.

## Alternatives considered
- Waiting for a human playtest report first: not chosen. D43 says to publish once both depths pass; the discussion period is where playtest reports belong.

## Limits
- The sweep (`standard-2p-sweep`) is screening only (40 games per combination, depth 1) and says nothing about non-default options.
- Bot self-play measures fairness for the search used, not for human play.
