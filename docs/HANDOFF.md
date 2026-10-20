# Handoff

Updated 2026-10-20 by S35 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. Depth 2 never needed the 100,000-position budget: on 137 positions from the S24 depth-2 games the search used at most 2,541 (0% capped), and 0 of about 10,600 moves in 24 full games ran out. S24's "shallowest depth 1" came from searches that stop on a forced mate (decision 0008 corrected, decision 0009 added).
- The search's last iteration is faster (transposition table, killers, history), and so is the move generator (`access` cached): about 30% less time per move. Results are identical wherever the S23 search finishes (`referenceBestMove`, the equivalence test, `pnpm bench`: 137/137).
- `pnpm sim --shard K/N`, `pnpm sim:merge <shards> --with <report>` and the manual **Sim depth 2** workflow are ready (merging the shards equals an unsharded run, tested). 1238 tests pass.

## Depth-2 run (owner, after merge)
- Actions tab → **Sim depth 2** → Run workflow (defaults: 20 shards, 2000 games, draft-2p). Estimate: 119 s of worker time per game here, so about 66 core-hours in all; one shard (100 games on 4 vCPUs) takes about 50 minutes, or about 1 h 45 min if runners are twice as slow. 20 shards fit easily under 6 hours each; the whole run takes about 1 to 2 hours of wall time.
- The `fairness-report-draft-2p` artifact is the full report (the depth-1 run kept from `docs/fairness/draft-2p.json`). Commit it to `docs/fairness/` in S26 or a small follow-up.

## Next session
**S25 — Mobile layout** · Sonnet 5.5 · effort medium
Why: the depth-2 run now needs only a click from the owner; S26 waits on its report.
Start with: `/start-session S25`

## Decisions in effect for the next step
- D12 → decision 0008 v2 (unchanged); decision 0009 (search speed, sharded runs). D1: pieces are unverified seeds.

## Open questions for the owner
- Start the Sim depth 2 workflow after this PR merges. Default: 20 shards, 2000 games.
- Ting Yang art (from S24): which image is the 2-player one, and should it go in `assets/`? Default: a placeholder until the owner commits the files.
- Provisional from S22a: insufficient material, automatic repetition and fifty-move draws, en passant always on, `pawn.safeZones` meaning, Coast-only `coast.2p.exit/capturable`.
- Earlier, still open:
  - The computer's heuristics and 800 nodes (S23).
  - Dark against the computer (S22).
  - Danger indicator off, undo unlimited (S20).
  - Keep `tail.2p.canCapture`.
  - A closed Coast and Kings and Queens; the opener's Tail exception.
  - 3-player check from A5.
  - The Sun and Moon promotion targets, the Tetrahedron and the 3-player Tail.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- Run the sim bundle (`packages/sim/dist/*.js`) from inside the repo: `ajv` resolves from `node_modules`. `pnpm bench` checks any later search change (0 capped at depth 2, same results as S23).
- The web search still blocks the page about 0.3 s per move: a Web Worker (S25 or S27). The web bundle includes Ajv (130 kB gzip, `new Function`): a strict CSP needs a pre-resolved ruleset (S27).
- `ci.yml` still uses v4 actions. The new workflow uses checkout v7, setup-node v7, upload-artifact v7, download-artifact v8 and pnpm/action-setup v6.
