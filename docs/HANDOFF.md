# Handoff

Updated 2026-10-28 by S61 (Opus 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6 is done (S61 exit). The owner kept the three 3-player presets experimental as they are: no default changes, no 3-player Candidate. Decision 0015 is accepted unchanged (D60), and D62 to D65 are confirmed.
- `docs/fairness/standard-3p.md` now carries the S60 depth-2 run (workflow run 40617147007 on `main`, 2,000 games): dark 21.2%, light 3.0%, Dragon 75.7%, fail. At depth 1: dark 26.3%, light 38.3%, Dragon 35.4%, fail. At depth 2 the Dragon captured light's King in 1,528 games (367 at depth 1).
- 3-player reports no longer call decision 0015 provisional. The S59 and S60 reports keep the word, because they were played before S61.

## Next session
**S54 — Go live with rooms** · Owner (no Claude session)
Why: S63 (3-seat online rooms) and S66 (online clocks), the only Claude steps left outside Phase 7, both need S54. Then S63 (Sonnet 5.5 · high).
Start with: the S54 checklist in `docs/BUILD-PLAN.md` (Cloudflare dashboard, rate-limit rule, one game between two devices).

## Decisions in effect for the next step
- D50 to D54: defaults (Phase 5 rooms). D60 and D62 to D65: decided.

## Open questions for the owner
- Why light collapses at depth 2 (the rules, or the depth-2 horizon, where each seat sees only the next seat's reply) is open, and there is no step for it. Default: no step until a 3-player default change is considered; look into it first then.
- `coast.3p.exit` is still not built in any 3-player game.
- Carried over: the held-setting rule (S64), Easy Start calls (S67), the decision 0017 clock readings (S65), the S53 defaults, the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- The `Sim depth 2` workflow's merge job uploads `fairness-report-<ruleset>` but doesn't commit it. Download it with `gh api repos/gametech-systems/chess9s/actions/artifacts/<id>/zip` and commit it in the next Claude session.
- `gh api` can dispatch `Sim depth 2` on a `claude/...` branch (POST `actions/workflows/390422353/dispatches`). Depth-2 3-player games take about 580 s each on the runners.
