# Launch strategy

Written in S33 (Phase 7 planning, 20 Nov 2026) from the state of the repo, two outside audits and an outside reading of this plan (`docs/audits/2026-11-20/`). Owner decisions are in the ledger; the public defaults are D88 to D93 in `docs/BUILD-PLAN.md`. Dates are targets, not promises: each gate opens when its checks pass.

## Where we are
- chess9s.com serves the app and the rooms from one Cloudflare Worker (S27, S54). It has not been announced.
- Play: 2-player and 3-player hot-seat, a computer opponent for every seat, online rooms for 2 or 3 seats, time controls, a ruleset builder with export, load and share links, and per-ruleset rules pages.
- Fairness evidence is published: Standard (2-player) passed decision 0008 at depths 1 and 2, Standard (3-player) passed decision 0015 at depth 3. Both are Candidates; nothing is Official until there are players (D86).
- No accounts, no analytics, no cookies. The privacy page says what the browser and the room server keep.
- Gaps found this session: no offline play (the app has no service worker, so a reload without a network fails), the README still reads "Phase 1 built" and "coming soon", one 503 KB script loads every page (142 KB compressed), no public contact address (I34), and the GitHub security settings (S2) are not confirmed. The audits' findings are in `docs/audits/2026-11-20/SUMMARY.md`.

## Who it is for
1. **Chess-variant players** who look for new boards and pieces. They care about clear rules, a fair default, and playing a friend quickly.
2. **Chess players curious about 3-player chess.** The Dragon mode is the hook: no other well-known variant gives a third player a different army and a different way to win.
3. **Rule tinkerers.** Every rule is a setting, the builder makes a ruleset in minutes, and the fairness tools are public. They become the community that proposes rulesets (GOVERNANCE).

## What we say
- One line: "Chess Nines: a 9×9 chess variant for 2 or 3 players. Play in your browser, no account needed."
- Three proofs, in this order: you can play now (hot-seat, computer, a room link); the defaults are fairness-tested and the evidence is public; every rule is a setting you can change and share.
- Plain words only (D85): no ruleset ids, versions or project codes in posts, as on the site.
- Honest status: 3-player rulesets other than Standard are "In testing"; tournaments come once there are players.

## Gates
Each gate is a set of checks. The next gate opens when they all pass.

### Gate 1: Ready (Claude steps S95 to S97)
- Audit fixes: every blocker and high finding fixed or answered in writing (S95).
- Offline: after one visit, hot-seat and computer games start, play and reload with no network, on desktop and phone; online-only screens say so instead of failing (S96, D88 to D90).
- Front door: README, home page and share image say what Chess Nines is today; a press page with screenshots, the one-line pitch and facts; post drafts for each channel (S97).
- Checks green: unit tests, the five browser scripts, the new offline script, and a Lighthouse-style pass (no console errors, no layout overflow at 375 px, axe with no violations: already true on seven pages in S33).

### Gate 2: Soft launch (owner, S29 and S98)
- The owner settles the launch decisions with Claude in chat (S98): contact address (I34, D92), channels and order (D91), launch week (D93), and confirms the GitHub settings (S2).
- Five to ten outside testers play on the final build, including one 3-player room and one game offline on a phone, and send feedback through Discussions (S29 continues).
- Pass: no tester hits a blocker; every reported bug has an issue; fixes ship as one Claude session (S99).

### Gate 3: Public launch (owner, S100)
The owner posts, in this order, one channel a day so each gets a reply window:
1. The Chess Variant Pages (chessvariants.com): a game page with the rules and a link. This is the audience most likely to play and to write about rules.
2. Reddit, r/chessvariants first; r/chess only with a clear "new variant, free, no account" post and a screenshot, following each subreddit's rules on self-promotion.
3. Hacker News, "Show HN": the angle is rules as data, fairness runs in the open, one Worker, no tracking.
4. The lichess and chess.com variant forums, where rules allow links.
5. Optional, later: Product Hunt, BoardGameGeek (as a chess variant), a short screen recording for video sites.

Each post links chess9s.com and the Discussions; none asks for an account or an email. Replies in the first 48 hours come from the owner (Claude does not post: D91).

### Gate 4: After launch (S101 onward)
- Week 1: a triage session reads Discussions and issues (S101), files issues, and ships the fixes; the owner answers people.
- Measure without tracking: Cloudflare's own dashboard (requests, rooms made per day from Durable Object counts, errors), Discussions and issue counts, and the number of submitted rulesets. No analytics script is added (D91 keeps the privacy page true).
- Week 4: the owner reviews the numbers with Claude in chat and picks the next Phase 7 track: mobile apps (Capacitor, built on the offline app), accounts and stats, or reopening Phase 4 (a discussion and ratification of Standard once players exist, then tournaments).

## Risks
| Risk | Watch | Response |
|---|---|---|
| A rules bug in a real game | Bug reports, game records people share | Records replay exactly (rulesets are locked), so a report is reproducible; fix as a new ruleset version, never by editing an Official or locked one |
| Room abuse (floods, junk rooms) | Durable Object counts, Worker errors | Rate limits from S95; Cloudflare rules; rooms expire on their own (D53) |
| A cached old app after a fix | Reports of old behavior | The update flow of D90; the service worker never serves an app it cannot update |
| 3-player Dragon feels unfair | Feedback, results people post | Standard (3-player) is a Candidate; changes go through the governance process with new balance runs |
| Self-promotion rules on forums | Removed posts | Read each channel's rules first; post as the maker, once |
| Free-tier limits on Cloudflare | Dashboard usage | Workers Paid is the fallback (decision 0003); nothing in the code depends on the tier |

## Out of scope for the launch
Accounts, ratings, stats, tournaments, native app stores, analytics, ads and paid features. They are Phase 7 tracks to plan after Gate 4.
