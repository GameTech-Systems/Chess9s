# 0023: Depth 3 measure, Tail range and the next screens (3-player)

**Status:** Accepted (owner in chat, 2 Nov 2026, after reading the S82 screens; D82). Recorded in S83. The parameter and ruleset are built in S84.

## Context
The S82 screens ([decision 0022](0022-limited-dragon.md)) show range 4 leaves the Dragon above the band at depth 3 and range 3 overshoots below it. The Heads and the Tail share `dragonHead.range`, so one number cannot tune both.

## D82
1. **Balance measure.** Depth 3 is the 3-player balance measure, against [decision 0015](0015-three-player-balance-measures.md). 3-player rulesets are no longer screened at depths 1 and 2. This closes the carried-over question "balance measure at depth 3 or higher". **(owner)** Depth 3 runs are still screens until a ruleset has a full run (D60).
2. **Tail range.** The Tail gets its own range, separate from the Heads. **(owner,** option 1**)** Reading (provisional): a new parameter `tail.3p.range`, options 1 to 8 like `dragonHead.range`, default "same as `dragonHead.range`", so no existing ruleset changes. The name is proposed; S84 may change it before it ships.
3. **First screen.** `heavy-h3-3p` "Heavy-Handed Dragon, Heads 3": experimental, on `heavy-3p` 0.1.0, with `dragonHead.range` 3 and `tail.3p.range` 8 (max). **(owner)** The owner's ideal is that this balances at depth 3, so the Heads' limit is the only one players have to learn.
4. **Tail sweep.** If the Dragon screens above the 28-38% band with the Tail at 8, screen the Tail at 4, 5, 6 and 7 with the Heads at 3. **(owner)** Reading: run it with the Sim workflow's `set` override (`tail.3p.range=N`) on `heavy-h3-3p`, not as new ruleset files; only the range that is kept gets its own file. If the Dragon is below the band with the Tail at 8, a shorter Tail can only weaken it further, so the sweep is skipped and the owner reviews.
5. **Game counts** (provisional default). Each screen: about 150 games at depth 3, default turn order, 30 shards, as in S81. The best result then gets a confirming run of about 450 games before the owner decides.
6. **Capture range.** Every Dragon piece captures as far as it moves. A separate capture range is rejected. **(owner)**
7. **Dragon first.** Turn order with the Dragon first stays a player option for casual play, not for official play. It is a fallback only if the Tail screens miss. **(owner)**
8. **Held in reserve, not built.** Other limits on top of range 4 (a "waking" Dragon, limits on the Sun or Moon). **(owner)**
9. **Light-Handed dropped from simulations.** `light-3p` and `light-limited-3p` stay in the registry and the browser as experimental rulesets; nothing is deleted. **(owner)**
10. Every 3-player ruleset stays experimental (D60).

## Plan
- S84: build `tail.3p.range` and `heavy-h3-3p` with tests and RULES.md; dispatch the Tail-8 depth-3 screen after the merge.
- S85: collect that screen; dispatch the sweep if item 4 applies.
