# Handoff

Updated 2026-11-07 by S90 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- S90 is docs only. Run 41946060760 (`heavy-h3-3p`, depth 3, 256 shards, 2,200 dispatched) was **cancelled** on 7 Nov, but its merged report holds **2,076 games** (124 missing), none capped, so the 2,000-game rule is met at depth 3 (owner, 5 Nov: depth 3 alone is the measure).
- Result, dark / light / Dragon: **31.0 / 32.2 / 36.8** (intervals 29.1–33.0, 30.2–34.2, 34.8–38.9). All point scores are inside 28–38%; the Dragon's upper end is just past 38. Earlier: 150 games 33.7 / 35.3 / 31.0; 449 games 33.2 / 32.3 / 34.5. The Dragon drifts up with more games. Report: `docs/fairness/heavy-h3-3p.depth3-full.md`; comparison in decision 0023.
- The report's verdict still says "incomplete": decision 0015 (version 1) counts depths 1 and 2. A version naming depth 3 is for the owner to ask for.
- Earlier depth-3 results: `heavy-3p` 24.5 / 24.8 / 50.7; `heavy-limited-3p` 28.7 / 28.7 / 42.7; `heavy-limited3-3p` 35.6 / 41.9 / 22.5.

## Next session
**No step is planned.** Suggested: S91 — decision 0015 version 2 naming depth 3, then publish `heavy-h3-3p` per the owner's call · Haiku 5.5 · effort low (docs only), once the owner asks for it.
Why: the only open item on the full run is the measure's wording.
Start with: `/start-session S91` (the owner writes the S91 section first).

## Decisions in effect for the next step
- D82, D81, D80, D60: every 3-player ruleset stays experimental; `heavy-h3-3p` (Heads 3, Tail 8) is the default 3-player ruleset (S88).

## Open questions for the owner
- Does the 36.8% Dragon (interval to 38.9) need action, such as a Tail sweep 4 to 7 (D82 item), or is it accepted? Default: accepted, no further runs.
- Ask for decision 0015 version 2 (depth 3)? Default: not until asked.
- Carried over: alternating the turn cycle's direction, a rule for the seat before the Dragon; the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from workflow artifacts (`fairness-report-<name>`); a cancelled run still keeps its merged report, so check the game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- A new parameter makes lock tests fail until `pnpm lock add-keys <id>[@version]`; new ruleset files need `pnpm rules:index`. `pnpm worker:check` needs `pnpm build` first.
