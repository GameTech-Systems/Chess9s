# Public ledger entries

Public-safe decisions copied from the owner's ledger, newest last. Append only.

## 2026-10-19: Rules decisions (four open questions settled)
Full detail: `rules-decisions-2026-10-19.md` in the repo.

- Several square rules: deny wins; a move's own rule cannot override the piece's rule.
- No passing over a square: applies to sliding moves only; jumpers unaffected. Piece can still stop on the square if stopping is allowed.
- Neutral pieces: per-piece `capturable` flag. Dragon Tail ownerless, not capturable. Stones (from eliminated kings in 3-player) are permanent walls by default, not capturable; mode setting can change this later.
- Promotion: standard chess default (mandatory; Q/R/B/N always offered, independent of captures). Empty list = no promotion. Zone defined + empty list = validation error. `promote_to_captured_only` optional mode, off by default.

## 2026-11-21: Public contact address (I34, D92)

- The project's public contact address is GameTypeBrand@gmail.com, written with capital G, T and B. It is shown on the privacy page (`CONTACT_ADDRESS` in `apps/web/src/links.ts`). Security reports still go through GitHub's private vulnerability reporting (`SECURITY.md`, `security.txt`).
