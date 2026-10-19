# Session log

One line per session, appended by `/end-session`. Usage is the owner's `/usage` reading at the end, if noted.

| Date | Step | Model · effort | Outcome | PR | Note |
|---|---|---|---|---|---|
| 2026-10-18 | S0 | Sonnet 5.5 | done | #1 | Foundation files (commit 1 draft) |
| 2026-10-18 | S1 | Opus 5.5 (chat) · high | done | #2 | Audit against the master plan, session system, build plan |
| 2026-10-18 | Rules v0.2 | Opus 5.5 (chat) | done | #3 | Owner rule set v0.2: docs/RULES.md, registry 0.2.0, draft-2p and draft-3p rulesets |
| 2026-10-19 | S7 | Sonnet 5.5 · medium | done | #4 | Workspace, CI, validate:rules, labels; main ruleset needs owner import |
| 2026-10-19 | S8 | Sonnet 5.5 · medium | done | #5 | Engine rules loader: schema validation, extends/overrides, deprecated excluded, null refusal; 121 tests |
| 2026-10-19 | S9 | Opus 5.5 · high | done | (this PR) | Board and piece schemas, neutral fixture, engine cross-checks, validate:rules for boards/pieces, decision 0007; 166 tests |
| 2026-10-19 | S11 | Opus 5.5 · high | done | (this PR) | Generic pseudo-legal move generator, 41 hand-worked fixture positions, every fixture parameter at each option; plans no longer wait for approval; 219 tests |
| 2026-10-19 | S10 | Opus 5.5 (chat) · high | done | (this PR) | Real board (standard-9x9) and 11 pieces as unverified seeds; square colors and seat views in the board format; forward check respects player counts; 367 tests |
| 2026-10-19 | S12 | Sonnet 5.5 · medium | done | (this PR) | Web board renderer (SVG, responsive, seat views, coordinates, placeholder pieces); dark view 180 (D34); tetrahedron on e5 (D36); 402 tests |
| 2026-10-19 | S13 | Sonnet 5.5 · high | done | (this PR) | King, Rook, Bishop, Knight tested from 91 hand-checked fixture positions at every option of the parameters they read, plus coverage and start-position tests; no data or engine changes; 505 tests |
| 2026-10-19 | S14 | Sonnet 5.5 · high | done | (this PR) | Queen and Pawn tested from 90 fixture positions at every option; captured-piece promotion (owner's meaning) with a Lost list input; Queen no longer crosses e5 along rank 5; 615 tests |
| 2026-10-19 | S15 | Sonnet 5.5 · high | done | (this PR) | Sun, Moon, Dragon Heads and Tail tested from 87 fixture positions at every option; dragons.2p.mode (deprecated) and sunMoon.canPromote (no targets yet) tested as inert; owner's captured-piece answers recorded; no data or engine changes; 725 tests |
| 2026-10-19 | S16 | Opus 5.5 · high | done | (this PR) | Attack maps from the movement walk; check, legal moves, checkmate, stalemate (draw.stalemate); 112 check/mate cases (every position at each king.range) and 17 attack maps from independent geometry; turnOrder in board setups (standard-9x9 0.2.0) with nextSide for N seats; parameterInteractions; 895 tests |
| 2026-10-19 | S17 | Sonnet 5.5 · medium | done | (this PR) | Game state (turns, Coast opening, Tail repeat limit, lost list, result, ruleset id and version kept); owner answers applied (Tail never takes its mover's pieces; closed Coast gives no check); hot-seat game in the browser with legal-move highlighting, promotion picker and game end; full 80-move game fixture; 970 tests |
| 2026-10-19 | S18 | Sonnet 5.5 · medium | done | (this PR) | Phase 1 review: all checks green, 80-move game replayed in Chromium with no console errors; removed placeholder `ENGINE_NAME`, added blank favicon, README status and repo map updated; Phase 2 plan changes proposed in the handoff; 969 tests |
| 2026-10-19 | S19 | Sonnet 5.5 · medium | done | (this PR) | Rule picker: lists rules/rulesets/ with status badges, draft-3p shown as not playable yet, "Change ruleset" on the game screen; rules built per chosen ruleset; Playwright not added (owner took the default); 975 tests |
| 2026-10-19 | S20 | Sonnet 5.5 · medium | done | (this PR) | Play aids: legal-move toggle (on), undo via a state stack, pieces-in-danger indicator (off by default, provisional); last-move highlight already existed; 980 tests |
| 2026-10-19 | S21 | Sonnet 5.5 · low | done | (this PR) | Play aids 2: sound toggle (Web Audio synth, no audio files, provisional), "?" rules dialog, elapsed-time display; 987 tests |
| 2026-10-19 | S22 | Sonnet 5.5 · low | done | (this PR) | Random computer opponent, Opponent switch, guest game kept in localStorage and replayed on load; Undo takes back the reply too; 998 tests |
| 2026-10-19 | S23 | Opus 5.5 · high | done | (this PR) | Run before S22a at the owner's request. Incremental legality test (playMove 4.8 → 0.57 ms); search bot in the engine (negamax, alpha-beta, quiescence, node budget, values from movement data, mobility term) mates the random mover 4/4; web plays it at 800 nodes; 1107 tests |
