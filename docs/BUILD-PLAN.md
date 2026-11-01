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

### S41 — Change Ruleset page · Sonnet 5.5 · high · `done`
"Change ruleset" opens a builder: start from a preset, then a section per piece (King, Queen, Pawns, Coast and the Coast pieces, Center, Turns and draws) with a control per parameter (switches for on/off, choices for options, steppers for ranges). It shows what differs from the starting preset, flags combinations that share `affects` systems and have not been fairness-checked (`parameterInteractions`), and plays the result. A custom ruleset is status `proposed`, named by the player, never official, and its game record carries the full overrides so saved games replay. Custom rulesets are saved in the player's browser only; update the privacy page and its date.
Done when: a player builds a ruleset from Standard, plays it against the computer, reloads and finds it saved; tests cover every control type.

### S42 — Export, load and share a ruleset · Sonnet 5.5 · medium · `done`
- **Export** a ruleset as a `.json` file in the ruleset format, and **load** one from a file (treated as untrusted: size cap, parsed and checked against the registry with `resolveRuleset`, no new parameters accepted).
- **Share link**: `/play?ruleset=<encoded overrides>` (or `#`), which opens the builder preloaded and says "unofficial" until it matches an Official ruleset.
- **Email**: "Invite to a game" and "Invite to a tournament" open the player's own mail app (`mailto:`) with a subject, the link and the settings in plain text. The app sends nothing and stores no address.
Done when: export → load round-trips exactly, a broken or hostile file is refused with a clear message, and the mail draft opens with the link.

### S43 — Submit a ruleset for tournament consideration · Opus 5.5 · medium · `done`
"Submit for consideration" opens the Rule proposals Discussion form prefilled with the ruleset JSON and its settings summary (the poster ticks the contribution terms). `pnpm sim --ruleset-file <path>` checks a submitted file; a short review checklist in GOVERNANCE (fairness run at both depths, 21-day discussion, owner ratification) says how a submission can become a Candidate and then Official. Tournament play online waits for Phase 5 (S31); until then invitations carry the ruleset link for hot-seat or over-the-board games.
Decisions: D43, D46.

## Phase 4: Official tournament rules

Planned in S30 (2026-10-25). Standard (`standard-2p` 0.1.0) is the Candidate under discussion (D43). The phase ends with an immutable Official 2-player ruleset (ROADMAP exit). S44 starts the 21-day clock and can happen at any time; S45 and S46 run during the discussion; S48 and S49 run only if the discussion changes Standard.

### S30 — Phase 4 planning · Opus 5.5 · high · `done`
Wrote the steps below. Found two gaps that the Official ruleset needs closed: a ruleset stores only its overrides, so editing a registry default silently changes a Candidate or Official ruleset; and `rules/rulesets/` keeps one version per id, so an old version can't be replayed once a new one ships.

### S44 — Announce the discussion for Standard · Owner · `done`
Post the Standard discussion in Discussions (link the rules page `/rules/standard-2p`, the fairness report and decision 0012) and set its end date, at least 21 days later (D20). Put the link and both dates in the ledger brief for S46, or in any later session's brief.

### S45 — Ruleset locks and kept versions · Sonnet 5.5 · high · `done`
- **Locks.** `rules/locks/<id>@<version>.json` holds every resolved value of a Candidate or Official ruleset (today `draft-2p` 0.2.0 and `standard-2p` 0.1.0), with a schema in `rules/schema/`. A test fails when a locked ruleset resolves to a changed value or loses a key (for example, from a registry default edit or a deprecation). It also fails on a new key until the lock records it at its current value; recording a new key never changes a locked value. A script writes a lock for a new version and refuses to overwrite one that exists.
- **Kept versions.** When a Candidate or Official ruleset gets a new version, the old file moves to `rules/rulesets/archive/<id>@<version>.json` (status `deprecated`, per the GOVERNANCE ladder). Engine, web and sim find a ruleset by id and version. An archived version plays from its lock's values, not from today's registry, so a game record of it replays exactly. The picker lists only current versions; saved games and game records may name an archived one.
- The fairness report's ruleset id and version must name an existing lock (a test).
Done when: editing `king.range`'s registry default fails a test that names `standard-2p` 0.1.0; a game recorded under an archived version replays move for move; every parameter keeps its default-and-options tests.

### S46 — Tournament rules page and game record · Sonnet 5.5 · medium · `done`
- **`/tournament`**, linked from the footer, the rules page, the builder's tournament note and the tournament invitation mail. It says: tournaments use Official rulesets only, never custom ones (D46); which ruleset that is (until ratification: "Standard is a Candidate under public discussion", with the S44 link and dates, or "starts when announced"); how a ruleset becomes Official (a summary of GOVERNANCE, with a link); games are hot-seat or over the board until online play (Phase 5); conduct rules per D47.
- **Save game record**: a button that downloads the game as JSON (ruleset id, version and any overrides, turn order, moves in notation, result, date; no names). It loads back for replay with the S45 lookup. Nothing is sent or stored; the privacy page says so and its date changes.
- The discussion link and dates live in one web module (`apps/web/src/tournament.ts`), empty until S44 is done. Ruleset files stay unchanged.
Done when: the page renders in both states (no discussion yet, discussion open), a saved record loads and replays to the same result, and the tests cover the page and the record round trip.

### S47 — Close the discussion · Owner with Claude in chat · Opus 5.5 · high · `todo`
After the S44 end date: go through the discussion, playtest feedback and balance reports for Standard (no commenter names in the repo). The owner chooses: ratify 0.1.0 as it is (go to S50); change it, using only options already in `rules/parameters.json` (go to S48); or extend the discussion. The owner also settles D47 to D49 in the ledger. Output: the owner's decision for the brief, plus a short public summary of what was raised, for the S50 decision record.

### S48 — Re-check a changed Standard · Sonnet 5.5 · medium · `todo`
Only if S47 changes Standard. A new version of `standard-2p` with the owner's changes (semver per RULES-FRAMEWORK; 0.1.0 goes to the archive as S45 set out), status `experimental`, a new lock, a depth-1 run of 2,000 games and a 40-game sweep. It is committed with the report, as S36 did.
Done when: the report is committed, the new lock passes, and 0.1.0 still replays. If depth 1 fails, stop and report the numbers to the owner.

### S49 — Depth-2 run for the changed Standard · Owner · `todo`
Only if S48 ran and passed. Actions → **Sim depth 2** → Run workflow, ruleset `standard-2p` (shards 20, games 2000), as S37.

### S50 — Ratify the Official ruleset · Sonnet 5.5 · medium · `todo`
Needs the owner's ratification decision in the brief. It has no default; without the decision the step is `blocked`. If S48 ran: commit the depth-2 report (both depths must pass decision 0008, or stop). Set the ruleset to `official` with `ratification` (decision record and date) at the version D48 gives. Write decision record 0014 with the owner's reasoning, the S47 summary and the evidence. Its lock becomes permanent: a test fails if an Official ruleset's file or lock changes at all. Update GOVERNANCE (the 21-day minimum is confirmed, no longer "proposed"; status no longer draft if the owner says so), RULES.md, the rules page and picker badges, `/tournament`, and the share text (`matchingOfficial` now finds Standard).
Done when: the real data has one Official 2-player ruleset; a share link with its values says "This is the Official ruleset Standard"; `/tournament` names it and its version; all checks pass. This is the Phase 4 exit.

## Phase 5: Online multiplayer

Planned in S31 (2026-10-25). Two people play over the internet as guests: one makes a room, the other joins by its code or link, and either can drop and come back. The ruleset is fixed when the room is made, and the server checks every move with the same engine the browser uses. Phase 5 does not wait for Phase 4 (the owner put S47 to S50 on hold, 25 Oct 2026): any ruleset in the picker can be played online (a custom one says "Unofficial"), and online tournament games use the Official ruleset once S50 ratifies one. S51 to S53 run in order; S54 is the owner's go-live.

Found in planning: the web app reads `rules/` through Vite's `import.meta.glob`, which a Worker build doesn't have, and Workers forbid `eval`, so the server can't use Ajv (S27 left it out of the web bundles for the same reason). Resign and draw by agreement are not results the engine knows yet.

### S31 — Phase 5 planning · Opus 5.5 · high · `done`
Wrote the steps below and the defaults D50 to D54.

### S51 — Room logic and protocol · Opus 5.5 · high · `done`
A new workspace package `packages/online`: pure TypeScript with no DOM and no Cloudflare APIs, so Vitest tests it in Node and both the Worker and the web app import it.
- **Protocol.** Versioned JSON messages (`v: 1`) for create, join, move (in notation), resign, offer draw, accept or decline a draw, snapshot, opponent present or away, refused (with a reason) and game over. Every message has a size cap and strict keys; anything else is refused, never thrown.
- **Room.** A state machine over the engine: the ruleset fixed at creation (an id and version through the S45 lookup, so a Candidate, Official or archived version plays from its lock; a custom ruleset's overrides checked as untrusted input, as `readRulesetFile` does), two seats (D52), a random secret seat token per seat that reconnects it (compared in constant time, never sent to the other player), moves checked with `findMove`/`playMove` (refused out of turn, illegal, or after the end), and a snapshot (ruleset reference, moves, result, seat status) that a client replays to the same position.
- **Results** (D51): add resign and draw by agreement to the engine's `GameResult`, and let a game record (S46) carry them, so `openRecord` accepts a resigned or agreed game whose replay is otherwise still going. Record format stays `v: 1` and old records still open.
- **Rules data without Vite.** Move the assembly of board, pieces, registry, rulesets, archive and locks out of `apps/web/src/game/rules.ts` into a library that takes the files as input; the web app keeps feeding it from `import.meta.glob`. For the Worker, a script writes a static index of every file in `rules/` (`pnpm rules:index`), and a test fails when the index and the folder differ.
- Tests first: each message type, valid and malformed; every refusal; the S17 80-move game played through two seats ends with the hot-seat result; a reconnect snapshot replays to the same `stateKey`; a custom ruleset with an unknown or out-of-range override is refused; a room on an archived version plays from its lock; resign and agreed-draw records round-trip.
Done when: the 80-move game plays through the protocol to the same result, every refusal has a test, and the web app still builds and plays with the shared rules library.
Decisions: D51, D52, D54.

### S52 — Rooms on Cloudflare · Opus 5.5 · high · `done`
Read Cloudflare's current documentation first (Durable Objects on Workers Free with SQLite storage, the WebSocket Hibernation API, `run_worker_first`, and Worker Previews for a Worker with a Durable Object) and note anything that differs from this plan in the handoff.
- **Worker** (D18, D50) in `apps/worker`: `wrangler.jsonc` gets `main`, `assets.run_worker_first: ["/api/*"]`, a Durable Object class `Room` with a `new_sqlite_classes` migration, and keeps static assets and the SPA fallback for every other path. Routes: `POST /api/rooms` (ruleset reference in, room code and the creator's seat token out; a new code on collision), `GET /api/rooms/<code>` (ruleset and open seats, no tokens), `GET /api/rooms/<code>/socket` (WebSocket upgrade; the `Origin` must be chess9s.com or a local dev origin).
- **Room** Durable Object: a thin adapter over S51's room logic using the Hibernation API; moves are written to its storage as they are played, so a restart loses nothing; an alarm deletes the room per D53. Limits: message size, two seats and no spectators (D52), and an idle socket closed after a while. No names, IP addresses or user agents are stored, and nothing is logged beyond Cloudflare's own request logs.
- **Headers.** `_headers` keeps every rule; `connect-src 'none'` becomes `connect-src 'self'` (same-origin WebSocket). Worker responses set the same security headers.
- Pre-approved dependencies: `@cloudflare/workers-types` (MIT OR Apache-2.0). `@cloudflare/vitest-pool-workers` (MIT) only if it supports the repo's Vitest version; otherwise test the adapter against a fake Durable Object state. Add both to NOTICE if used.
- CI typechecks, lints and tests `apps/worker`, and the `ci` job also runs `wrangler deploy --dry-run` so a broken Worker config fails the PR.
Done when: `wrangler dev` serves the app and the rooms; two Node 22 WebSocket clients (built in, no dependency) play the 80-move game through the local Worker, one drops and reconnects with its token mid-game, and the result matches; a room past D53 is gone; `pnpm build` still produces the static app; the PR's Cloudflare preview build passes (or D50's fallback is applied and written down).
Decisions: D18, D50, D53.

### S53 — Play online in the browser · Sonnet 5.5 · high · `done`
- **Create.** "Play online" on the game screen and the picker makes a room with the current ruleset (a custom one carries its overrides) and the creator's seat choice (D52). It shows the room code, a link `/room/<code>`, and the `mailto:` invitation from S42 with the link.
- **Join.** By code or link. Before taking the seat the page shows the ruleset's name, version and badge, "Unofficial" and what differs for a custom one, and which side the player gets. A full, expired or unknown room says so plainly.
- **Play.** The board turns to the player's side (D34). It shows whose turn it is, whether the opponent is connected, and buttons for resign and offer draw (D51). No undo, no computer opponent; the legal-move and danger aids stay, as they are local. Save game record (S46) works for online games.
- **Reconnect.** Room code and seat token are kept in local storage (`chess9s.online`, one entry per room, removed when the room ends or expires). The page reconnects with backoff after a drop or a reload and replays the snapshot through the engine. A move the server refuses is taken back with the reason. A protocol mismatch after a deploy says "Reload to update".
- **Pages.** The privacy page says what is sent (room code, ruleset, moves, seat token), what the server keeps and for how long (D53), that Cloudflare handles the connection (IP addresses included) under its own terms, and that there are no names or accounts; its date changes. `/tournament`, the builder's tournament note and the tournament invitation say games can be played online by room code, still with the Official ruleset only (D46).
- Tests first: the online session against a fake socket (connect, opponent move, drop, reconnect, refused move, resign, draw offer, game over); create and join screens in every room state; the privacy and tournament copy.
Done when: in two Chromium contexts against `wrangler dev`, a room is created, joined by link, played to checkmate, and one tab reloaded mid-game resumes on the same position; the same game works at Pixel 7 width with no sideways scroll; all checks pass.
Decisions: D34, D46, D51, D52, D53.

### S54 — Go live with rooms · Owner · `done`
After S53 merges and Workers Builds deploys it: confirm in the Cloudflare dashboard that the Worker shows the `Room` Durable Object, add the free rate-limiting rule for `POST /api/rooms` with the setting from the S52 handoff, confirm Cloudflare's terms for Durable Objects on the free plan (decision 0003 is still provisional), and play one game between two devices on chess9s.com, with a reload in the middle. Phase 5 exit when that game finishes.

## Phase 6: 3-player Dragon mode (experimental)

Planned in S32 (2026-10-25); rules settled in S55 (2026-10-26, [decision 0016](decisions/0016-three-player-rules-v0.3.md)). Three people play hot-seat or against the computer: dark, light and the Dragon, who plays all 5 Coast pieces. Three 3-player presets match the 2-player ones: **Standard** (`standard-3p`, the 3-player default, D63), **Good Practice** (`draft-3p`, every default) and **Easy Start** (`easy-3p`, the first checkmate wins). Bot self-play then measures the seats across the 3-player options. Phase 6 does not wait for Phases 4 or 5. Exit: each 3-player preset reaches every end in its table in decision 0016, in the browser and against the computer, and the balance report for `standard-3p` at both depths is published with the owner's decision on the 3-player default.

Already built: 3-player movement is data. The pieces read `coast.3p.exit`, `coast.3p.capturable`, `tail.3p.movement`, `tail.3p.captures`, `sunMoon.3p.range` and `dragon.3p.givesCheck`, the board has the 3-player setup and turn order (dark, light, Dragon), and `nextSide` skips seats that are out. S56 built the 3-player game (`game/three.ts`): seats, stones, check and rule 6, King capture, the Tail's checkmate and swap, the duel, draws and every end-table row. Not built: the Coast pieces' first way out through A5 (`coast.3p.exit`), a 3-player computer player (S23's negamax is 2-player), and 3-player play in the web app and rooms (`loadRules().rules` still refuses 3 players). The ruleset file (S42) is 2-player only.

Phase 6 order: S56, S57, S58, S67, S64, S65, S62, S59, S60, S61. S63 (3-seat online rooms, done; played through `wrangler dev`) needed S54 and S58, and S66 (clocks in online rooms) needs S54 and S65; neither is part of the exit. Added after the exit (28 Oct 2026): S68 built the Coast pieces' first way out through A5, which no earlier 3-player game played ([decision 0019](decisions/0019-three-player-coast-exit.md)); S69 plays the balance runs again on it.

### S32 — Phase 6 planning · Opus 5.5 · high · `done`
Wrote the steps below and D55 to D61.

### S55 — Settle the 3-player rule gaps · Owner with Claude in chat · Opus 5.5 · high · `done`
The owner asked (26 Oct 2026) for 3-player versions of the three presets: Good Practice and Standard fill the gaps from the owner's earlier notes on the third player, and Claude decides how the Dragon plays and wins in Easy Start. Decision 0016 records the rules: D55 to D57 answered (rules 1 to 17), Easy Start for 3 players (D65), new defaults D62 to D64, five new parameters, three 3-player rulesets, and the greedy computer Dragon first (D59). Steps S62 to S64 added. Later the same day the owner confirmed D62 to D64 in the ledger (D62 also as the builder option `check.3p.exposedKing`) and answered D58 with time controls for players to choose ([decision 0017](decisions/0017-time-controls.md)): steps S65 and S66, default D66.

### S56 — 3-player game state and game end · Opus 5.5 · high · `done`
Builds decision 0016; no brief beyond `/start-session S56`. The six new parameters and three rulesets come from the owner's decisions (0016), so adding them is not inventing rules.
- **Data.** Registry 0.3.0 with the parameters in 0016 (`endings.3p`, `dragon.3p.lastKing`, `tail.3p.mateTiming`, `draw.3p.threefoldRepetition`, `draw.3p.fiftyMove`, `check.3p.exposedKing`), each with a group, option labels, status `experimental` and source "decision 0016". `draft-3p` 0.3.0 (0.2.0 to the archive, S45; no lock, it is experimental), and new `standard-3p` 0.1.0 and `easy-3p` 0.1.0 with the overrides in 0016. The loader refuses `endings.3p` = first-checkmate without `dragon.3p.givesCheck` on. `docs/RULES.md` takes the 3-player rules, end tables and presets from 0016, so the page and the data match. No 2-player parameter, ruleset or lock changes.
- **Game.** `newGame` plays 3 players. Each seat has a status: a Kinged seat is active or out (its King was captured); the Dragon is active, Tail in stone, or out. `stateKey`, undo and the record cover the seat statuses and the stones.
- **Check and legality** (0016 rules 1 to 6): Kings check each other; Dragon attacks are check only where 0016 says (`dragon.3p.givesCheck`, `tail.canCheck`, the duel); the Tail is the Dragon's King; no move leaves a King in check from a player who moves before its owner (D62), or, with `check.3p.exposedKing` = counts-as-checkmate, such a move is allowed and that King's owner loses at once.
- **Checkmate** (rules 7 to 9): judged right after each move (for the Tail, at the Dragon's turn under `tail.3p.mateTiming` = dragon-turn); the checkmating piece and its owner; the Tail swap, the no-swap squares and promotion on a swap. The choice between two attackers is part of the move, like a promotion choice.
- **Stones** (rules 10 and 11): a piece flag in the position. A captured King's side turns to stone and its turn is skipped (`nextSide`).
- **Results.** `GameResult` gains every row of both end tables in 0016 (full rules and first checkmate): the winning seat or the seats sharing a draw, and the reason. Game records (S46) carry 3-player games and replay them; the record format stays `v: 1`.
- **Draws** (rules 12 to 17): stalemate, repetition and the 50-move rule in each phase; the Dragon's turn skipped when it has no legal move with both Kings on the board; insufficient material only once the Dragon is out.
- Tests first: one position fixture per row of each end table and per numbered rule in 0016. A King captured while the Tail is in stone. The Dragon out, then the Kinged players finish under the 2-player rules. A Tail checkmated on E5, off it, by a piece that may not stand on its square, and by two attackers. A Dragon move that would leave light in check from dark (refused). Each preset played from the start to an end. Every 3-player parameter at its default and each option, in a game that ends. A 3-player record round trip.
Done when: the three 3-player presets play from the start to every end in their tables; every 3-player parameter is tested at its default and each option; `RULES.md` and the registry match decision 0016; the 2-player tests and locks are unchanged.
Decisions: D55, D56, D57, D62, D63, D65.

### S57 — 3-player hot-seat in the browser · Sonnet 5.5 · high · `done`
- **Picker.** The three 3-player presets, Standard first and marked Default for 3 players (D63), each with its Experimental badge and its rules page (`/rules/<id>`, which lists every 3-player setting).
- **Board.** It turns to the side to move, using each side's `view` from the board data (D34 for dark; the Dragon's view is the board's own). It shows whose turn it is among the three, stones drawn as stone, a side that is out, and the Tail in stone. The danger aid also shows a King that a Dragon piece attacks when that isn't check (0016 rule 2). The legal-move aid, last move and undo work as in 2-player. A two-attacker Tail checkmate asks which piece swaps, like the promotion picker.
- **End.** A result screen for every 3-player result in both end tables: a win, the duel starting, the Dragon out, and a draw with the players who share it. Save game record works for 3-player games.
- **Timer.** Untimed, the default in decision 0017 (D58): each seat's elapsed time is shown, for display only, as in Phase 2. Time controls come in S65.
- Tests first: the board and its turn indicator for each seat; a stone and an out side; each result screen; the rules page for each 3-player preset; the 3-player record download.
Done when: Playwright plays a Good Practice hot-seat game that ends with the Dragon capturing a King and then checkmating the other, another that ends with one Kinged player checkmating the other, and an Easy Start game won by checkmating the Tail, at desktop size and at Pixel 7 width with no sideways scroll; all checks pass.
Decisions: D34, D58, D63.

### S58 — 3-player computer, greedy first · Sonnet 5.5 · high · `done`
The owner (26 Oct 2026, D59): the computer can play the Dragon in a game, starting with a greedy heuristic.
- **Greedy player** in the engine, for any seat: it plays a winning move first, then a King capture, then the move with the best immediate result by S23's piece values and evaluation, scored for that seat's goals in decision 0016 (Kings for the Kinged players; the Kings and the Tail's safety for the Dragon). No look-ahead. Ties are broken by the seed, so the same seed gives the same game (decision 0008). Weights are provisional, noted in a code comment.
- **Play.** On the game screen the computer can play any one or two seats; the Dragon is the usual one. In 3-player games the level is "Greedy" until S62 adds the search.
- **Sim plumbing.** `pnpm sim --ruleset <3-player id>` and `--players 3` wherever the CLI assumes 2, with greedy players, reporting each seat's results (the full report is S59).
- Tests first: greedy takes a mate in one for each seat, a free King capture as the Dragon, and the biggest free capture; the same seed gives the same moves; bots finish games from the start in all three presets.
Done when: two people can play a full hot-seat game against a computer Dragon in the browser, bots finish greedy games in all three presets, and the 2-player search and bench tests are unchanged.
Decisions: D59.

### S67 — 3-player resignation and Tail capture · Sonnet 5.5 · high · `done`
Added in S58 from the owner's answers of 27 Oct 2026 ([decision 0018](decisions/0018-three-player-resignation-and-tail-capture.md)).
- **Resign.** A seat that resigns turns its pieces to stone and the others play on; the table in 0018 gives each case (a Kinged player, the last Kinged player in the duel, the Dragon, Easy Start). `resign` and `endedBy` take 3 seats, the result reason is `resignation`, and records with a 3-player resignation open. Agreed draws stay refused.
- **Tail capture.** `tail.capturable` in 3-player games: the capturing piece swaps places with the Tail and it turns to stone, handled as a Tail checkmate (0016 rule 9). Easy Start's Tail stays uncapturable.
- **Screen.** A Resign button for each person's seat in hot-seat and computer games, with a confirm step; the result card and notices say who resigned and what became stone. The computer never resigns.
- Tests first: each row of 0018's resignation table, with the turn passing on and the draw seats following; a record round trip; Tail capture by a piece that may and one that may not stand on its square, by a pawn onto its last rank, in the duel, and as a move that leaves the mover's King in check; `tail.capturable` at its default and each option.
Done when: Playwright plays a 3-player game in which one player resigns and the other two play on to a result, at desktop size and at Pixel 7 width; all checks pass, and the 2-player tests and locks are unchanged.
Decisions: D68.

### S64 — 3-player rulesets in the builder · Sonnet 5.5 · medium · `done`
Added in S55 (D64): the owner wants the Dragon settings open for players to experiment with.
- **Builder.** Start from a 3-player preset, with a control per 3-player setting (the Dragon Heads, Dragon Tail, Sun and Moon, Coast, endings and draws, and `check.3p.exposedKing`, which the owner wants players to be able to try, D62), what differs from the preset, and the `parameterInteractions` flags. `endings.3p` = first-checkmate turns `dragon.3p.givesCheck` on and says why.
- **File and share.** Export, load and share links take 3-player rulesets (`players: 3`), checked by `readRulesetFile` as in S42. A 3-player custom ruleset is `proposed` and kept in the browser only, as S41 set out.
- **Submit** stays 2-player: tournament rulesets are 2-player (D46). For a 3-player ruleset the builder says so instead of showing the button.
- Tests first: every 3-player control type; export and load round-trip a 3-player ruleset; a 3-player file with a 2-player-only key is refused; the share link opens a 3-player ruleset.
Done when: a player builds a 3-player ruleset from Standard, plays it hot-seat with a computer Dragon, exports it, loads it back and opens its share link; all checks pass.
Decisions: D46, D64.

### S65 — Time controls for hot-seat games · Sonnet 5.5 · high · `done`
The owner's answer to D58 ([decision 0017](decisions/0017-time-controls.md)): keep untimed as the default, and let players choose a time control, like Apex Chess.
- **Data.** `rules/timeControls.json` with the presets in 0017 (default `untimed`) and a schema in `rules/schema/`; `validate:rules` checks it, and a test fails if the default is not one of the controls. The online-only controls (day-long moves, the abandonment rule) are marked so the hot-seat picker leaves them out.
- **Clock.** Pure functions in the engine that take the time as `now` (start, time left, after a move, deadline), for Fischer and per-move controls and any number of seats. A seat that is out stops its clock.
- **Play.** The game screen picks a time control before a hot-seat game (2 or 3 players, computer seats included), with a Show only switch. It shows each seat's clock, runs the clock of the seat to move, and has a Pause button. Undo is off while a clock is on. The guest game in local storage keeps the clocks and comes back paused after a reload.
- **Time out** (D66): the seat is out, as 0017 describes for 2 players, the full 3-player rules and first checkmate, or nothing changes under Show only. Each case is a result the result screen shows.
- **Record.** The game record carries the time control, Show only and each seat's time left after each move, as optional fields; old records still open.
- Tests first: every control kind at each step (start, move, increment, per-move reset, flag fall, pause); each D66 case in 2 and 3 players; Show only; the record round trip with clocks; untimed games unchanged.
Done when: a 2-player game at 3+2 and a 3-player game at 30 seconds per move are played in the browser to a flag fall with the right result, the clocks survive a reload, and all checks pass.
Decisions: D58, D66.

### S62 — 3-player search · Opus 5.5 · high · `done`
The search part of the old S58 (D59), added as its own step in S55.
- **Search:** paranoid search over S23's evaluation and S35's speedups (transposition table, killer moves, the position cap). Each seat searches as if the other two play against it, so alpha-beta still prunes. It is deterministic for a seed, as decision 0008 needs. The evaluation counts a seat's own material and its win conditions from decision 0016, with weights noted as provisional in a code comment.
- **Levels.** In 3-player games the computer offers Greedy (S58) and Search, at the 2-player search levels. A computer Dragon starts on Greedy (owner, D59). Under a time control its thinking time counts on its clock (decision 0017); the position cap stays the limit.
- **Bench.** `pnpm bench --players 3` reports positions per move and capped moves for 3-player positions. A test keeps the 2-player bench results unchanged.
- Tests first: each seat finds a mate in two the greedy player misses; the Dragon takes a King it may capture; the same seed gives the same moves; depth 2 stays under the cap on the bench positions.
Done when: search bots finish 3-player games from the start at depths 1 and 2 in all three presets, the browser offers both levels, and the 2-player search equivalence tests still pass.
Decisions: D59.

### S59 — 3-player balance simulations · Opus 5.5 · high · `done`
- **Sim.** `pnpm sim --ruleset <3-player id>` reports each seat's score (dark, light, Dragon), wins by reason (each row of the end tables in decision 0016), draws and who shares them, games stopped at the move cap, and game length. Shards and `pnpm sim:merge` work as in decision 0009, and the `Sim depth 2` workflow takes a 3-player ruleset.
- **Players.** S62's search plays every seat, so the seats are measured with equal play. A second run with the greedy Dragon (S58) against searching Kinged players is reported separately, as what players meet against the computer Dragon; it is not scored against D60.
- **Variants.** `--sweep` runs every 3-player parameter at each option (the five from decision 0016 included), plus `dragonHead.range` at 3 and 4 (the RULES.md fairness risk), and reports the seat scores for each.
- **Measures** (D60): decision record 0015 sets the 3-player balance measure. It is provisional until the owner confirms it.
- Run in the session: `standard-3p` (D63) at depth 1, 2,000 games; a 40-game sweep; 400-game screens of `draft-3p` and `easy-3p`; and the greedy-Dragon run (400 games). Commit the reports to `docs/fairness/` (for example `standard-3p.md`), as S36 did. Every 3-player ruleset stays experimental whatever the numbers show.
Done when: the reports are committed, the sweep covers every 3-player option, and the 2-player report tests are unchanged. If more than 5% of games end at the move cap, report it to the owner rather than tuning the rules.
Decisions: D59, D60, D63.

### S60 — Depth-2 run for 3 players · Owner · `done`
Actions → **Sim depth 2** → Run workflow, ruleset `standard-3p` (D63; shards 40, games 2000, depths 2), as in S37. S59 measured about 8 CPU-minutes per depth-2 game, so 40 shards take about 2 hours each; the merge keeps the depth-1 run from `docs/fairness/standard-3p.json`.

### S61 — 3-player balance review · Owner with Claude in chat · Opus 5.5 · high · `done`
The owner reads both depths, the screens and the sweep, then chooses: keep the 3-player presets experimental as they are; change their defaults using options already in `rules/parameters.json`, which means a new version and a re-run of S59 and S60; or publish a 3-player Candidate, which a later Sonnet step carries out as S38 did. The owner also confirms or changes D60 and D62 to D65. Phase 6 exit.

### S63 — 3-seat online rooms · Sonnet 5.5 · high · `done`
Added in S55: the ledger has D61 set to "Also 3-seat online rooms". Needs S54 (rooms live) and S58. Not part of the Phase 6 exit.
- **Rooms.** A room made with a 3-player ruleset has 3 seats, named from the board's turn order; the protocol stays `v: 1` and 2-player rooms don't change. The creator picks dark, light, Dragon or random, as D52 does for 2 seats.
- **Computer seats.** The creator may give one or two seats to the computer. The creator's browser plays them with the S58 or S62 player and holds their seat tokens; the server checks every move as it does a person's. If the creator's browser is away, those seats wait, as a person's would (D51).
- **Out seats.** A player whose side is out (King captured, Dragon out) stays connected and sees the game; there are still no other spectators (D52).
- **Results** from decision 0016 in the protocol's game over, and in the saved record. Retention as D53.
- Tests first: the protocol with three seats (join, turn order, a seat skipped once out, the duel, game over); a computer seat played from the creator's session; the create and join screens with three seats.
Done when: three Chromium contexts, or two and a computer Dragon, play a 3-player game through `wrangler dev` to an end in decision 0016, with a reload mid-game; all checks pass.
Decisions: D51, D52, D53, D61.

### S66 — Clocks in online rooms · Opus 5.5 · high · `done`
Added with decision 0017. Needs S54 (rooms live) and S65. Not part of the Phase 6 exit.
- **Rooms.** The creator picks a time control from `rules/timeControls.json`, the online-only ones included, with Show only; it is fixed for the room and shown before a player takes a seat. Untimed stays the default (D51).
- **Server clock.** The Room keeps the clocks with S65's functions, using its own time, never the client's. A flag falls by the Room's alarm even when nobody is connected; clocks keep running while a player is away. The abandonment control counts a player out after 5 minutes away while the others are connected.
- **Results** per D66, in the protocol's game over and the record. 3-seat rooms (S63) use the same clocks.
- **Pages.** The privacy page says the server keeps each seat's time left with the moves (D53); its date changes.
- Tests first: a flag fall with nobody connected, a reconnect that shows the right time left, each control kind, the abandonment rule, Show only, and a clock that the client tries to set (refused).
Done when: two browsers play a 3+2 room game through `wrangler dev` to a flag fall, one reloads mid-game and sees the right times, and all checks pass.
Decisions: D51, D53, D58, D66.

### S68 — 3-player Coast exit through A5 · Owner with Claude in chat · Opus 5.5 · high · `done`
Added 28 Oct 2026, when the owner asked whether the A5 exit unbalanced the 3-player games. It had never been built (`unbuiltFeatures` listed `coast.3p.exit`), so the Dragon's pieces left the Coast anywhere from the first turn. The owner chose to build it as written, as the default, with any legal move as an option ([decision 0019](decisions/0019-three-player-coast-exit.md)).
- **Engine:** the condition `hasLeft` and the per-piece `left` state (repetition key included); square rules for the five Coast pieces; `coast.3p.exit` gains `any-legal-move`; registry 0.4.0.
- **Versions:** `draft-3p` 0.4.0, `standard-3p` 0.2.0, `easy-3p` 0.2.0; the earlier versions archived with locks at `any-legal-move`, so their games, room records and reports replay as played.
- **Tests:** each option in each preset, attacks and check, the walk out through A5 and back, keys, the recorded end-table games played again under the new rules (the old ones replay under the archived versions).
- **Browser:** the 3-player how-to-play lines say how the Dragon's pieces come out.
Decisions: D55 to D57 as before; decision 0019.

### S69 — 3-player balance runs on the A5 exit · Claude (workflow) · Opus 5.5 · medium · `done`
Run decision 0015's measures again for `standard-3p` 0.2.0: Actions → **Sim depth 2**, ruleset `standard-3p`, depths `1,2`, games 2000, shards 40; then the 40-game depth-1 sweep (sweep on, games 40, depths 1; it now plays `coast.3p.exit` at `a5-always` and `any-legal-move`) and screens of `draft-3p` and `easy-3p` (400 games, depths 1). Download each merged report and commit it to `docs/fairness/`; the earlier 3-player reports are kept as `<report>@<version>` (S68), so no merge picks one of them up. Compare with the 0.1.0 runs (same seeds) and say whether Light still collapses at depth 2. The owner then decides on the 3-player defaults as in S61.
Done when: the reports for `standard-3p` 0.2.0 at both depths, the sweep and the two screens are committed, with a short comparison in the handoff.

### S70 — 3-player defaults after the A5 runs · Owner with Claude in chat · Opus 5.5 · high · `done`
The owner reads the S69 reports (`docs/fairness/standard-3p@0.2.0.md`, the sweep, the two screens, the greedy-Dragon run) and decides on the 3-player defaults, as in S61. Claude records the answers (a decision record, the "Decision defaults" table) and builds nothing the owner has not chosen.
Done when: the owner's 3-player calls are recorded, or recorded as kept as they are.
Done 29 Oct 2026 in chat: the A5 exit fixed depth 1 but not depth 2. The owner chose the next Standard ruleset to test (D70, D71), two more levers to screen alone (D72, D73), and Standard only (D74); recorded and built in S71 ([decision 0020](decisions/0020-three-player-coast-attacks.md)).

### S71 — 3-player Coast rule and balance options · Opus 5.5 · high · `done`
Build the S70 calls as data, each tested at its default and every option ([decision 0020](decisions/0020-three-player-coast-attacks.md)):
- **D70:** `coast.3p.attackFrom` (allowed, blocked): a Coast piece on a Coast square attacks nothing (no captures, no check, guards nothing) but still blocks; first way out through A5, then back onto any Coast square. Piece data: the new piece field `moveOnly`.
- **D71:** Kings and Queens only may enter the Coast and may capture Coast pieces there (`coast.3p.capturable` on).
- **D72:** checkmate only, no King capture: the existing `dragon.3p.givesCheck` = true.
- **D73:** `turn.3p.order` (dark-light-dragon, dark-dragon-light).
- **D74:** `standard-3p` 0.3.0 only; 0.2.0 archived with a lock (`pnpm lock keep`); the S69 reports renamed `@0.2.0`; recorded games and bench positions played again.
- The computer Dragon walks its pieces out and does not park them on the Coast. The `Sim depth 2` workflow gains `set` and `label`, then the S72 screens are dispatched.
Done when: the rules play as decided in every preset, tests pass, and the S72 screens are running.

### S72 — 3-player balance screens on the Coast rule · Claude (workflow) · Opus 5.5 · medium · `done`
Depth-2 screens (a few hundred games each, depth 1 alongside), each lever alone on `standard-3p`: the Coast rule alone (0.3.0 as it is), checkmate only alone, the turn order alone (each on 0.2.0's rules: `coast.3p.attackFrom=allowed coast.3p.capturable=false`, then the lever), with the S69 runs as the 0.2.0 baseline. Actions → **Sim depth 2**, ruleset `standard-3p`, games 400, depths `1,2`, `set` and `label` per screen (reports `docs/fairness/standard-3p.<label>`). Full 2,000-game runs at depths 1 and 2 only for a variant that screens inside 28–38%; combine levers only if none passes alone. Commit the reports and compare; then the owner chooses defaults in chat.
Done when: the screens' reports are committed, with a comparison in the handoff.
Done 31 Oct 2026: no lever screens inside 28–38% at depth 2 (Coast rule: dark 45.8%, light 34.9%, Dragon 19.4%; turn order: 5.6%, 69.8%, 24.6%; checkmate only: 23.8%, 6.6%, 69.6%; old rules 23.6%, 5.9%, 70.5%, as S69). The checkmate-only run first crashed on a move giving two checkmates; fixed in the engine and run again.

### S73 — Owner review of the S72 screens · Owner with Claude in chat · Opus 5.5 · medium · `done`
The owner reads the four S72 reports (`docs/fairness/standard-3p.md`, `.checkmate-only`, `.turn-order`, `.old-rules`) and the comparison in the handoff, and picks what to screen next: which levers to combine (the plan's rule once none passes alone), or other changes. Claude records the calls (a decision record, the "Decision defaults" table) and builds nothing the owner has not chosen.
Done when: the owner's calls are recorded, with the next step added to this plan.
Done 31 Oct 2026 in chat: the owner chose two new 3-player rulesets to test, Heavy-Handed Dragon (D75) and Light-Handed Dragon (D76), and clockwise turn orders only (D77: dark-light-dragon, light-dragon-dark, dragon-dark-light; dark-dragon-light withdrawn); each screened at the three orders (D78). Recorded in [decision 0021](decisions/0021-heavy-and-light-handed-dragon.md), with its readings marked provisional.

### S74 — Heavy-Handed and Light-Handed Dragon · Opus 5.5 · high · `done`
Build [decision 0021](decisions/0021-heavy-and-light-handed-dragon.md) as data, each new option tested at its default and every option, so `standard-3p`, `draft-3p` and `easy-3p` play as before:
- **D75 and D76, attacks from the Coast:** `coast.3p.attackFrom` gains `coast-only`: a Dragon piece on a Coast square attacks only Coast squares (captures a King or Queen there, guards only the Coast), still blocks; piece data (`moveOnly` or a sibling condition), so attack maps, check and the computer follow.
- **How the Dragon loses:** `dragon.3p.defeat` (tail-or-pieces-in-duel, pieces-and-tail, pieces-only) and `tail.3p.stone` (swap, where-it-stands), names as the record proposes or better. `pieces-only`: the Tail is a plain blocker, never checkmated and not guarded by the Dragon; the engine refuses it without `tail.3p.captures` = none and `tail.canCheck` off. Each row of the end table in 0016 checked under each option, the duel included; the Tail in stone where it stands when the Dragon is out with both Kings in.
- **D77:** `turn.3p.order` options become `dark-light-dragon`, `light-dragon-dark`, `dragon-dark-light`; `dark-dragon-light` removed (no ruleset or lock uses it). Rules 6 and 7 follow the order played, as now.
- **Rulesets:** `heavy-3p` 0.1.0 and `light-3p` 0.1.0, experimental, on `standard-3p` 0.3.0's values (0021 table); `pnpm rules:index`; registry 0.6.0. No existing ruleset or lock changes.
- **Computer:** the Dragon's evaluation and greedy player follow the loss rule in play (the Tail counts as royal only where it is).
- **Docs:** RULES.md (both rulesets, the turn-order line), the 3-player how-to-play lines if they name the order.
- Tests first: each new option at its default and each option; a recorded game per ruleset to the Dragon's loss with both Kings in (Tail to stone where it stands) and in the duel; each turn order starts with its seat.
Done when: both rulesets play to each end in their tables in the engine and the browser (hot-seat), all checks pass, and the S75 screens are dispatched.
Decisions: D75 to D78.

### S75 — Screens of Heavy-Handed and Light-Handed Dragon · Claude (workflow) · Opus 5.5 · medium · `done`
Six screens, as S72 ran them (D78): Actions → **Sim depth 2**, games 400, depths `1,2`, ruleset `heavy-3p` and `light-3p`, each at `turn.3p.order` = dark-light-dragon (no `set`), light-dragon-dark and dragon-dark-light (`set`, `label` per order). Commit the reports to `docs/fairness/` and compare them with the S72 table in the handoff. Full 2,000-game runs only for one that screens inside 28–38% at both depths.
Done when: the six reports are committed, with the comparison in the handoff.

### S76 — Owner review of the S75 screens · Owner with Claude in chat · Opus 5.5 · medium · `done`
The owner reads the six screens and picks what comes next, as in S73. Claude records the calls and builds nothing the owner has not chosen.
Done 31 Oct 2026 in chat. The S75 handoff table had four rows in the reports' turn-order column order, not dark / light / Dragon; read correctly, light is last at depth 2 in all six screens (4.8–11.4%), and the Dragon takes light's King about three times as often as dark's. Every clockwise order seats light just before the Dragon; S72's reversed order (`.turn-order` against `.old-rules`, the same rules otherwise) moved the collapse to dark (dark 5.6%, light 24.6%), so it follows the seat, not the color. At depth 1 it runs the other way (the seat after the Dragon loses its King more), which points at the search horizon: depth 2 sees a seat's move and the next seat's reply, never the third seat's. The owner chose D79's default: a depth-3 screen before any rule change (S77).

### S77 — Depth-3 diagnostic screen of Heavy-Handed Dragon · Claude (workflow) · Opus 5.5 · medium · `done`
Actions → **Sim depth 2**, ruleset `heavy-3p`, depths `3`, `set` `turn.3p.order=dark-light-dragon` (the default, so the report gets its own name), `label` `depth3`, report `docs/fairness/heavy-3p.depth3`. A screen, not a full run (D79). Compare light's score and King captures with `heavy-3p` at depth 2: if light recovers, the depth-2 measure misleads for 3 players; if not, the seat before the Dragon is the problem. Commit the report and add the comparison to the handoff.
Done when: the report is committed, with the comparison in the handoff.

### S78 — Owner review of the depth-3 screen · Owner with Claude in chat · Opus 5.5 · medium · `todo`
The owner reads S77 and picks what comes next: the 3-player balance measure, alternating the turn cycle's direction, or a rule for the seat before the Dragon. Claude records the calls and builds nothing the owner has not chosen.

## Later phases

Each later phase opens with an Opus 5.5 · high planning session that replaces its placeholder with detailed steps.

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
| D18 | Multiplayer backend | Default: Cloudflare Durable Objects (SQLite storage, WebSocket Hibernation API), planned in S31 | S52 |
| D20 | Discussion period before ratification | Default: 21 days from the owner's announcement (S44) | S47 |
| D21 | Phase 1 dependencies | Default: the S7 pre-approved list | S7 |
| D22 | DCO check alongside the CLA | Default: keep it; Claude signs off every commit with `git commit -s` | S7 |
| D34 | Dark's seat view | Decided: turned 180° (rank 9 at the bottom, Coast on the right) | S12 |
| D36 | e5 arrow | Decided: a tetrahedron symbol, not a rule (see decision 0007, S12 additions) | S12 |
| D43 | Ruleset for the tournament discussion | Default: Standard (`standard-2p`) once it passes at both depths; Good Practice stays a Candidate for practice play | S38 |
| D44 | "Every piece may enter the Coast at any time" | Default (applied as `coast.openToAll`, S40): the Coast is open to every piece from the start; each piece's own Coast setting no longer bars it; Coast pieces may move from the first turn | S40 |
| D45 | Pawns on the Coast | Default (applied as `pawn.canEnterCoast`, S40): a pawn enters the Coast only by capturing onto it once it is open, then moves forward along file A and promotes on its last rank as usual | S40 |
| D46 | Custom rulesets in tournaments | Default: never directly; a submitted ruleset becomes Official only through the S43 checklist (fairness at both depths, discussion, ratification) | S43 |
| D47 | Tournament conduct rules (clock, draw offers, touch-move, disputes) | Decided (ledger brief 25 Oct 2026, default kept): the project publishes none yet; `/tournament` says the organizer announces them with the invitation | S46 |
| D48 | Version of the ratified ruleset | Decided (ledger brief 25 Oct 2026, default kept): keep the version that was fairness-checked (Standard 0.1.0), as 0010 and 0012 kept versions on status changes | S50 |
| D49 | New discussion after a change | Decided (ledger brief 25 Oct 2026, default kept): none; a ruleset changed by the discussion is re-checked at both depths and then ratified, with the change named in the decision record (GOVERNANCE, 2-player rules, step 3) | S50 |
| D50 | Worker layout for rooms | Default: one Worker serves the app and the rooms (same origin, one deploy, no version skew); if Cloudflare's preview builds refuse a Worker with a Durable Object, the rooms move to a second Worker bound by `script_name` and the owner connects it in S54 | S52 |
| D51 | Online results and conduct | Default: resign and draw by agreement (offer, accept, decline); untimed by default (D58: time controls are a per-game choice, decision 0017; online clocks in S66), no takebacks, no forfeit for a disconnection: an abandoned game stays open until its room expires | S51 |
| D52 | Seats | Default: the room's creator chooses light, dark or random (random preselected); two seats; no spectators in Phase 5 | S51 |
| D53 | Room retention | Default: a room and its moves are deleted 24 hours after the game ends, or after 7 days with no move; the server keeps no other copy | S52 |
| D54 | Room codes | Default: 6 characters from 31 letters and digits without look-alikes (no 0, O, 1, I, L); a code lets anyone see the ruleset and take an open seat, the seat token is the secret | S51 |
| D55 | 3-player check and the Dragon's win | Decided (S55, from the owner's earlier notes): decision 0016, rules 1 to 6; adds `dragon.3p.lastKing` (checkmate, or capture as an option) | S56 |
| D56 | Tail checkmate and stones | Decided (S55, from the owner's earlier notes): decision 0016, rules 7 to 11; adds `tail.3p.mateTiming` (after the move, or at the Dragon's turn as an option) | S56 |
| D57 | 3-player draws and stalls | Decided (S55, from the owner's earlier notes): decision 0016, rules 12 to 17; adds `draw.3p.threefoldRepetition` and `draw.3p.fiftyMove` (on) | S56 |
| D58 | Timer and time controls | Decided (owner, 26 Oct 2026): untimed stays the default (elapsed time shown); players may choose a time control like Apex Chess's: Fischer increment, time per move, and online the day-long and abandonment controls (decision 0017) | S65 |
| D59 | 3-player computer | Decided (owner, 26 Oct 2026): a greedy heuristic first, as the computer Dragon (S58); paranoid search after it (S62) for every seat and for the balance runs; deterministic for a seed | S58 |
| D60 | 3-player balance measure | Decided (owner, S61, 28 Oct 2026; decision 0015 version 1 accepted unchanged): each seat scores between 28% and 38% (a third, plus or minus 5 points) over at least 2,000 bot games at depths 1 and 2. A win scores 1; a draw splits the point among the players who share it (½ each for two, ⅓ each for three; S55 widened this for the draws in decision 0016). Capped games are reported, not scored. Decision 0015 | S59 |
| D61 | 3-player scope in Phase 6 | Decided in the ledger: hot-seat and computer play, plus 3-seat online rooms (S63, after S54). The builder and ruleset file: D64 | S57 |
| D62 | A King left in check from a player who moves first | Decided (owner, 26 Oct 2026): not allowed by default (decision 0016, rule 6), and offered as the option `check.3p.exposedKing` = counts-as-checkmate for players to try; confirmed at S61 (Phase 6 exit) | S56 |
| D63 | 3-player default preset | Decided (owner, 26 Oct 2026): Standard (`standard-3p`) starts 3-player games and gets the full balance runs (S59, S60); Good Practice and Easy Start get screens; confirmed at S61 (Phase 6 exit) | S57 |
| D64 | 3-player rulesets in the builder | Decided (owner, 26 Oct 2026): the builder, export, load and share links take 3-player rulesets (S64); Submit stays 2-player (D46); confirmed at S61 (Phase 6 exit) | S64 |
| D65 | Easy Start for 3 players | Decided (Claude, at the owner's request): the first checkmate wins; every attack on a King is check; the Tail is the Dragon's King on A5, E5 and I5 (decision 0016); confirmed at S61 (Phase 6 exit) | S56 |
| D66 | Running out of time | Default: the seat is out. In 2-player games it loses, or draws if the other player could not checkmate; in 3-player games its side turns to stone and the others play on, and in the duel it loses (decision 0017). Show only turns this off for a game | S65 |
| D68 | 3-player resignation and Tail capture | Decided (owner, 27 Oct 2026): a resigning seat's pieces turn to stone and the others play on; a captured Tail swaps with the capturing piece and turns to stone, as in a checkmate. Easy Start parts by Claude, provisional (decision 0018) | S67 |
| D70 | Dragon pieces don't attack from the Coast (3-player) | Decided (owner, 29 Oct 2026): no captures, no check, no guarding from any Coast square; still blocks; back onto any Coast square; first way out through A5. `coast.3p.attackFrom` = blocked in `standard-3p` 0.3.0; allowed (as 0.2.0) is the option (decision 0020) | S71 |
| D71 | Who may enter the Coast (3-player) | Decided (owner, 29 Oct 2026): Kings and Queens only, and they may capture Coast pieces there (`coast.3p.capturable` on in `standard-3p` 0.3.0) | S71 |
| D72 | Dragon wins by King capture or checkmate only | Decided (owner, 29 Oct 2026): King capture stays the default; checkmate only (`dragon.3p.givesCheck` = true) is screened alone in S72 | S71 |
| D73 | 3-player turn order option | Decided (owner, 29 Oct 2026): dark, light, Dragon (D26) stays the default; dark, Dragon, light (`turn.3p.order`) is screened alone in S72. Superseded by D77 (that order is withdrawn) | S71 |
| D74 | Which 3-player presets get the Coast rule | Decided (owner, 29 Oct 2026): `standard-3p` only, as a new version; Good Practice and Easy Start keep their rules and screen the rule as an option | S71 |
| D75 | Heavy-Handed Dragon (3-player) | Decided (owner, 31 Oct 2026): first exit through A5, then back with any legal move; on the Coast a Dragon piece attacks only the Coast (it may capture a King or Queen there); only Kings and Queens enter the Coast; the Dragon loses when the Sun, Moon and both Heads are captured and the Tail is checkmated, in the duel too; the Tail turns to stone where it stands, and a Dragon that plays on loses its next turn (owner, S74 brief). Ruleset `heavy-3p`, experimental (decision 0021) | S74 |
| D76 | Light-Handed Dragon (3-player) | Decided (owner, 31 Oct 2026): as D75, but the Tail only blocks (attacks nothing, can't be captured, never checkmated) and moves like a Dragon Head, first off the Coast through A5 (confirmed, S74 brief); the Dragon loses when the Sun, Moon and both Heads are captured; with both Kings in, the Tail then turns to stone where it stands. Ruleset `light-3p`, experimental (decision 0021) | S74 |
| D77 | 3-player turn orders | Decided (owner, 31 Oct 2026): clockwise only: dark-light-dragon (default), light-dragon-dark, dragon-dark-light; dark-dragon-light withdrawn (decision 0021) | S74 |
| D78 | What to screen after S73 | Default (reading of the owner's words): both new rulesets at each clockwise order, six 400-game screens at depths 1 and 2; full runs only for one inside 28–38% at both depths (decision 0021) | S75 |
| D79 | Next step on the seat before the Dragon (after S75) | Decided (owner, 31 Oct 2026): a depth-3 diagnostic screen of `heavy-3p` first, no rule change yet; alternating the cycle direction and a rule for that seat stay options for S78 | S77 |

## Ledger sync format

`/end-session` ends with a fenced block tagged `ledger-sync` that the owner pastes into the ledger:

```json
{"v":1,"session":"S7","date":"YYYY-MM-DD","model":"sonnet","effort":"medium","outcome":"done","pr":2,"merged":true,
 "steps":{"S7":"done"},"resolved":["I16"],
 "newIssues":[{"title":"...","severity":"med","detail":"...","links":["S8"]}],
 "questions":[{"title":"...","options":["...","..."],"default":0,"neededBy":"S9"}],
 "next":{"step":"S8","model":"sonnet","effort":"medium","why":"..."}}
```
