# 0007: Board and piece data formats

**Status:** Accepted. S10 entered the real board and pieces in this format (see "S10 additions").

## Context
The engine must not hardcode piece rules (CLAUDE.md, [Rules framework](../RULES-FRAMEWORK.md)). S10 enters the real board and pieces, and S11 builds a move generator with no piece-specific code. Both need a format for boards and movement first.

## Decision
- **Two JSON Schemas**: `rules/schema/board.schema.json` and `rules/schema/piece.schema.json` (draft 2020-12, checked by Ajv). Real data will live in `rules/boards/` and `rules/pieces/`, one piece per file. `pnpm validate:rules` checks both directories when they exist.
- **Board**: lowercase coordinates `a1` to `i9` (file from the left, rank from the light side). Declared square types; a list of special squares, each with one or more types, an optional owning side and a display label; unlisted squares are plain. Sides, each with an optional forward direction (`up` or `down`). One setup per player count, giving the start position by side, with `neutral` for pieces no side owns.
- **Piece**: a list of moves. Each move is exactly one of: named **directions**, step **vectors** (relative to the side's forward, with optional mirror or 8-way symmetry), or **targets** (move straight to any square of the listed types). Moves carry range (omitted means unlimited), jump, capture mode (`move-or-capture`, `move-only`, `capture-only`) and their own square rules. **Square rules** say whether the piece may stop on, or pass over, a square type. Piece-level fields: `royal`, `capturable`, `givesCheck`, `promotion` (on the last rank in the side's forward direction).
- **Parameters plug in two ways**: a value may be `{ "param": "<id>" }` (integer for range, boolean for flags, enumSet for promotion targets), and any move, square rule or promotion may carry a `when` condition (`param` with `is`, `in` or `has`; `players`; `from` a square type; `firstMove`; and `not`, `all`, `any`).
- **Cross-checks beyond the schema** live in the engine (`packages/engine/src/rules/formats.ts`): unique ids, declared square types and sides, one setup per player count, no square used twice in a setup, parameter references that exist, are live and have the right type, condition values that are options, setups and promotions that name known pieces, and no forward-relative piece starting for a side (or `neutral`) without a forward direction.
- The test layout in `packages/engine/test/fixtures/` (board, five pieces, its own parameter registry) is deliberately not the Chess Nines board.

## Not covered yet
Special rules are engine features switched by parameters and are added in the steps that implement them, as minor schema versions: en passant, castling, the Queen-pawn swap, pawn-safe zones (the board already records square ownership for them), opening the Coast, the Tail repeat limit, stone pieces, capture limits by piece class, a royal role that changes by player count, and setup variants such as `setup.swapKingQueen`. Betza notation may be accepted later as a shorthand that converts into this format.

## Alternatives considered
- **Betza notation as the main format**: compact and known to fairy-chess players, but hard to read for most players and hard to tie to parameters.
- **Access rules on square types instead of pieces**: fits rules such as "only dragons stand on the center", but each piece would then be described in two places. Square rules stay on the piece; a square-wide rule is written into each piece it affects.

## Consequences
- S10 converts the owner's board and pieces into this format; anything that doesn't fit becomes a question for the owner, not a new field invented on the spot.
- Leapers cross no squares in this format, so a "pass over" rule never applies to them. The owner confirmed this matches the rules: Knights are never stopped from passing the center, so `knight` in `center.passThrough` has no effect.

## S10 additions
- Squares may carry a display `color` (`#rrggbb`); the colored squares go into board data per ledger decision D25. Sides may carry a display `view` (`rotate`: 0, 90, 180 or 270, clockwise from the standard diagram), from the owner's images of the light and Dragon seats. The engine ignores both.
- The forward-direction check now skips moves and promotions whose `when` rules them out for the setup's player count, so the Dragon side (no forward direction) can hold the Sun and Moon, whose first-move double step is 2-player only.
- Rules that need game state or location-dependent flags remain engine features, listed in each piece's `notes`: opening the Coast and leaving it, the Tail repeat limit, capture on the Coast, castling, en passant, the Queen-pawn swap, pawn-safe zones, 3-player check and stone, and `givesCheck` that differs by player count.

## S12 additions
- D34: Dark's seat view is turned 180 degrees (rank 9 at the bottom, the Coast on the right, as in regular chess). It is now `view: {rotate: 180}` on the dark side in `standard-9x9` (version 0.1.1).
- D36: the symbol on e5 is a tetrahedron, not an arrow, and carries no rule. Its base is three corners of a cube (equilateral from above), one base side parallel to the Coast column, the opposite vertex pointing at the Ting Yang symbol, apex centered. Size is "phi significant"; the renderer uses a base side of phi/2 of the square (provisional). The home-play board will carry it too, and the three Dragon pieces will have hollow pyramidal bases that fit over it like a cap. These are display and product notes only: no board field was added.

## S22a additions
- Pieces gain `castle` (`partner`, `steps`, `when`) and `irreversible`; moves gain `passable` and `inPassing` (en passant); square rules gain `capturable` (piece-level only), `outside`, `owner` and `homeFile`. Placed pieces carry `home`, the square they started on. Together these express castling, en passant, pawn-safe zones (`pawn.safeZones`) and the 2-player Coast rules `coast.2p.exit` and `coast.2p.capturable` as data. The engine checks that a castling partner is a known piece, that `inPassing` is on a capture-only move, and that `capturable` square rules are piece-level.

## S16 additions
- Setups gain `turnOrder`, the seats in order of play (every side with pieces once, never `neutral`), so turn order works for any number of players. `standard-9x9` (version 0.2.0) seats dark, light for 2 players and dark, light, Dragon for 3, as docs/RULES.md says; `turn.firstMove` picks who starts where a ruleset resolves it. The field is optional in the schema; the engine refuses to give a turn order for a setup without one.
