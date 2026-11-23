# Handoff

Updated 2026-11-22 by S98 (Opus 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 7. Gate 1 is settled: S2 confirmed by the owner; D96 checked on chess9s.com (the bindings answer 429 after 60 room-info requests from one address) and the dashboard rate-limit rule is in place; Workers Logs is off; D95 lists GameTypeBrand@gmail.com in `security.txt` and SECURITY.md; the owner approved the "about 50%" wording.
- D7 changed (record 0026): `scripts/claude/ship.sh` now fast-forwards `main` and waits for CI there; if GitHub refuses the push it falls back to a PR. Until the owner adds Repository admin to the `main` ruleset's bypass list, pushes fall back to PRs.
- The footer Feedback link and the post drafts point at the playtest-feedback Discussions category.
- Good Practice (3-player) is now `draft-3p` 0.5.0: Standard plus a 2-square King (record 0027; 0.4.0 archived). Its balance report is a 40-game screening only; the full run (decision 0015) is still to do.
- Typecheck, lint, validate:rules and build are green; 3,074 tests pass.

## Next session
**S99 — Soft-launch fixes** · Sonnet 5.5 · effort medium
Why: no testers yet; S99 starts once the soft launch (S29) has reports to fix.
Start with: `/start-session S99`

## Decisions in effect for the next step
- D97: keep the room and socket limits (default); change them only if testers see "Too many requests".
- D7: ship straight to `main` after local checks (decided). D94: no analytics (decided).

## Open questions for the owner
- Add the Repository admin bypass to the `main` ruleset (Settings → Rules → Rulesets → main → Bypass list → Always allow).
- Delete the old branch `claude/hopeful-feynman-1s0wcg` (the Branches page, trash icon).
- Pin the feedback post in playtest-feedback; recruit testers (S29) by the `docs/LAUNCH.md` quotas.
- Still to approve before S100: the press page contact line and the post drafts' wording.
- Carried over: OpenRouter credits, turn-cycle direction, S74/0020 readings, held-setting rule, Easy Start calls, clock readings, S53 defaults, draw-offer default, flag rule, favicon, Ting Yang art, the "hollow tetrahedral bases" line, larger source PNGs, security.txt renewal before 2027-11-01, D10 vs the pinned Sonnet.

## Notes for Claude
- Read `docs/decisions/LEDGER-SNAPSHOT.md` for decisions; its precedence line says what wins.
- Run all four checks before `ship.sh`: CI on `main` runs after the push. Fix a red `main` forward.
- workerd refuses a number (or string) export from `apps/worker/src/index.ts`; a test checks it.
- Pages that render the app in tests need `beforeAll(preloadPages)`; add new on-demand pages to `ON_DEMAND`.
