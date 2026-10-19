# Public ledger entries

Public-safe decisions copied from the owner's ledger, newest last. Append only.

## 2026-10-19: Rules decisions (four open questions settled)
Full detail: `rules-decisions-2026-10-19.md` in the repo.

- Several square rules: deny wins; a move's own rule cannot override the piece's rule.
- No passing over a square: applies to sliding moves only; jumpers unaffected. Piece can still stop on the square if stopping is allowed.
- Neutral pieces: per-piece `capturable` flag. Dragon Tail ownerless, not capturable. Stones (from eliminated kings in 3-player) are permanent walls by default, not capturable; mode setting can change this later.
- Promotion: standard chess default (mandatory; Q/R/B/N always offered, independent of captures). Empty list = no promotion. Zone defined + empty list = validation error. `promote_to_captured_only` optional mode, off by default.
