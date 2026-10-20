# 0009: Search speed and sharded fairness runs

**Status:** Accepted (S35, owner's brief). The measures and thresholds of [0008](0008-fairness-measures.md) (D12) don't change. This record covers how the depth-2 run is made cheap enough to play.

## Context
S24 estimated 2,000 depth-2 games at about 32 hours on 4 cores. It also concluded that the 100,000-position budget per move doesn't always let depth 2 finish, because its report showed a shallowest finished search of depth 1. S26 can't publish a Candidate without a clean depth-2 run.

## What the benchmark showed
- `pnpm bench` searches a fixed set of positions (`packages/sim/bench/positions.json`) and reports positions per move, the share of moves that hit the budget, and time per move. It compares the current search with the S23 search, which is kept as `referenceBestMove`.
- The positions are 137 positions from the depth-2 self-play games with seeds 1–8, under the 0008 settings. These are the same games S24's depth-2 run played: ply 8, then every 24th ply. The sampler would also have kept every position where the search ran out of positions; there were none.
- **The budget was never the problem.** At depth 2 the S23 search used at most 2,541 of the 100,000 positions on these 137 positions, and 716 on average. In 24 full depth-2 games (about 10,600 searched moves) no move ran out. The depth 1 in S24's report came from searches that stop once they find a forced mate, which happens at the end of every checkmate game. Reports now count the moves the budget cut short (`capped`) separately from the shallowest depth.
- What made the run long was the time per position: about 0.5 ms per `playMove`, most of it in the move generator (`walk`, the square rules in `access`, legality).

| Depth 2, 137 positions | Positions per move: mean | 95th percentile | max | Capped | ms per move |
| --- | --- | --- | --- | --- | --- |
| S23 search, S24 move generator | 716 | 1,802 | 2,541 | 0 | 326 |
| S23 search, S35 move generator | 716 | 1,802 | 2,541 | 0 | 244 |
| S35 search, S35 move generator | 640 | 1,506 | 2,456 | 0 | 223 |

Times are from a 4-core cloud container, from `pnpm bench` runs in S35. The first row was measured before the move-generator change, the other two in the final run. All in all, a move takes about 30% less time than with S24's code. `docs/benchmarks/search-depth2.md` has the full table. `search-depth1.md` has depth 1, where both searches visit the same 86 positions per move on average and take about the same time (28 and 30 ms).

## Changes
- **The last iteration searches faster.** It gets a transposition table, killer moves and a history table. These change only the order moves are tried in and which subtrees are skipped, so every score at the root stays exact (alpha-beta's guarantee). That means the same best score and the same set of equal-best moves. Earlier iterations of the iterative deepening search exactly as S23 did, because their scores, bounds included, set the root order in which equal moves are listed for the seeded tie-break. Result: wherever the S23 search finishes, the new search returns the same move, score and depth (`search-equivalence.test.ts`, and the benchmark's comparison: 137 of 137). Wherever the S23 search would run out in its last iteration, the new one may finish. The web bot (depth 6, 800 positions) rarely reaches its last iteration and plays as before.
- **Transposition-table key.** The table is built fresh for each search. It is used only for states reached by a capture or an irreversible move: there no earlier position can repeat and the fifty-move count is 0, so how the state plays out depends on nothing before it. The key holds:
  - the ruleset's id and version, and every resolved parameter value (a superset of those that change move generation);
  - the repetition key (side to move, Coast, each piece with the rights it carries, the legal moves);
  - the pieces each side has lost, the Tail's runs and bonus, and what may be captured in passing;
  - the ply and the depth left.
- **The move generator works out each piece's stop and pass squares once per situation** (`access`, cached by piece, move, square types, moved flag, side and home square), and looks coordinates up instead of building them. This saves about 20% of the time per position (295 → 232 ms per move, measured back to back). Every engine test passes unchanged.
- The node budget (100,000) and the evaluation don't change.

## Sharded runs
- `pnpm sim --shard K/N` plays shard K of N: game i of each run (seed + i) belongs to shard (i mod N) + 1. Interleaving spreads long and short games evenly, and the N shards together play every game exactly once. A shard writes `<name>.shard-K-of-N.json` with every game's summary, because the report needs all the games (the median length, the distinct-game count).
- `pnpm sim:merge <files or directories> [--with <report>]` checks that the shards come from one run (ruleset, overrides, measures version, games, seed, budget) and that none appears twice. It then builds the standard JSON and Markdown report with the 0008 code. Missing shards are named, and their games left out, so the run counts fewer games and is flagged `too few games`. `--with` keeps the runs of an earlier report that the shards didn't play, such as the 2,000-game depth-1 run, so the verdict covers both depths. A test checks that 3 merged shards give the same report as one unsharded run.
- `.github/workflows/sim-depth2.yml` (**Sim depth 2**, started by hand only):
  - Inputs: shard count (default 20), games (default 2000) and ruleset.
  - One `ubuntu-latest` job per shard. Each plays its games at depth 2 on the runner's 4 vCPUs and uploads its shard file as an artifact.
  - The games stop at 5 h 40 min (`timeout -s INT`) and keep what they played, and the job limit is 5 h 55 min, under GitHub's 6-hour limit.
  - A merge job then builds the report with `--with docs/fairness/<ruleset>.json`, uploads it as the `fairness-report-<ruleset>` artifact, and shows it in the run summary.
- The depth-1 run in `docs/fairness/draft-2p.json` stays valid: at depth 1 the new search gives the same results as the S23 search wherever it finishes (`search-depth1.md`).

## Estimate for the depth-2 run (20 shards)
- Measured here: 24 depth-2 games on 4 workers took 119 s of worker time per game (440 plies on average, longest 1,098), so 2,000 games take about **66 core-hours**. S24 reported 234 s per game for the same games. The new code accounts for about 30% less time per move on the benchmark; the rest of the gap is probably the machine, so per-game times are only comparable on one machine.
- One shard is 100 games, 25 per vCPU: about **50 minutes** at this container's speed. With a factor of 2 for slower runner cores, it is about 1 h 45 min, well under the 6-hour limit. With 20 jobs running at once (the free plan's limit), the whole run takes about **1–2 hours** of wall time and about 66–130 runner-hours, which is free for a public repository.
- Even at 4 times slower, one shard would take about 3 h 30 min, so 20 shards fit. Fewer shards also fit: 10 shards (200 games each) take about 1 h 40 min at this speed, and 3 h 20 min at twice as slow.

## Consequences
- The owner starts the run from the Actions tab after merge. The merged report replaces `docs/fairness/draft-2p.{json,md}` in a later step (S26 or a small follow-up), with the run's link.
- `pnpm bench` is the check before any later change to the search: 0 capped at depth 2, and the same results as the S23 search.
