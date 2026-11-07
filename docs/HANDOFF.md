# Handoff

Updated 2026-11-07 by S92 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- `heavy-h3-3p` is now the Candidate "Standard (3-player)" 0.1.0, locked. Its depth-3 report (2,076 games, 31.0 / 32.2 / 36.8 dark / light / Dragon) was re-rendered under decision 0015 version 2 and reads pass. Recorded in decision 0023.
- Old `standard-3p` 0.3.0 was not archived (tests, sim and saved games load it by id): renamed "Original Dragon rules", hidden.
- Home page shows only the three presets per count plus rulesets with `listed: true` (new optional ruleset field; none set; "More variants to try" is not drawn). No ids, versions or codes on any page; plain status badges (Balance-tested, In testing, Official, Yours; room card says Custom). Descriptions rewritten; `plainWords.test.tsx` guards them.
- **Browser scripts not updated:** `apps/web/scripts/e2e-3p.mjs`, `e2e-clock.mjs` and `apps/worker/scripts/e2e-browser-3p.mjs` pick cards by names with "(3-player)" and by hidden rulesets (Heavy-Handed, Light-Handed). They will fail until fixed; not run this session.

## Next session
**S93 — Retire the Tournaments page; first-visitor pass** · Sonnet 5.5 · effort medium
Why: planned next in BUILD-PLAN (D86).
Start with: `/start-session S93`

## Decisions in effect for the next step
- D86: no Tournaments page until there are players; Standard (2-player) stays a Candidate (decided).
- D84, D85: as built in S92 (defaults).

## Open questions for the owner
- None blocking S93. Provisional: the plain-words test cannot tell a lone D1–D9 or I1–I9 code from a board square, so it catches S codes and two-digit D/I codes only. Carried over: the older list (turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, `coast.openToAll`, I34 contact, favicon, Ting Yang art).

## Notes for Claude
- Fix the three browser e2e scripts (card names without the suffix; hidden rulesets need another way to open them, e.g. the rules page Play button) before relying on them.
- Reports come from workflow artifacts; restate seats as dark / light / Dragon.
- A new parameter makes lock tests fail until `pnpm lock add-keys`; new ruleset files need `pnpm rules:index`.
