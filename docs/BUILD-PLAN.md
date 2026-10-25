# Build plan (Claude Code)

This is the step-by-step plan Claude Code executes. Each step is one session and one pull request. Steps marked **Owner** are done by the project owner, sometimes with Claude in chat. Some owner steps are tracked privately and only their ids appear here.

Status values: `todo`, `doing`, `done`, `blocked`. `/end-session` updates the status of its step.

## How a session runs

1. The owner opens a new Claude Code session on this repo (claude.ai/code), sets the model and effort the step recommends, and sends `/start-session S<n>`, optionally followed by a brief pasted from the ledger.
2. Claude reads `docs/HANDOFF.md` (loaded automatically) and only this file's section for the step.
3. Claude plans, writes failing tests, implements, and commits after each green task.
4. `/end-session` runs the checks, rewrites the handoff, logs the session, ships the PR (opens, waits for CI, merges), and ends with the next-session recommendation and a `ledger-sync` block for the owner's ledger.

## Model and effort guide (Pro plan)

| Use | Model · effort | Typical steps |
|---|---|---|
| Docs-only, renames, config | Haiku 5.5 · low | small follow-ups |
| Normal implementation with clear specs | Sonnet 5.5 · medium | scaffold, UI, loader |
| Many parameters and edge cases | Sonnet 5.5 · high | piece batches |
| Design and correctness-critical logic | Opus 5.5 · high | data formats, move generator, check detection, search AI, simulation |
| Stuck after one failed attempt | raise effort one level, or Sonnet → Opus | any |

Sonnet 5.5 is pinned as the project default in `.claude/settings.json` (decision D10). Opus steps need `/model opus` at the start of the session. Fable is not used: it can bill usage credits. Avoid `max` effort except for a one-off hard bug.

**Token habits.** One step per session; start a new session for the next step (cloud sessions have no `/clear`). Set model and effort before the first message, not mid-session. Read only the files the step needs. Run targeted tests while working (`pnpm vitest run <file>`) and the full suite once at the end. Use `/compact` with a focus note if the context grows. Start Opus steps at the beginning of a fresh usage window. Avoid subagents unless a search is broad.

## Phase 0: Foundation

### S1 — Audit and session system · Owner with Claude in chat · Opus 5.5 · high · `done`
Audit the foundation against the master plan, install the session system (handoff, log, start/end skills, ship script, path-scoped rules, model default), and set up the owner's ledger.

### S2 — GitHub repository settings · Owner · `todo`
Turn on secret scanning with push protection, Dependabot alerts, private vulnerability reporting, and "Automatically delete head branches". Delete the merged branch `claude/hopeful-feynman-1s0wcg`. Confirm the Claude GitHub App is installed on this repo.
Done when: Settings → Advanced Security shows all three on, and the stale branch is gone.

### S3 — Owner task (tracked privately) · `todo`

### S4 — Approve the plan changes · Owner with Claude in chat · `todo`
Review the ledger, settle or accept defaults for D13, D14 and D17, and apply small doc edits that follow from them.

### S5 — Discussions · Owner · `todo`
Per D11: enable Discussions and create categories with slugs `rule-proposals` and `playtest-feedback` (the discussion templates depend on those slugs).

### S6 — Domains · Owner · `todo`
Point chess9s.com and chessnines.com at Cloudflare DNS, and set up a project contact address with Cloudflare Email Routing. Phase 0 exit.

## Phase 1: Engine and board

### S7 — Workspace, CI, and branch rules · Sonnet 5.5 · medium · `done`
Scaffold the pnpm workspace: `packages/engine` (pure TypeScript, no DOM), `apps/web` (Vite + React), shared strict tsconfig, Vitest, ESLint, Prettier. Root scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `validate:rules` (Ajv validation of `rules/` against its schemas). Add `.github/workflows/ci.yml` (one job named `ci`: install, typecheck, lint, test, validate:rules) and pin Node 22 and pnpm in `package.json`. Write the commands into CLAUDE.md. Create the issue labels the templates use (`rule-proposal`, `movement-proposal`, `balance-report`, `playtest`) with `gh api`. Prepare `.github/rulesets/main.json` per D7 and apply it with `gh api` if permitted; otherwise leave the import steps for the owner in the handoff.
Pre-approved dependencies (D21): typescript, vite, react, react-dom, @vitejs/plugin-react, vitest, eslint, typescript-eslint, prettier, ajv, ajv-formats.
Done when: CI passes on the PR, `pnpm dev` serves a blank app shell, and `validate:rules` passes.
Decisions: D7, D8, D10, D21.

### S8 — Rules loader and registry fixes · Sonnet 5.5 · medium · `done`
In `packages/engine`: load `parameters.json` and a ruleset, validate both against the schemas, check every default is one of its options, apply overrides, and refuse to start a game that depends on a parameter whose resolved value is still null. The registry fixes from D2, D3, D5 and D6 already landed with rule set v0.2 (`docs/RULES.md`); deprecated parameters must load but never resolve into a new game. Tests: every parameter at its default and every option resolves correctly.
Done when: loader tests pass and the draft ruleset resolves with no null values for 2-player.
Decisions: D2, D3, D5, D6.

### S9 — Board and piece data formats · Opus 5.5 · high · `done`
Design `rules/schema/board.schema.json` (coordinates a–i and 1–9, square types such as void and gateway, start position by side) and `rules/schema/piece.schema.json` (movement as data: directions, range, jumping, capture mode, restricted squares; Betza shorthand optional later). Add a neutral test layout in `packages/engine/test/fixtures/` that is clearly not the real board. Write a decision record for the formats.
Done when: schemas validate the fixture and the formats are documented in `docs/RULES-FRAMEWORK.md`.
Decisions: D1.

### S10 — Enter the real board and pieces · Owner with Claude in chat · `done`
The owner provides the board layout, special squares, starting position, and piece list from the original design. Claude converts them into `rules/boards/standard-9x9.json` and `rules/pieces/`, marked as unverified seeds, and opens a PR.
Done when: the data validates against the S9 schemas.
Decisions: D1.

### S11 — Move generator · Opus 5.5 · high · `done`
Generic pseudo-legal move generation from piece movement data and board data: directions, range, jumping, capture modes, restricted squares, gateways. Deterministic. No piece-specific code paths.
Done when: fixture positions produce exactly the expected move lists.

### S12 — Board renderer · Sonnet 5.5 · medium · `done`
In `apps/web`: render the 9×9 board from board data with every special square type, coordinates, and placeholder piece shapes (letters or simple shapes, no art). Responsive square sizing.
Done when: the real board (or the fixture, if S10 isn't done) renders on desktop and phone widths.

### S13 — Pieces, batch 1: King and the standard-movement pieces · Sonnet 5.5 · high · `done`
Implement through data and parameters: `king.range`, `king.canJump`, and the pieces from S10 whose movement needs no special squares. Tests at every option.
Decisions: D1.

### S14 — Pieces, batch 2: Queen and Pawn · Sonnet 5.5 · high · `done`
`queen.canEnterVoid`, `queen.enemyTerritoryEntry` (gateways), `pawn.initialDoubleStep`, `pawn.promotion.targets`. Tests at every option.
Decisions: D2.

### S15 — Pieces, batch 3: Sun and Moon pawns and Dragons in 2-player · Sonnet 5.5 · high · `done`
`sunMoon.range`, `sunMoon.canPromote`, the Sun and Moon capture rule, and `dragons.2p.mode` (blocking or removed). Tests at every option.
Decisions: D3, D6.

### S16 — Attack maps, check, checkmate, stalemate · Opus 5.5 · high · `done`
Attack maps computed from the same movement data (never hardcoded), check detection, legal-move filtering, checkmate, and `draw.stalemate`. Flag parameter combinations whose `affects` overlap so the simulation harness can test them later. N-player-ready turn order.
Done when: the check and mate fixture suite passes at every king.range option.

### S17 — Hot-seat game · Sonnet 5.5 · medium · `done`
Select a piece, show legal moves, move, alternate turns, detect game end, and record the ruleset id and version with the game. Phase 1 exit.
Done when: a full 2-player hot-seat game runs in the browser with legal-move highlighting.

### S18 — Phase 1 review · Opus 5.5 · medium · `done`
Run everything, fix rough edges, remove dead code, update docs, and propose any changes to Phase 2 steps in the handoff. The owner reviews the master plan.

## Phase 2: Playable product

### S19 — Rule picker · Sonnet 5.5 · medium · `done`
Pick a ruleset before a game, with status badges (proposed, experimental, candidate, official).

### S20 — Play aids, part 1 · Sonnet 5.5 · medium · `done`
Show-legal-moves toggle (on by default), last-move highlight, undo (disabled in online play later), pieces-in-danger indicator.

### S21 — Play aids, part 2 · Sonnet 5.5 · low · `done`
Sound with an on/off toggle (knock on move, chime on your turn, CC0 sounds only, credited in NOTICE), a rules screen opened from a "?" button, and an elapsed-time display (not a chess clock).

### S22 — Computer opponent v0 and guest play · Sonnet 5.5 · low · `done`
A random legal mover, and play without an account (state kept in the browser).

### S22a — Missing 2-player rules · Opus 5.5 · high · `done`
Inserted before S23 by the owner (plan review, 2026-10-19), so bot self-play can end. Engine rules still missing for 2-player: threefold repetition, 50-move rule, insufficient material, castling, en passant, pawn safe zones, and the owner-listed Coast rules. Each is data-driven: a parameter in `rules/parameters.json` with tests at its default and every option. Take any rule the rules documents and decisions do not specify to the handoff as an owner question; do not invent it. Id `S22a` avoids renumbering S23 onward.

### S23 — Computer opponent v1 · Opus 5.5 · high · `done`
A search AI built on our own engine (for example negamax with alpha-beta and a ruleset-aware evaluation), so it respects whichever ruleset is selected. No GPL engines.

### S24 — Simulation harness and fairness report · Opus 5.5 · high · `done`
`packages/sim`: bot self-play from both sides, reports in JSON and Markdown (side scores, draw rate, game length, flagged parameter combinations). The measures and thresholds from D12 are committed as a decision record before any run.
Decisions: D12.

### S35 — Faster search and sharded depth-2 run · Opus 5.5 · high · `done`
Added before S26 at the owner's request. A search benchmark (positions per move, share that hit the 100,000 cap), a faster search with the same results wherever the S23 search finishes, `pnpm sim --shard K/N` and `pnpm sim:merge`, and a manual `Sim depth 2` workflow on GitHub-hosted runners. The D12 thresholds don't change.
Decisions: D12 (decision 0008), decision 0009.

### S25 — Mobile layout · Sonnet 5.5 · medium · `done`
Responsive layout and touch input. Done when a full game against the computer works in a phone browser.

### S26 — Candidate 2-player ruleset · Owner with Claude in chat · `done`
Review the fairness evidence, settle the draft defaults, and publish the default 2-player ruleset as a Candidate with its evidence. Phase 2 exit.

## Phase 3: Public launch

### S27 — Deploy · Sonnet 5.5 · medium · `done`
Deploy the static app per D15 at chess9s.com, add a privacy policy page, an error screen instead of blank pages, and a "Suggest a variant" link to Discussions. Built as the repo side only (`wrangler.jsonc`, `_headers`, strict CSP); the owner connects the repo and domain in the Cloudflare dashboard (settings in `docs/HANDOFF.md`). Not announced: S26 and S29 come first.

### S28 — Owner task (tracked privately) · `todo`

### S29 — Outside testers · Owner · `doing`
A handful of outside testers finish games and send feedback. Phase 3 exit.

## Presets and the ruleset builder

Added 2026-10-24 from the owner's playtest (S29). Players test configurations, export and load them, send them to others for a game or a tournament, and submit them for consideration as an official tournament ruleset. Steps S39 to S43 build it in order; each is one session and one PR.

### S36 — Playtest fixes, presets and legal audit · Owner with Claude in chat · Opus 5.5 · high · `done`
Readable rules dialog (dark panel, focus, Escape), color rings on pawns by starting file, presets Standard (new default, King range 1), Good Practice (`draft-2p`, unchanged rules) and Easy Start, a rules page per ruleset at `/rules/<id>` linked from the dialog and picker, depth-1 fairness run for Standard, and the legal audit fixes (bundled license notices, privacy page, footer notice, Discussions terms). Decision 0011.

### S37 — Depth-2 fairness run for Standard · Owner · `todo`
Actions → **Sim depth 2** → Run workflow, with ruleset `standard-2p` (shards 20, games 2000). It takes about one hour per shard, run in parallel. When it finishes, start S38.

### S38 — Publish Standard as a Candidate · Sonnet 5.5 · medium · `done`
Commit the merged depth-2 report (the run's artifact) to `docs/fairness/standard-2p.md` and `.json`, keeping the depth-1 run. If both depths pass decision 0008, change `standard-2p` to `candidate` (version unchanged, as 0010 did for `draft-2p`) and write decision record 0012; if not, leave it experimental and report the numbers. Decisions: D12, D43.
Done when: the report shows both depths and the status matches the verdict.

### S39 — Option labels and groups in the registry · Sonnet 5.5 · medium · `done`
Add `group` (King, Queen, Pawns, Center, Coast, Dragon Tail, Dragon Heads, Sun and Moon, Turns and draws, Setup) and `optionLabels` (a short player-facing label for every option, such as `a5-e5-i5` → "A5, E5 and I5") to `rules/schema/parameters.schema.json` and every live parameter in `rules/parameters.json`. Labels are presentation only; no rule changes. The rules page and the dialog show labels instead of raw values, and group by `group` instead of id prefixes.
Done when: a test fails for any live parameter without a group or without a label for each option, and `/rules/<id>` shows labels.

### S40 — The owner's new piece options (24 Oct 2026) · Opus 5.5 · high · `done`
New parameters from the owner, each defaulting to today's behavior and tested at its default and every option, with a 40-game sweep entry:
- **Queen crosses the void** and **Queen may stand on a void square**, as two switches. They replace `queen.canEnterVoid`, which becomes deprecated (kept so old games replay); rulesets that set it get a new version with the two new ones.
- **Pawns may enter the Coast once it is open** (`pawn.canEnterCoast`, default off).
- **Every piece may enter the Coast at any time** (default off).
Already parameters, no new work: Queen may enter the Coast once it is open (`queen.canEnterCoast`), and pawn-safe zones on the like-colored square or on any colored square (`pawn.safeZones`; the builder shows its options as two switches).
Decisions: D44, D45.

### S41 — Change Ruleset page · Sonnet 5.5 · high · `todo`
"Change ruleset" opens a builder: start from a preset, then a section per piece (King, Queen, Pawns, Coast and the Coast pieces, Center, Turns and draws) with a control per parameter (switches for on/off, choices for options, steppers for ranges). It shows what differs from the starting preset, flags combinations that share `affects` systems and have not been fairness-checked (`parameterInteractions`), and plays the result. A custom ruleset is status `proposed`, named by the player, never official, and its game record carries the full overrides so saved games replay. Custom rulesets are saved in the player's browser only; update the privacy page and its date.
Done when: a player builds a ruleset from Standard, plays it against the computer, reloads and finds it saved; tests cover every control type.

### S42 — Export, load and share a ruleset · Sonnet 5.5 · medium · `todo`
- **Export** a ruleset as a `.json` file in the ruleset format, and **load** one from a file (treated as untrusted: size cap, parsed and checked against the registry with `resolveRuleset`, no new parameters accepted).
- **Share link**: `/play?ruleset=<encoded overrides>` (or `#`), which opens the builder preloaded and says "unofficial" until it matches an Official ruleset.
- **Email**: "Invite to a game" and "Invite to a tournament" open the player's own mail app (`mailto:`) with a subject, the link and the settings in plain text. The app sends nothing and stores no address.
Done when: export → load round-trips exactly, a broken or hostile file is refused with a clear message, and the mail draft opens with the link.

### S43 — Submit a ruleset for tournament consideration · Opus 5.5 · medium · `todo`
"Submit for consideration" opens the Rule proposals Discussion form prefilled with the ruleset JSON and its settings summary (the poster ticks the contribution terms). `pnpm sim --ruleset-file <path>` checks a submitted file; a short review checklist in GOVERNANCE (fairness run at both depths, 21-day discussion, owner ratification) says how a submission can become a Candidate and then Official. Tournament play online waits for Phase 5 (S31); until then invitations carry the ruleset link for hot-seat or over-the-board games.
Decisions: D43, D46.

## Later phases

Each later phase opens with an Opus 5.5 · high planning session that replaces its placeholder with detailed steps.

### S30 — Phase 4: Official tournament rules · `todo`
Public discussion period (D20), fairness re-check if the ruleset changed, ratification, tournament rules page.

### S31 — Phase 5: Online multiplayer · `todo`
Room codes, guest play, reconnection, ruleset locked per game. Backend per D18.

### S32 — Phase 6: 3-player Dragon mode (experimental) · `todo`
Dragon role, win conditions, timer, balance simulations across variants. Decisions: D4, D5.

### S33 — Phase 7: Growth · `todo`
Mobile apps (Capacitor), accounts and stats, tournaments.

## Decision defaults

The owner decides in the ledger. Until a decision is made, its default applies when the step that needs it starts, marked provisional. Private decisions are not listed here.

| ID | Topic | In effect | Needed by |
|---|---|---|---|
| D1 | Board and piece spec | Applied: formats built against a neutral fixture (S9); the real data is in `rules/boards/` and `rules/pieces/` (S10) | S9 |
| D2 | `pawn.promotion.targets` | Decided: queen, rook, bishop, knight (rule set v0.2) | S8 |
| D3 | `dragons.2p.mode` | Superseded by rule set v0.2: Coast pieces play in 2-player games (`coast.2p.initiation`) | S8 |
| D4 | `dragon.rangeMode` | Decided: straight-line squares for all 5 Coast pieces, no corner option (rule set v0.2) | S32 |
| D5 | Dragon movement parameters' player count | Superseded by rule set v0.2: Coast piece parameters are tagged per mode | S8 |
| D6 | Sun and Moon capture | Decided: `sunMoon.capture` = any-move-square, options diagonal-only and none (rule set v0.2) | S8 |
| D7 | Branch rules and merging | Default: ruleset on `main` requires a PR with 0 approvals and the `ci` check, blocks force-push and deletion; Claude merges after green CI | S7 |
| D8 | Merge method | Default: rebase | S7 |
| D10 | Default model | Default (applied): Sonnet 5.5 pinned in `.claude/settings.json`; Opus per step | S7 |
| D11 | Discussions timing | Default: enable now | S5 |
| D12 | Fairness measures | Default: first-player score between 47% and 53% over at least 2,000 bot games at two search depths; draw rate and game length reported. Applied as decision 0008 v2 (depths 1 and 2) | S24 |
| D13 | "Chess9s" wording in TRADEMARKS | Default: describe Chess9s as the domain and repository name | S4 |
| D14 | Public wording of 3-player features | Decided: the owner published the full 3-player rules in rule set v0.2 | S4 |
| D15 | Hosting | Default, applied in S27: Cloudflare Workers with Static Assets (`wrangler.jsonc`); confirm terms at signup | S27 |
| D41 | Deploys | Provisional: Cloudflare's Git connection (Workers Builds) deploys `main`; no Cloudflare token in GitHub and no deploy workflow | S27 |
| D17 | ChessNines repo and site | Default: story, lore, and company information | S4 |
| D18 | Multiplayer backend | Default: Cloudflare Durable Objects | S31 |
| D20 | Discussion period before ratification | Default: 21 days | S30 |
| D21 | Phase 1 dependencies | Default: the S7 pre-approved list | S7 |
| D22 | DCO check alongside the CLA | Default: keep it; Claude signs off every commit with `git commit -s` | S7 |
| D34 | Dark's seat view | Decided: turned 180° (rank 9 at the bottom, Coast on the right) | S12 |
| D36 | e5 arrow | Decided: a tetrahedron symbol, not a rule (see decision 0007, S12 additions) | S12 |
| D43 | Ruleset for the tournament discussion | Default: Standard (`standard-2p`) once it passes at both depths; Good Practice stays a Candidate for practice play | S38 |
| D44 | "Every piece may enter the Coast at any time" | Default (applied as `coast.openToAll`, S40): the Coast is open to every piece from the start; each piece's own Coast setting no longer bars it; Coast pieces may move from the first turn | S40 |
| D45 | Pawns on the Coast | Default (applied as `pawn.canEnterCoast`, S40): a pawn enters the Coast only by capturing onto it once it is open, then moves forward along file A and promotes on its last rank as usual | S40 |
| D46 | Custom rulesets in tournaments | Default: never directly; a submitted ruleset becomes Official only through the S43 checklist (fairness at both depths, discussion, ratification) | S43 |

## Ledger sync format

`/end-session` ends with a fenced block tagged `ledger-sync` that the owner pastes into the ledger:

```json
{"v":1,"session":"S7","date":"YYYY-MM-DD","model":"sonnet","effort":"medium","outcome":"done","pr":2,"merged":true,
 "steps":{"S7":"done"},"resolved":["I16"],
 "newIssues":[{"title":"...","severity":"med","detail":"...","links":["S8"]}],
 "questions":[{"title":"...","options":["...","..."],"default":0,"neededBy":"S9"}],
 "next":{"step":"S8","model":"sonnet","effort":"medium","why":"..."}}
```
