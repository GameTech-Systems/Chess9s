# Handoff

Updated 2026-11-07 by S91 (Haiku 5.5 · low). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Decision 0015 is at **version 2** (owner request, 7 Nov): the 3-player verdict reads depth 3 alone. `MEASURES_3P` is `version: 2`, `depths: [3]`; `pnpm sim` on a 3-player ruleset plays depth 3 by default. Measures, band (28–38%), 2,000-game minimum and 5% capped flag are unchanged.
- Reports made under version 1 keep their label and verdict. `heavy-h3-3p` depth-3 reports (2,076 games: 31.0 / 32.2 / 36.8 dark / light / Dragon) are not re-rendered; a re-render under version 2 is for the owner to ask for.
- Every 3-player ruleset stays experimental (D82, D81, D80, D60). `heavy-h3-3p` (Heads 3, Tail 8) is the default 3-player ruleset (S88).

## Next session
**S92** (Sonnet 5.5 · medium): 3-player Standard and plain labels. Then S93 (retire the Tournaments page, first-visitor pass) and S94 (Coast piece art, once the owner uploads the PNGs). Planned in chat on 7 Nov; see BUILD-PLAN and D83 to D87.

## Open questions for the owner
- Carried over: alternating the turn cycle's direction, a rule for the seat before the Dragon; the S74 readings (D76.1), decision 0020 readings, the held-setting rule (S64), Easy Start calls (S67), decision 0017 clock readings, S53 defaults, the draw-offer default (S51), the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon, the Ting Yang art.

## Notes for Claude
- Reports come from workflow artifacts (`fairness-report-<name>`); a cancelled run still keeps its merged report, so check the game count.
- Report tables list seats in turn order; always restate them as dark / light / Dragon.
- A new parameter makes lock tests fail until `pnpm lock add-keys <id>[@version]`; new ruleset files need `pnpm rules:index`. `pnpm worker:check` needs `pnpm build` first.
