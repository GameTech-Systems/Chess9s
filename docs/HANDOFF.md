# Handoff

Updated 2026-10-25 by S42 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 3, testers playing (S29). S42: **Export, load and share** on `/build`. Export writes a `.json` in the ruleset format (proposed, 2 players); load takes a file (20 KB cap, strict keys, no `extends`, 2-player only, every override resolved by `resolveRuleset`, no new parameters; id and status are ignored). Share link is `/build#ruleset=<base64url {n, o}>` (hash, so no server sees it); the builder says "Unofficial" until values equal an Official ruleset (none yet). "Invite to a game/tournament" are `mailto:` drafts with no address. Checked in a real browser. 1384 tests pass. Privacy page updated.
- Standard (`standard-2p` 0.1.0) is a Candidate (S38); its 21-day discussion starts when the owner announces it.

## Next session
**S43 — Submit a ruleset for tournament consideration** · Opus 5.5 · effort medium
Why: it adds a `pnpm sim --ruleset-file` path and a governance checklist, which need design care.
Start with: `/start-session S43`

## Decisions in effect for the next step
- D43, D46 (default): custom rulesets never go straight to tournaments; Official only via the S43 checklist.

## Open questions for the owner
- Flag rule for "not fairness-checked" (decision 0013, provisional): a pair is flagged when both settings are off the registry default, share an `affects` system, and at least one differs from the starting preset. Default: keep it.
- `coast.openToAll` reading (S40): it lifts the bars on entering the Coast, not the Coast pieces' own `coast.2p.exit` and `coast.returnAllowed`, or `queen.voidCrossings`. Default: keep it.
- I34: a project contact address. Default: the privacy page points to Discussions.
- Favicon is still the empty `data:,` placeholder. Ting Yang art still open.
- Discussion for Standard: the owner announces it (Discussions post) and sets the 21-day end date.

## Notes for Claude
- S43: `game/share.ts` has `exportFile`, `parseRulesetFile` (returns a draft) and `shareLink`; reuse them for the Discussion prefill. The sim must read a file with the same strictness.
- Share link deviates from the plan's `/play?ruleset=`: it is `/build#ruleset=` (provisional: hash is private, `/build` is where the builder lives). Default: keep it.
- `queen.pawnSwap` is still unbuilt (D45). The builder lists unbuilt features it switches on.
- Web tests have no DOM (static markup only); interactions go through `builderReducer`. Playwright is installed for a real-browser check (`vite preview`, port 4173).
- Engine and sim tests still use `draft-2p`; some web tests pin `draft-2p` too.
- Labels are presentation only. A new option needs a label entry; `GROUP_ORDER` in `RulesPage.tsx` lists the groups.
- A Candidate ruleset's default must not change without a new version and a new fairness run.
- Deploys: Cloudflare Workers Builds builds `main` on each merge.
