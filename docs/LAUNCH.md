# Launch strategy

Written in S33 (Phase 7 planning, 20 Nov 2026) from the state of the repo, two outside audits (NVIDIA: Nemotron 3 Ultra for the product, Kimi K3.1 Pro for security) and an outside reading of this plan (OpenRouter: Ernie 5.5 Flash) (`docs/audits/2026-11-20/`). Owner decisions are in the ledger; the public defaults are D88 to D93 in `docs/BUILD-PLAN.md`. Dates are targets, not promises: each gate opens when its checks pass.

## Where we are
- chess9s.com serves the app and the rooms from one Cloudflare Worker (S27, S54). It has not been announced.
- Play: 2-player and 3-player hot-seat, a computer opponent for every seat, online rooms for 2 or 3 seats, time controls, a ruleset builder with export, load and share links, and per-ruleset rules pages.
- Fairness evidence is published: Standard (2-player) passed decision 0008 at depths 1 and 2, Standard (3-player) passed decision 0015 at depth 3. Both are Candidates; nothing is Official until there are players (D86).
- No accounts, no analytics, no cookies. The privacy page says what the browser and the room server keep.
- Gaps found this session: no offline play (the app has no service worker, so a reload without a network fails), the README still reads "Phase 1 built" and "coming soon", one 503 KB script loads every page (142 KB compressed), nothing limits how fast one address can make rooms or open sockets, no public contact address (I34), and the GitHub security settings (S2) are not confirmed. The audits' findings are in `docs/audits/2026-11-20/SUMMARY.md`.

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

### Gate 1: Ready (S95, S96, S98, S97)
- Audit fixes: every blocker and high finding fixed or answered in writing (S95).
- Offline: after one visit, hot-seat and computer games start, play and reload with no network, on desktop and phone; online-only screens say so instead of failing (S96, D88 to D90).
- Decisions first: the launch decisions are settled in the ledger (21 Nov 2026): contact address (I34, D92), channels and order (D91), launch date set by the owner once ready (D93), measurement (D94). In S98 the owner confirms the GitHub settings (S2); and sets up the feedback intake: a pinned "Launch feedback" Discussion, labels for bug, rules and idea, and a rule that every report gets an answer or an issue within 72 hours.
- Front door: README, home page and share image say what Chess Nines is today; a press page with screenshots, the one-line pitch and facts; post drafts for each channel; a Feedback link in the footer to the pinned Discussion (S97).
- Checks green: unit tests, the five browser scripts, the new offline script, and a Lighthouse-style pass (no console errors, no layout overflow at 320, 375 and 430 px and in landscape, axe with no violations: already true on seven pages in S33), plus a manual pass: a whole game by keyboard alone, visible focus, dialogs that keep and return focus, 200% zoom, and reduced motion.

### Gate 2: Soft launch (owner, S29)
- Before testers: `www` and `http://` redirect to `https://chess9s.com/` and Cloudflare Web Analytics is off (S103, audit of 23 Nov 2026).
- Eight to fifteen outside testers play on the final build, chosen to cover: at least two 3-player groups (one in a room, one hot-seat), at least four on phones (Android and iPhone, one installing the app and playing offline), one who plays by keyboard or with a screen reader, and two who have never played a chess variant.
- Feedback goes to the pinned Discussion. Testers without a GitHub account send it to the owner directly, and the owner files it (or use the D92 address if one is chosen).
- Pass: no tester hits a blocker; every reported bug has an issue; fixes ship as one Claude session (S99).

### Gate 3: Public launch (owner, S100)
The owner posts, in this order, one channel a day so each gets a reply window:
1. The Chess Variant Pages (chessvariants.com): a game page with the rules and a link. This is the audience most likely to play and to write about rules. Submit it 7 to 10 days before launch day, since pages there are reviewed before they appear.
2. Reddit, r/chessvariants first; r/chess only with a clear "new variant, free, no account" post and a screenshot, following each subreddit's rules on self-promotion.
3. Hacker News, "Show HN": the angle is rules as data, fairness runs in the open, one Worker, no tracking.
4. The lichess and chess.com variant forums, where rules allow links.
5. Not on launch week: Product Hunt, BoardGameGeek (as a chess variant), a short screen recording for video sites. They are experiments after S102.

Each post links chess9s.com and the Discussions; none asks for an account or an email. Replies in the first 48 hours come from the owner (Claude does not post: D91). Moderation follows CODE_OF_CONDUCT.md; the owner may ask one or two testers to help watch the Discussions.

### Gate 4: After launch (S101 onward)
- Week 1: a triage session reads Discussions and issues (S101), files issues, and ships the fixes; the owner answers people.
- Measure without tracking: Cloudflare's own dashboard (requests, rooms made per day from Durable Object counts, errors), Discussions and issue counts, and the number of submitted rulesets. No analytics script is added (D94 keeps the privacy page true).
- Week 4: the owner reviews the numbers with Claude in chat and picks the next Phase 7 track: mobile apps (Capacitor, built on the offline app), accounts and stats, or reopening Phase 4 (a discussion and ratification of Standard once players exist, then tournaments).

## Timeline (targets, D93)
The owner decided D93 on 21 Nov 2026: "The sooner the better. As soon as it's ready we can decide the exact date." The dates below are the earliest targets, not a fixed launch day; the owner names the day once Gate 2 passes.

| When | What |
|---|---|
| 20 Nov to 4 Dec 2026 | S95, S96, S98, S97 (Gate 1) |
| 5 Dec to 20 Dec | Soft launch (S29) and fixes (S99); CVP page submitted by 4 Jan |
| 21 Dec to 4 Jan 2027 | Holiday freeze: no launch, no feature work, fixes only if something breaks |
| Tue 12 Jan 2027 | Public launch day, then one channel a day (S100) |
| 19 Jan | First-week triage (S101) |
| 9 Feb | Four-week review (S102) |

A slip moves the whole table; the holiday freeze stays. If Gate 2 passes by 4 Dec, the owner may launch on Tue 8 Dec instead (D93 option).

## Success signals (first four weeks, no analytics script)
Targets for S102 to read, not promises:
- **Play:** at least 40 rooms made (Cloudflare's Durable Object counts), and players report games in Discussions.
- **The 3-player hook:** at least 10 feedback items or posts mention the Dragon mode.
- **Community:** at least 20 Discussion posts or comments and 8 issues from outside the project, every one answered within 72 hours.
- **Tinkering:** at least 5 rulesets or share links posted or submitted.
- **Reliability:** Worker errors under 1% of requests, and no blocker or high issue open longer than 72 hours.

## Risks
| Risk | Watch | Response |
|---|---|---|
| A rules bug in a real game | Bug reports, game records people share | Records replay exactly (rulesets are locked), so a report is reproducible; fix as a new ruleset version, never by editing an Official or locked one |
| Room abuse (floods, junk rooms) | Durable Object counts, Worker errors | Rate limits from S95; Cloudflare rules; rooms expire on their own (D53) |
| A cached old app after a fix | Reports of old behavior | The update flow of D90; the service worker never serves an app it cannot update |
| A broken service worker | Reports of a blank or stuck page | `sw.js` is never cached long; the recovery path in decision 0025 replaces it with one that clears its caches and unregisters |
| 3-player Dragon feels unfair | Feedback, results people post | Standard (3-player) is a Candidate; changes go through the governance process with new balance runs |
| Self-promotion rules on forums | Removed posts | Read each channel's rules first; post as the maker, once |
| Free-tier limits on Cloudflare | Dashboard usage | Workers Paid is the fallback (decision 0003); nothing in the code depends on the tier |

## Out of scope for the launch
Accounts, ratings, stats, tournaments, native app stores, analytics, ads and paid features. They are Phase 7 tracks to plan after Gate 4.
