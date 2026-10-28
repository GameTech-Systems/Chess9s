# Handoff

Updated 2026-10-28 by S68 (Opus 5.5 · high, owner in chat). `/end-session` rewrites this file; keep it under 40 lines.

## State
- S68 built the 3-player way off the Coast (`coast.3p.exit`, [decision 0019](decisions/0019-three-player-coast-exit.md)). No 3-player game had played it: until now every Coast piece could leave the Coast anywhere from the Dragon's first turn, and in 16 of the 17 recorded end-table games the Dragon captured from the Coast, where nothing could take its piece, within its first two moves. Default now: each Coast piece's first way off is from A5; options `a5-always` and the new `any-legal-move` (how every earlier game played).
- How: square rules in the five Coast pieces' data and a new condition `hasLeft` (the game keeps `PlacedPiece.left`, in the repetition key). Registry 0.4.0. New versions `draft-3p` 0.4.0, `standard-3p` 0.2.0, `easy-3p` 0.2.0; the earlier versions are archived with locks at `any-legal-move`, so old games, room records and reports replay as played. 3-player reports renamed `<report>@<version>`.
- The computer Dragon (greedy and search) now scores bringing its pieces out through A5 (`development` in `ai/paranoid.ts`, nothing under `any-legal-move`); without it neither walked a piece out. Sun and Moon promotion is listed as not built (it never played). The recorded games (engine fixtures, the browser-check games) were recorded again; the pre-S68 ones replay under the archived versions. Rules guide: the 3-player Coast exit and Easy Start's Dragon pieces spelled out; the 3-player how-to-play says how the Dragon comes out.
- Balance on 0.2.0 is not measured yet: S69.

## Next session
**S69 — 3-player balance runs on the A5 exit** · Opus 5.5 · effort medium
Why: the 0.1.0 reports measured rules no one meant to play; the owner's 3-player decisions need the new numbers.
Start with: `/start-session S69`. Read only the S69 section of `docs/BUILD-PLAN.md` and decisions 0015 and 0019.

## Decisions in effect for the next step
- Decision 0019 (owner, 28 Oct 2026): the A5 exit as written is the 3-player default; `any-legal-move` is an option. D60 (decision 0015) measures, unchanged.

## Open questions for the owner
- Easy Start keeps the A5 exit, as written (it sets no other value). Default: keep it.
- Why light collapsed at depth 2 in the 0.1.0 runs: S69 compares with the new runs.
- Carried over: the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65/S66), the S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Pass the rules to `applyMove(position, move, rules)`, or a piece's `left` is not recorded. A Coast piece placed by hand on file A without `left: ['coast']` has not left the Coast yet, so under the default it moves off only from A5.
- The `Sim depth 2` merge adds an earlier `docs/fairness/<name>.json` and refuses one of another version; the 3-player ones are now `<name>@<version>`, so S69's runs start fresh.
- `pnpm bench --players 3 --make` remade `packages/sim/bench/positions-3p.json` for `standard-3p` 0.2.0.
