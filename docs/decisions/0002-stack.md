# 0002: Technology stack

**Status:** Accepted

## Decision
TypeScript everywhere. A pnpm workspace with `packages/engine` (pure rules engine), `packages/sim` (self-play fairness reports, later), and `apps/web` (Vite and React, a static single-page app). Vitest for tests.

## Reasons
A static app hosts free and needs no server for hot-seat or computer play. A pure engine package is testable and reusable by the web app and the simulation harness. TypeScript gives AI-assisted development a typed, checkable target.

## Consequences
The computer opponent is built on our own engine so it respects any ruleset. Fairy-Stockfish (GPL) is not the default because rulesets are dynamic and its license would affect ours. Online multiplayer, mobile wrapping, and accounts are decided in later phases.
