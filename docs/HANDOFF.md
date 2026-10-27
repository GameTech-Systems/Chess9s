# Handoff

Updated 2026-10-27 by S64 (Sonnet 5.5 · medium). `/end-session` rewrites this file; keep it under 40 lines.

## State
- Phase 6: S64 is done. The builder starts from a 3-player preset (a "2 players / 3 players" switch picks the count), has a control per 3-player setting, "what differs" and interaction flags for 3 players, and says Submit is 2-player only. `endings.3p` = first-checkmate turns `dragon.3p.givesCheck` on, holds it and says why. Export, load, share links and game records carry `players`; a custom 3-player ruleset is `proposed` and browser-only.
- Code: `BuilderState.players`, `heldSettings`, `presets(players)` in `apps/web/src/game/custom.ts`; `CustomRuleset.players?`, `customFile`, `overridesOf(values, players)` in `rules.ts`; `readRulesetFile(text, registry, accept)` and `resolveFileOverrides(..., players)` in `packages/engine/src/rules/ruleset-file.ts`; share link key `p: 3`; `Builder.tsx`.
- Done-when passed: `ONLY=build node apps/web/scripts/e2e-3p.mjs` (after `pnpm build`) builds, plays with a computer Dragon, exports, loads and opens the link at desktop and Pixel 7 width; whole script and 2099 tests pass. No parameter, ruleset or lock changed.

## Next session
**S65 — Time controls for hot-seat games** · Sonnet 5.5 · effort high
Why: next in the Phase 6 order (S65, S62, S59...).
Start with: `/start-session S65`

## Decisions in effect for the next step
- D58 (untimed default; players may choose a time control, decision 0017): decided by the owner.
- D66 (running out of time: the seat is out; Show only turns it off): default, provisional.

## Open questions for the owner
- The held-setting rule is general (any `requires` in the registry): a required setting shows as fixed while its option is chosen. Say if you would rather it switch off the option.
- Carried over: Easy Start calls (S67), greedy Easy Start Dragon loses fast (S59 should report it), S54 (owner) and the S53 defaults, the draw-offer default (S51), the Discussion form prefill check, the flag rule (0013), `coast.openToAll`, the I34 contact address, the favicon and the Ting Yang art.

## Notes for Claude
- Anything that rebuilds a custom game from a ruleset reference needs `players` too (the bot worker request now carries it); `createRulesFor` passes it to `rulesWith`.
- Custom 3-player rulesets are never online (`online: false`) until S63; `settingsText` compares with Standard (3-player) for them.
- Records read `players` from the top-level record field; old custom records have it as 2.
- S63: online rooms still refuse 3-player rulesets; add resign (with `after`) to the room protocol then.
- `coast.3p.exit` (first way out through A5) is not built; `unbuiltFeatures` lists it for every 3-player game.
- Browser: `ONLY=build`, `ONLY=resign`, `ONLY=computer` run one scenario of `apps/web/scripts/e2e-3p.mjs`.
