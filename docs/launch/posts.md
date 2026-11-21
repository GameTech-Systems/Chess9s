# Launch post drafts

Drafted in S97 for the owner to edit and post (D91: the owner posts, one channel a day, in this order; Claude never posts). Plain words (D85): no ruleset ids or version numbers. No launch date is written anywhere (D93). Each post links chess9s.com and the Discussions, and asks for no account or email. Check each site's self-promotion rules before posting. `[Feedback link]` stands for the pinned "Launch feedback" Discussion, which the owner makes in S98.

Screenshots to attach are in `docs/launch/screenshots/` (see `press.md`).

## 1. The Chess Variant Pages (submit 7 to 10 days ahead)

**Title:** Chess Nines

**Summary:** A chess variant on a 9×9 board for 2 or 3 players, with five extra pieces and a few special squares.

**Rules text:**
Chess Nines is played on a 9×9 board, files A to I and ranks 1 to 9. Each side has the usual sixteen pieces on their usual squares; the King starts on F1 or F9 and the Queen on E1 or E9. Checkmate wins.

File A is the Coast, a column of its own, closed at the start. It holds five extra pieces: a Dragon Head for each side (moves like a Queen, and may cross the void), the Sun (light) and the Moon (dark), which move one square in any direction, and the Dragon Tail, which belongs to neither side and jumps among A5, E5 and I5. Rank 5 is the void, a gray row across the middle. Colored squares mark where pawns are safe.

In the 3-player game a third player, the Dragon, plays the five Coast pieces. Turns go dark, light, Dragon. If the Dragon captures a King, that side's remaining pieces turn to stone and its turns are skipped.

Every rule is a setting, so a rules page lists exactly what a game uses. Full rules: https://github.com/GameTech-Systems/Chess9s/blob/main/docs/RULES.md

**Play it:** https://chess9s.com (free, in the browser, no account; hot-seat, computer opponent, or an online room by link).

## 2. r/chessvariants (then r/chess)

**Title:** Chess Nines: a free 9×9 variant with five extra pieces, for 2 or 3 players (browser, no account)

**Body:**
I've been building a chess variant called Chess Nines. It's chess on a 9×9 board with a gray void across the middle, squares where pawns are safe, and five extra pieces that live on their own column, the Coast.

- Two players play head to head.
- A third player, the Dragon, plays the extra pieces and wins a different way. If the Dragon takes a King, that side's pieces turn to stone.
- Play on one screen, against a computer, or in an online room by link. It works offline after one visit, on a phone too.
- Every rule is a setting. There's a ruleset builder that exports and shares your changes as a link.
- Fairness is checked in the open: bot self-play of 2,000 games at two search depths gave the first player about 50% in the 2-player default. The report is public.

Play: https://chess9s.com · Rules and code: https://github.com/GameTech-Systems/Chess9s

It's new, so I'd like to hear what feels off or unfair. Tell me here, or in the feedback thread: [Feedback link]

*(For r/chess, shorten to the first paragraph and the "free, no account" line, attach the 2-player screenshot, and follow the subreddit's self-promotion rules.)*

## 3. Show HN

**Title:** Show HN: Chess Nines, a 9×9 chess variant where the rules are data

**Body:**
Chess Nines is a chess variant for 2 or 3 players that runs in the browser with no account: https://chess9s.com

The part that may interest this crowd:

- Rules are data. No piece rule is hardcoded; the engine reads each rule from a parameter registry and a ruleset (a named bundle of choices), validated against JSON Schemas. A game record names the ruleset it used, so it replays exactly.
- Fairness runs in the open. A simulator plays the bot against itself and publishes a report. The 2-player default scored 50.2% and 50.1% for the first player over 2,000 games at each of two search depths, inside a band set before the run.
- One Cloudflare Worker serves the static app and the online rooms (a Durable Object per room). No analytics, no cookies, no accounts.
- It works offline after one visit (service worker), including a game against the computer.
- TypeScript, React, Vite, Vitest. The code is source-available (PolyForm Shield 1.0.0), not open source.

The 3-player mode is the odd one: a third player plays five special pieces and wins a different way. Only the Standard 3-player ruleset is balance-tested so far; the rest are marked "In testing".

Code: https://github.com/GameTech-Systems/Chess9s

*(Be ready for: "why not open source?" The answer is in the README: the rules and code are published so anyone can verify and test, but the license bars shipping a competing substitute.)*

## 4. lichess and chess.com variant forums (where links are allowed)

**Title:** New variant to try: Chess Nines (9×9, 2 or 3 players, free in the browser)

**Body:**
Chess Nines is a 9×9 chess variant with five extra pieces and a few special squares. It also has a 3-player mode where the third player plays the extra pieces. No account needed; you can play a friend through a link, or the computer.

https://chess9s.com

I'm looking for people to try it and tell me where the rules feel unbalanced. Feedback thread: [Feedback link]

## Later (after the four-week review, not on launch week)

Product Hunt and BoardGameGeek (as a chess variant) are experiments for after S102. Drafts wait until then.

## For the owner to approve

- The claim "about 50% for the first player" and the 50.2% and 50.1% figures (from `docs/fairness/standard-2p.md`): they are bot results, not human results. The posts say bot self-play.
- Whether to name the project owner or a personal handle in any post (nothing here does).
- That `GameTypeBrand@gmail.com` appears on the press page (D92 chose it as the public contact).
- The Reddit, HN and forum wording above, which is a first draft.
