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

## Built in S84
- **Parameter** `tail.3p.range` (3-player, Dragon Tail group, experimental): an enum with options `same-as-heads` (default) and 1 to 8, so `--set tail.3p.range=4` and the Builder work with plain numbers. An enum, not an integer, because a default that follows `dragonHead.range` is not one of 1 to 8; the Tail's Head-like slide in `dragon-tail.json` has one move per option (the default one reads `dragonHead.range`). Name, options and default stay provisional readings (D82 item 2). Only read while `tail.3p.movement` = like-dragon-head.
- **No ruleset changes.** Every earlier ruleset resolves to `same-as-heads`; the Tail's and Heads' legal moves were compared before and after for all 3-player rulesets and are identical. The locks of `standard-3p` 0.1.0 and 0.2.0, `draft-3p` 0.3.0 and `easy-3p` 0.1.0 gained the key at `same-as-heads` (`pnpm lock add-keys`), no locked value changed.
- **Ruleset** `heavy-h3-3p` "Heavy-Handed Dragon, Heads 3" 0.1.0, experimental: `heavy-3p` 0.1.0 + `dragonHead.range` 3 + `tail.3p.range` 8.
- **Tests:** `packages/engine/src/game/three-tail-range.test.ts` (every option with and without Tail captures, Heads and Tail independent, the default following the Heads at every range, three recorded games).
- **Screen:** depth 3, about 150 games, 30 shards, `set` `turn.3p.order=dark-light-dragon`, `label` `depth3`, dispatched after the merge (result in S85).

## Result of the first screen (S85)
`heavy-h3-3p` 0.1.0 (Heads 3, Tail 8), depth 3, 150 games, 30 shards, default turn order, run 41573587391 (all 30 shards reported, none capped): **33.7 / 35.3 / 31.0** dark / light / Dragon (95% intervals 26.6–41.6, 28.1–43.3, 24.2–38.8). All three seats are inside the 28–38% band. 46 draws (37 in the duel). Report: `docs/fairness/heavy-h3-3p.depth3.md`.

| Ruleset (depth 3) | dark | light | Dragon |
| --- | --- | --- | --- |
| `heavy-3p` | 24.5 | 24.8 | 50.7 |
| `heavy-limited-3p` (range 4) | 28.7 | 28.7 | 42.7 |
| `heavy-limited3-3p` (range 3, Tail 3) | 35.6 | 41.9 | 22.5 |
| `heavy-h3-3p` (Heads 3, Tail 8) | 33.7 | 35.3 | 31.0 |

Under item 4 the Dragon is not above the band, so the Tail sweep (4 to 7) is **skipped**. Item 5 applies instead: the next step is a confirming run of about 450 games at depth 3 on `heavy-h3-3p` before the owner decides. 150 games leave wide intervals, so this is still a screen (D60).

## Result of the confirming run (S87)
`heavy-h3-3p` 0.1.0 (Heads 3, Tail 8), depth 3, 449 games (one short of 450: a shard lost a game), 90 shards, default turn order, run 41701030465, none capped: **33.2 / 32.3 / 34.5** dark / light / Dragon (95% intervals 29.0–37.7, 28.1–36.8, 30.3–39.0). Each seat's point score is inside the 28–38% band, and the dark and light intervals lie wholly inside it; the Dragon's upper end (39.0) is just past it. 150 draws (128 in the duel). Report: `docs/fairness/heavy-h3-3p.depth3-confirm.md`.

| Ruleset (depth 3) | Games | dark | light | Dragon |
| --- | --- | --- | --- | --- |
| `heavy-h3-3p` screen (S85) | 150 | 33.7 | 35.3 | 31.0 |
| `heavy-h3-3p` confirming run | 449 | 33.2 | 32.3 | 34.5 |

The two runs agree: the seats sit within about 2 points of each other and of one third. The report's verdict is "incomplete" only because depth 3 at 449 games is below the 2,000-game rule of decision 0015, and every 3-player ruleset stays experimental (D81, D60). The decision whether to publish `heavy-h3-3p` as the Heavy-Handed default, or to keep it as a variant, is the owner's.


## Owner decision after the confirming run (S88, 4 Nov 2026)
- **`heavy-h3-3p` is the default 3-player ruleset** (`DEFAULT_3P_RULESET_ID`): it starts new 3-player games and takes the home page's first 3-player slot. It stays experimental (D60). `standard-3p` 0.3.0 stays as a ruleset under test, unchanged.
- **`tail.3p.range` is a plain integer, 1 to 8, default 8** (unlimited), not an enum. `same-as-heads` is gone, along with its Tail moves in `dragon-tail.json`.
- **Rulesets that relied on `same-as-heads`:** `heavy-limited-3p`, `heavy-limited3-3p` and `light-limited-3p` now override `tail.3p.range` to their `dragonHead.range` (4, 3, 4) so they play as before. Other rulesets have Heads 8, so the Tail is unchanged.
- **Lock exception (owner-approved):** the four locks that recorded `same-as-heads` (`standard-3p` 0.1.0 and 0.2.0, `draft-3p` 0.3.0, `easy-3p` 0.1.0) were edited by hand to 8, which plays identically (their `dragonHead.range` is 8). No other locked value changed.
