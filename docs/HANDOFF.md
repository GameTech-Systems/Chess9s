# Handoff

Updated 2026-10-25 by S41 (Sonnet 5.5 · high). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3, testers playing (S29). S41: **Change ruleset** (`/build`). A player starts from Standard, Good Practice or Easy Start, changes any 2-player setting, sees what differs and which combinations are flagged as not fairness-checked, then saves (browser only, key `chess9s.rulesets`) and plays it. Checked in a real browser: build, play the computer, reload, ruleset and game are back. 1370 tests pass. Decision 0013.
- Custom rulesets are `proposed`, id `custom-<n>`, version `1.0.0`, and carry their full overrides in `GameState.ruleset` (new `RulesetRef` in the engine), the saved game, and the computer's worker request. Privacy page updated (25 October 2026).
- Standard (`standard-2p` 0.1.0) is a Candidate (S38); its 21-day discussion starts when the owner announces it.

## Next session
**S42 — Export, load and share a ruleset** · Sonnet 5.5 · effort medium
Why: it builds on the S41 custom-ruleset model (`game/custom.ts`); the file and link parsing is mechanical but must treat input as untrusted.
Start with: `/start-session S42`

## Decisions in effect for the next step
- D46 (default): custom rulesets never go straight to tournaments. D44, D45 applied in S40. D43 applied in S38.

## Open questions for the owner
- Flag rule for "not fairness-checked" (decision 0013, provisional): a pair is flagged when both settings are off the registry default, share an `affects` system, and at least one differs from the starting preset. Default: keep it.
- `coast.openToAll` reading (S40): it lifts the bars on entering the Coast, not the Coast pieces' own `coast.2p.exit` and `coast.returnAllowed`, or `queen.voidCrossings`. Default: keep it.
- I34: a project contact address. Default: the privacy page points to Discussions.
- Favicon is still the empty `data:,` placeholder. Ting Yang art still open.
- Discussion for Standard: the owner announces it (Discussions post) and sets the 21-day end date.

## Notes for Claude
- S42: reuse `loadCustoms`/`sound()` in `game/custom.ts` for validation (it resolves overrides with `resolveRuleset`; a file may also name a base). Export/share should write `overrides` as stored. Share link goes through the builder (`/build`) with `Builder`'s `saved`/`draft` props.
- `queen.pawnSwap` is still unbuilt (D45: a swap must not put a pawn on the Coast without a capture). The builder lists unbuilt features it switches on.
- Web tests have no DOM (static markup only); interactions are tested through `builderReducer`. Playwright is installed for a real-browser check (`vite preview`, port 4173).
- Engine and sim tests still use `draft-2p`; web tests that replay the hot-seat fixture or castle by stepping 2 squares pin `draft-2p` too.
- Labels are presentation only. A new option needs a label entry, and `GROUP_ORDER` in `RulesPage.tsx` lists the groups (the schema enum must match).
- A Candidate ruleset's default must not change without a new version and a new fairness run.
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
