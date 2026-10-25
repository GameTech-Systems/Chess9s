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

### S51 — Room logic and protocol · Opus 5.5 · high · `todo`
A new workspace package `packages/online`: pure TypeScript with no DOM and no Cloudflare APIs, so Vitest tests it in Node and both the Worker and the web app import it.
- **Protocol.** Versioned JSON messages (`v: 1`) for create, join, move (in notation), resign, offer draw, accept or decline a draw, snapshot, opponent present or away, refused (with a reason) and game over. Every message has a size cap and strict keys; anything else is refused, never thrown.
- **Room.** A state machine over the engine: the ruleset fixed at creation (an id and version through the S45 lookup, so a Candidate, Official or archived version plays from its lock; a custom ruleset's overrides checked as untrusted input, as `readRulesetFile` does), two seats (D52), a random secret seat token per seat that reconnects it (compared in constant time, never sent to the other player), moves checked with `findMove`/`playMove` (refused out of turn, illegal, or after the end), and a snapshot (ruleset reference, moves, result, seat status) that a client replays to the same position.
- **Results** (D51): add resign and draw by agreement to the engine's `GameResult`, and let a game record (S46) carry them, so `openRecord` accepts a resigned or agreed game whose replay is otherwise still going. Record format stays `v: 1` and old records still open.
- **Rules data without Vite.** Move the assembly of board, pieces, registry, rulesets, archive and locks out of `apps/web/src/game/rules.ts` into a library that takes the files as input; the web app keeps feeding it from `import.meta.glob`. For the Worker, a script writes a static index of every file in `rules/` (`pnpm rules:index`), and a test fails when the index and the folder differ.
- Tests first: each message type, valid and malformed; every refusal; the S17 80-move game played through two seats ends with the hot-seat result; a reconnect snapshot replays to the same `stateKey`; a custom ruleset with an unknown or out-of-range override is refused; a room on an archived version plays from its lock; resign and agreed-draw records round-trip.
Done when: the 80-move game plays through the protocol to the same result, every refusal has a test, and the web app still builds and plays with the shared rules library.
Decisions: D51, D52, D54.

### S52 — Rooms on Cloudflare · Opus 5.5 · high · `todo`
Read Cloudflare's current documentation first (Durable Objects on Workers Free with SQLite storage, the WebSocket Hibernation API, `run_worker_first`, and Worker Previews for a Worker with a Durable Object) and note anything that differs from this plan in the handoff.
- **Worker** (D18, D50) in `apps/worker`: `wrangler.jsonc` gets `main`, `assets.run_worker_first: ["/api/*"]`, a Durable Object class `Room` with a `new_sqlite_classes` migration, and keeps static assets and the SPA fallback for every other path. Routes: `POST /api/rooms` (ruleset reference in, room code and the creator's seat token out; a new code on collision), `GET /api/rooms/<code>` (ruleset and open seats, no tokens), `GET /api/rooms/<code>/socket` (WebSocket upgrade; the `Origin` must be chess9s.com or a local dev origin).
- **Room** Durable Object: a thin adapter over S51's room logic using the Hibernation API; moves are written to its storage as they are played, so a restart loses nothing; an alarm deletes the room per D53. Limits: message size, two seats and no spectators (D52), and an idle socket closed after a while. No names, IP addresses or user agents are stored, and nothing is logged beyond Cloudflare's own request logs.
- **Headers.** `_headers` keeps every rule; `connect-src 'none'` becomes `connect-src 'self'` (same-origin WebSocket). Worker responses set the same security headers.
- Pre-approved dependencies: `@cloudflare/workers-types` (MIT OR Apache-2.0). `@cloudflare/vitest-pool-workers` (MIT) only if it supports the repo's Vitest version; otherwise test the adapter against a fake Durable Object state. Add both to NOTICE if used.
- CI typechecks, lints and tests `apps/worker`, and the `ci` job also runs `wrangler deploy --dry-run` so a broken Worker config fails the PR.
Done when: `wrangler dev` serves the app and the rooms; two Node 22 WebSocket clients (built in, no dependency) play the 80-move game through the local Worker, one drops and reconnects with its token mid-game, and the result matches; a room past D53 is gone; `pnpm build` still produces the static app; the PR's Cloudflare preview build passes (or D50's fallback is applied and written down).
Decisions: D18, D50, D53.

### S53 — Play online in the browser · Sonnet 5.5 · high · `todo`
- **Create.** "Play online" on the game screen and the picker makes a room with the current ruleset (a custom one carries its overrides) and the creator's seat choice (D52). It shows the room code, a link `/room/<code>`, and the `mailto:` invitation from S42 with the link.
- **Join.** By code or link. Before taking the seat the page shows the ruleset's name, version and badge, "Unofficial" and what differs for a custom one, and which side the player gets. A full, expired or unknown room says so plainly.
- **Play.** The board turns to the player's side (D34). It shows whose turn it is, whether the opponent is connected, and buttons for resign and offer draw (D51). No undo, no computer opponent; the legal-move and danger aids stay, as they are local. Save game record (S46) works for online games.
- **Reconnect.** Room code and seat token are kept in local storage (`chess9s.online`, one entry per room, removed when the room ends or expires). The page reconnects with backoff after a drop or a reload and replays the snapshot through the engine. A move the server refuses is taken back with the reason. A protocol mismatch after a deploy says "Reload to update".
- **Pages.** The privacy page says what is sent (room code, ruleset, moves, seat token), what the server keeps and for how long (D53), that Cloudflare handles the connection (IP addresses included) under its own terms, and that there are no names or accounts; its date changes. `/tournament`, the builder's tournament note and the tournament invitation say games can be played online by room code, still with the Official ruleset only (D46).
- Tests first: the online session against a fake socket (connect, opponent move, drop, reconnect, refused move, resign, draw offer, game over); create and join screens in every room state; the privacy and tournament copy.
Done when: in two Chromium contexts against `wrangler dev`, a room is created, joined by link, played to checkmate, and one tab reloaded mid-game resumes on the same position; the same game works at Pixel 7 width with no sideways scroll; all checks pass.
Decisions: D34, D46, D51, D52, D53.

### S54 — Go live with rooms · Owner · `todo`
After S53 merges and Workers Builds deploys it: confirm in the Cloudflare dashboard that the Worker shows the `Room` Durable Object, add the free rate-limiting rule for `POST /api/rooms` with the setting from the S52 handoff, confirm Cloudflare's terms for Durable Objects on the free plan (decision 0003 is still provisional), and play one game between two devices on chess9s.com, with a reload in the middle. Phase 5 exit when that game finishes.

## Phase 6: 3-player Dragon mode (experimental)

Planned in S32 (2026-10-25). Three people play hot-seat or against the computer: dark, light and the Dragon, who plays all 5 Coast pieces (`draft-3p`, rule set v0.2, `docs/RULES.md`). Bot self-play then measures the seats across the 3-player options. Phase 6 does not wait for Phases 4 or 5. Exit: a 3-player game reaches every end in the "How 3-player games end" table in the browser and against the computer, and the balance report at both depths is published with the owner's decision on the 3-player default.

Already built: 3-player movement is data. The pieces read `coast.3p.exit`, `coast.3p.capturable`, `tail.3p.movement`, `tail.3p.captures`, `sunMoon.3p.range` and `dragon.3p.givesCheck`, the board has the 3-player setup and turn order (dark, light, Dragon), and `nextSide` skips seats that are out. Not built: `newGame` refuses 3 players, and nothing reads `draw.3p.stalemate`. There are no stones, no King capture, no Tail checkmate, no 3-player results, and no 3-player search (S23's negamax is 2-player). The web picker and the ruleset file (S42) are 2-player only.

Found in planning: the rules leave cases open that the engine must decide. They are listed under S55 (D55 to D57) and are the owner's to settle; they get no defaults (never invent rules). No timer rule exists anywhere in the rules or the registry (D58).

### S32 — Phase 6 planning · Opus 5.5 · high · `done`
Wrote the steps below and D55 to D61.

### S55 — Settle the 3-player rule gaps · Owner with Claude in chat · Opus 5.5 · high · `todo`
The owner answers these in the ledger. Each answer is a fixed rule, or a new parameter with a default and options. Claude adds no options of its own.
- **D55, check and the Dragon's win.** (a) With `dragon.3p.givesCheck` off, may a Kinged player move into a square a Dragon piece attacks, or leave the King there? (b) "The Dragon captures one King, then checkmates the other": with Dragon pieces not giving check, does the Dragon win by capturing the second King, or when that King is attacked and has no move that ends the attack? Does the answer change once only one King is left? (c) Must the Dragon end an attack on the Tail when it can, as a King must end check?
- **D56, Tail checkmate and stones.** (a) When is the Tail checkmated: right after the attacking move, or at the start of the Dragon's turn? Light moves between dark and the Dragon, so light could end dark's attack. (b) If two pieces attack the Tail, which one swaps with it? (c) What happens when the swap would put that piece where it may not stand (a Rook or pawn on the Coast, a pawn on its last rank, a Queen on a void square)? (d) Do stone pieces still attack: does a stone piece give check or guard a square?
- **D57, draws and stalls.** (a) Do threefold repetition, the 50-move rule and insufficient material apply in 3-player games, and between which players? (b) What happens when the Dragon has no legal move? (c) What happens when the last King, alone against the Dragon, is stalemated? `draw.3p.stalemate` covers only a draw between two Kinged players.
- **D58, the timer.** The roadmap lists a timer for Phase 6, but no rule defines one. Is it a clock per seat, a time limit per move, or something else, and what happens when it runs out?
- **Rule set v0.3.** If the answers change `docs/RULES.md`, S56 ships them as `draft-3p` 0.3.0. 0.2.0 goes to the archive (S45). It has no lock: it is experimental, so the archive keeps it only for replay.
Output: the owner's answers for the S56 brief. A question left open stays open; S56 handles it as its row in the defaults table says.

### S56 — 3-player game state and game end · Opus 5.5 · high · `todo`
Needs S55's answers in the brief.
- **Game.** `newGame` plays 3 players. Each seat has a status: a Kinged seat is active or out (its King was captured); the Dragon is active, Tail in stone, or out. `stateKey`, undo and the record cover the seat statuses and the stones.
- **Stones.** A piece flag in the position. A stone blocks, never moves, and can't be captured (public ledger, 2026-10-19); whether it attacks follows D56. A captured King's side turns to stone, and its turn is skipped (`nextSide`). A checkmated Tail swaps with the checkmating piece and turns to stone, except on E5, where it turns to stone in place.
- **Check.** Kings check each other as usual. Dragon pieces give check only under `dragon.3p.givesCheck`; when it is off, the Dragon may capture an attacked King, and what Kings may do follows D55. A checkmate between Kinged players ends the game before the Dragon moves.
- **Results.** `GameResult` gains each row of the "How 3-player games end" table: the winning seat and the reason, the draw between Kinged players (`draw.3p.stalemate`), and the Dragon out with the Kinged players playing on. A case S55 left open ends the game as `unresolved`, naming the decision. That is never a win or a draw, and it is marked provisional. Game records (S46) carry 3-player games and replay them. The record format stays `v: 1`.
- Tests first: one position fixture per row of the end table, and one per D55 to D57 case. A King captured while the Tail is in stone. A Dragon out, after which the Kinged players play on with turns skipped. Tail checkmated on E5 and off it. Every 3-player parameter at its default and each option, in a game that ends. A 3-player record round trip.
Done when: `draft-3p` plays from the start to every end in the table; every 3-player parameter is tested at its default and each option; `RULES.md` and the registry match the answers (0.3.0 if they changed); the 2-player tests and locks are unchanged.
Decisions: D55, D56, D57.

### S57 — 3-player hot-seat in the browser · Sonnet 5.5 · high · `todo`
- **Picker.** `draft-3p` can be picked, with its Experimental badge and its rules page (`/rules/draft-3p`, which lists every 3-player setting). Builder, export, share and submit stay 2-player (D61).
- **Board.** It turns to the side to move, using each side's `view` from the board data (D34 for dark; the Dragon's view is the board's own). It shows whose turn it is among the three, stones drawn as stone, a side that is out, and the Tail in stone. The danger aid shows a King that a Dragon piece attacks even when that isn't check (D55). The legal-move aid, last move and undo work as in 2-player.
- **End.** A result screen for every 3-player result, including `unresolved`, which names the open question. Save game record works for 3-player games.
- **Timer.** Per D58. Until the owner defines one, each seat's elapsed time is shown (display only, as in Phase 2).
- Tests first: the board and its turn indicator for each seat; a stone and an out side; each result screen; the rules page for `draft-3p`; the 3-player record download.
Done when: Playwright plays a hot-seat game that ends with the Dragon capturing a King and then winning (per D55), and another that ends with one Kinged player checkmating the other, at desktop size and at Pixel 7 width with no sideways scroll; all checks pass.
Decisions: D34, D55, D58, D61.

### S58 — 3-player computer opponent · Opus 5.5 · high · `todo`
- **Search** (D59): paranoid search over S23's evaluation and S35's speedups (transposition table, killer moves, the position cap). Each seat searches as if the other two play against it, so alpha-beta still prunes. It is deterministic for a seed, as decision 0008 needs. The evaluation counts a seat's own material and its win conditions (Kings for the Kinged players; the Tail, Heads, Sun and Moon for the Dragon), with weights noted as provisional in a code comment.
- **Play.** On the game screen the computer can play any one or two seats, at the same levels as in 2-player.
- **Bench.** `pnpm bench --players 3` reports positions per move and capped moves for 3-player positions. A test keeps the 2-player bench results unchanged.
- Tests first: each seat takes a mate in one and a free capture; the Dragon takes a King it may capture; the same seed gives the same moves; depth 2 stays under the cap on the bench positions.
Done when: bots finish 3-player games from the start at depths 1 and 2, the browser plays one or two computer seats, and the 2-player search equivalence tests still pass.
Decisions: D59.

### S59 — 3-player balance simulations · Opus 5.5 · high · `todo`
- **Sim.** `pnpm sim --ruleset draft-3p` (and `--players 3` wherever the CLI assumes 2) reports each seat's score (dark, light, Dragon), wins by reason (each row of the end table), draws, `unresolved` games, games stopped at the move cap, and game length. Shards and `pnpm sim:merge` work as in decision 0009, and the `Sim depth 2` workflow takes the 3-player ruleset.
- **Variants.** `--sweep` runs every 3-player parameter at each option, plus `dragonHead.range` at 3 and 4 (the RULES.md fairness risk), and reports the seat scores for each.
- **Measures** (D60): decision record 0015 sets the 3-player balance measure. It is provisional until the owner confirms it.
- Run in the session: depth 1 at 2,000 games and a 40-game sweep. Commit the report to `docs/fairness/draft-3p.md`, as S36 did. `draft-3p` stays experimental whatever the numbers show.
Done when: the report is committed, the sweep covers every 3-player option, and the 2-player report tests are unchanged. If more than 5% of games end `unresolved` or at the move cap, report it to the owner rather than tuning the rules.
Decisions: D60.

### S60 — Depth-2 run for 3 players · Owner · `todo`
Actions → **Sim depth 2** → Run workflow, ruleset `draft-3p` (shards 20, games 2000), as in S37.

### S61 — 3-player balance review · Owner with Claude in chat · Opus 5.5 · high · `todo`
The owner reads both depths and the sweep, then chooses: keep `draft-3p` experimental as it is; change its defaults using options already in `rules/parameters.json`, which means a new version and a re-run of S59 and S60; or publish a 3-player Candidate, which a later Sonnet step carries out as S38 did. The owner also confirms or changes D60 and decides whether 3-player rooms follow online play (D61). Phase 6 exit.

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
| D51 | Online results and conduct | Default: resign and draw by agreement (offer, accept, decline); no clock (D47), no takebacks, no forfeit for a disconnection: an abandoned game stays open until its room expires | S51 |
| D52 | Seats | Default: the room's creator chooses light, dark or random (random preselected); two seats; no spectators in Phase 5 | S51 |
| D53 | Room retention | Default: a room and its moves are deleted 24 hours after the game ends, or after 7 days with no move; the server keeps no other copy | S52 |
| D54 | Room codes | Default: 6 characters from 31 letters and digits without look-alikes (no 0, O, 1, I, L); a code lets anyone see the ruleset and take an open seat, the seat token is the secret | S51 |
| D55 | 3-player check and the Dragon's win (questions in S55) | Open, a rule: no default. Until it is answered, S56 ends such a game as `unresolved` | S56 |
| D56 | Tail checkmate and stones (questions in S55) | Open, a rule: no default. Until it is answered, S56 ends such a game as `unresolved` | S56 |
| D57 | 3-player draws and stalls (questions in S55) | Open, a rule: no default. Until it is answered, S56 ends such a game as `unresolved`; the sim's move cap still stops long games | S56 |
| D58 | 3-player timer | Open, a rule: no default. Until the owner defines one, each seat's elapsed time is shown, for display only | S57 |
| D59 | 3-player search | Default: paranoid search (each seat assumes the other two play against it) on S23's evaluation and S35's speedups; deterministic for a seed | S58 |
| D60 | 3-player balance measure | Default: each seat scores between 28% and 38% (a third, plus or minus 5 points) over at least 2,000 bot games at depths 1 and 2. A win scores 1, and a draw between the Kinged players scores ½ to each of them and 0 to the Dragon. `unresolved` and capped games are reported, not scored. Decision 0015 | S59 |
| D61 | 3-player scope in Phase 6 | Default: hot-seat and computer play only; online rooms stay 2 seats (D52); the builder, ruleset file, share and submit stay 2-player | S57 |

## Ledger sync format

`/end-session` ends with a fenced block tagged `ledger-sync` that the owner pastes into the ledger:

```json
{"v":1,"session":"S7","date":"YYYY-MM-DD","model":"sonnet","effort":"medium","outcome":"done","pr":2,"merged":true,
 "steps":{"S7":"done"},"resolved":["I16"],
 "newIssues":[{"title":"...","severity":"med","detail":"...","links":["S8"]}],
 "questions":[{"title":"...","options":["...","..."],"default":0,"neededBy":"S9"}],
 "next":{"step":"S8","model":"sonnet","effort":"medium","why":"..."}}
```
