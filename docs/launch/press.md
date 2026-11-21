# Chess Nines: press page

Drafted in S97 for the owner to read and edit. The facts below are checked against the repository on 21 Nov 2026; recheck anything that has changed before a post goes out.

## One line

Chess Nines: a 9×9 chess variant for 2 or 3 players. Play in your browser, no account needed.

## The short version

Chess Nines is chess on a 9×9 board with five extra pieces, a gray void across the middle and colored squares where pawns are safe. Two players play head to head. In the 3-player mode a third player, the Dragon, plays the five extra pieces from a column of their own and wins a different way. It runs in the browser at [chess9s.com](https://chess9s.com): no account, no cookies, no tracking script.

## Facts

- **Play:** [chess9s.com](https://chess9s.com). Free, in the browser, on desktop and phone.
- **Ways to play:** two or three players on one screen; against a computer opponent (it can take any seat); or in an online room shared by link. Time controls work in all of them.
- **Offline:** after one visit the game works without a network. Online rooms say they need a connection.
- **Rules are settings.** Every rule is a setting with a default and a list of options. The ruleset builder changes them, exports the result and shares it as a link. Each ruleset has a rules page generated from the same data the game plays.
- **Fairness is tested in the open.** Standard for 2 players: bot self-play of 2,000 games at each of two search depths gave the first player 50.2% and 50.1%, inside the 47 to 53% band the project set before running it ([report](../fairness/standard-2p.md)). Standard for 3 players has its own balance report. Both are Candidates; nothing is Official until there are players to discuss it ([Governance](../GOVERNANCE.md)).
- **Honest status:** the other 3-player rulesets are marked "In testing". Tournaments come later, once there are players.
- **Privacy:** no accounts, no analytics, no cookies. The privacy page says what the browser and the room server keep.
- **Code:** published at [GitHub](https://github.com/GameTech-Systems/Chess9s) under the PolyForm Shield License 1.0.0. It is source-available, not open source: read it, run it, test your own variants, but don't ship a substitute for the game. The name, art and story are All Rights Reserved.
- **Built with:** TypeScript, React and Vite; one Cloudflare Worker serves the app and the rooms.

## The pieces, in one paragraph

Each side has the usual sixteen chess pieces. Five more live on the Coast, the A file: a Dragon Head for each side (it slides like a Queen and may cross the void), the Sun and the Moon (one step in any direction), and the Dragon Tail, which belongs to neither side and jumps between three squares on the middle rank. Checkmate wins, as in chess.

## Screenshots

Made from the built app with `node apps/web/scripts/press-shots.mjs` (no new art; the pictures are the app as it renders). In `docs/launch/screenshots/`:

| What | Desktop | Phone (Pixel 7 width) |
|---|---|---|
| Home page | `home-desktop.png` | `home-phone.png` |
| A 2-player game | `two-player-desktop.png` | `two-player-phone.png` |
| A 3-player game, from the Dragon's side of the board | `three-player-desktop.png` | `three-player-phone.png` |
| How to play | `how-to-play-desktop.png` | `how-to-play-phone.png` |
| The ruleset builder | `builder-desktop.png` | `builder-phone.png` |

The home page shows the released piece art from `assets/brand/`, which is All Rights Reserved: press may use these pictures to report on Chess Nines, and for nothing else without asking.

## Links

- Play: https://chess9s.com
- How to play: https://chess9s.com/how-to-play
- Code and rules data: https://github.com/GameTech-Systems/Chess9s
- Rules guide: [docs/RULES.md](../RULES.md)
- Feedback and ideas: [GitHub Discussions](https://github.com/GameTech-Systems/Chess9s/discussions)
- Contact: GameTypeBrand@gmail.com
