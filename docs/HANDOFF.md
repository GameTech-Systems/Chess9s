# Handoff

Updated 2026-10-20 by S25 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 2. The web app has a phone layout (at 700px and narrower): status line and promotion choice above a full-width board, controls 44px tall, `touch-action: manipulation`, safe-area padding. Checked in Chromium with Pixel 7 emulation: touch play against the computer, no horizontal scroll, no errors.
- The computer's search runs in a Web Worker (`bot.worker.ts`, `botClient.ts`; `computerReply` replays move notations). Without a Worker it searches on the page's thread. A reply took about 1 s on this machine. 1240 tests pass.
- Not checked: a real phone, landscape phones (board is height-limited there), pinch zoom.

## Depth-2 run (owner)
- Actions tab → **Sim depth 2** → Run workflow (defaults: 20 shards, 2000 games, draft-2p). About 1 to 2 hours of wall time. S26 waits on its `fairness-report-draft-2p` artifact; commit it to `docs/fairness/`.

## Next session
**S27 — Deploy** · Sonnet 5.5 · effort medium
Why: S26 is an owner chat that needs the depth-2 report; S27 does not depend on it.
Start with: `/start-session S27`

## Decisions in effect for the next step
- D15: Cloudflare Workers with Static Assets (default). Decision 0009 (search, sharded runs). D1: pieces are unverified seeds.

## Open questions for the owner
- Start the Sim depth 2 workflow. Default: 20 shards, 2000 games.
- Ting Yang art (from S24): which image is the 2-player one, and should it go in `assets/`? Default: a placeholder.
- Provisional from S22a: insufficient material, automatic repetition and fifty-move draws, en passant always on, `pawn.safeZones` meaning, Coast-only `coast.2p.exit/capturable`.
- Earlier, still open:
  - The computer's heuristics and 800 nodes (S23). Dark against the computer (S22).
  - Danger indicator off, undo unlimited (S20). Keep `tail.2p.canCapture`.
  - A closed Coast and Kings and Queens; the opener's Tail exception.
  - 3-player check from A5; the Sun and Moon promotion targets, the Tetrahedron and the 3-player Tail.

## Notes for Claude
- `scripts/claude/ship.sh` opens and merges PRs (`gh pr` fails in cloud sessions).
- The web bundle includes Ajv (130 kB gzip, `new Function`) and the worker bundle too (230 kB): a strict CSP needs a pre-resolved ruleset (S27), and the CSP must allow `worker-src 'self'`.
- Playwright is at `/opt/node-tools/node_modules/playwright-core`, not in the repo; Chromium at `/opt/pw-browsers/chromium`.
- `ci.yml` still uses v4 actions.
