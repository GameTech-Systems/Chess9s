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

## 2026-11-21: Offline build, updates and launch decisions (D89 to D91, D93, D94)

- D89: a hand-written service worker with a build-time precache list (default kept; built in S96).
- D90: a new version waits; "Reload for the new version" is offered only when no game is in progress (default kept; built in S96).
- D91: the owner posts, one channel a day, in the `docs/LAUNCH.md` order; Claude drafts and never posts (default kept).
- D93: "The sooner the better. As soon as it's ready we can decide the exact date." The owner names the launch day once the soft launch passes.
- D94: no analytics script; Cloudflare's dashboard, Discussions, issues and submitted rulesets (default kept).
