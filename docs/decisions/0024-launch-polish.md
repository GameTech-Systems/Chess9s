# 0024: Launch polish: home page, logo and released brand art

**Status:** Accepted (owner in chat, 3 Nov 2026, before the Phase 3 launch). Built in chat as S88. Display only: no rule, ruleset or parameter changed.

## Owner's requests
1. **Play opens at the top.** Choosing a ruleset low on the home page opened the game scrolled to its bottom. Every change of screen now starts at the top of the page.
2. **Two choices: 2 players and 3 players.** The home page shows the two player counts as cards, each with its board: head to head from the light side's seat for 2 players, from the Dragon's seat for 3 players. Choosing one shows its three presets in this order: Standard, Easy Start, Good Practice (`HOME_PRESETS` in `apps/web/src/game/rules.ts`), then **Build a custom ruleset**, which starts from that count's Standard. The player's own rulesets of that count follow.
3. **Join a room** sits just above the two cards.
4. **I5, Ting Yang:** a colorful phoenix or winged disk on a white background, symmetric as seen from the Center, with nine feathers on each wing and a headless body of a glowing egg.
5. **A logo and favicon;** the logo links to the home page.
6. **Brand imagery of the five new pieces** in the style of turned Staunton pieces: the Sun and Moon pawns, both Dragon Heads and the Dragon Tail.
7. **The home-play board:** the Center (e5) is an irregular tetrahedron, four corners of a cube with base edges of √2 cube edges, sized to fit a board square, and the three Dragon pieces have hollow tetrahedral bases that fit over it like caps (restating D36, [decision 0007](0007-board-and-piece-formats.md)).
8. Other style and clarity updates as appropriate.

## What was built
- **Art (Owner-released, All Rights Reserved, `assets/brand/`, see `assets/README.md`):** the phoenix emblem (nine feathers per wing from gold through red and violet to teal, a glowing egg as its body, three tail plumes), the favicon and home-screen icon made from it, and the five Coast pieces: the Sun (boxwood, golden crystal ball with a sun), the Moon (ebony, moonlit crystal ball with a crescent), the Light Dragon Head (boxwood) and the Dark Dragon Head (ebony) facing each other, drawn more like a bird of prey than a dog after the owner's review (a hooked beak, amber eyes, one swept horn and a ribbed crest like a folded wing), and the Dragon Tail (burnished gold, spade tip). The three Dragon pieces stand on tetrahedral caps seen corner-on, as item 7 describes.
- **I5:** the emblem replaces the placeholder symbol on the white i5 square. It is turned so its wings open away from the Center: seen from e5 it is upright and symmetric, so neither light nor dark faces its top. **Reading (provisional):** this holds in 2- and 3-player games. In 3-player games it matches the old placeholder's 90-degree turn (the Dragon sees it upright); in 2-player games it changes, because the old placeholder pointed at the dark side. Say if the 2-player board should keep the old turn.
- **e5:** unchanged. The screen already draws the cube-corner tetrahedron from above; its base side stays phi/2 of the square (D36, provisional). A base side of one full square is the largest that fits with one side parallel to the Coast.
- **Home page:** a short line on what Chess Nines is over the five pieces in Coast order, on a midnight blue and purple panel so the ebony pieces stand out (a1 Light Dragon Head, a2 Sun, a5 Dragon Tail, a8 Moon, a9 Dark Dragon Head), Join a room, the two cards, the presets with one plain sentence each (the full description stays on each rules page), and Build a custom ruleset. Every other bundled ruleset of the chosen count is listed under a closed **Rulesets under test**, so nothing was removed: today that is the six experimental 3-player rulesets (Heavy-Handed and Light-Handed variants). The page opens on the player count of the last game, or after a reload of the game kept in this browser, so Change ruleset and a reload come back to it. No new storage: it reads the kept game's ruleset id.
- **Logo:** the emblem and the name in the masthead, one link to the home page from every page. It leaves a game the way Change ruleset does; the hot-seat game is kept in the browser as before.
- **Clarity:** the home subtitle says "Play in your browser · no account needed" instead of "Hot-seat"; the footer adds **How to play**, the Standard rules page; `index.html` links the favicon, a 32-pixel PNG and a home-screen icon, and adds Open Graph title and description (no share image yet).
- **Tests and scripts:** home page order and contents for both counts, the presets' existence and player counts, the logo link, the I5 emblem and its turn, the white i5 square, the index.html links. The three Playwright scripts that open 3-player games choose 3 players first and open Rulesets under test.

## Not changed
- Standard (3-player) is still `standard-3p`. Whether `heavy-h3-3p` replaces it waits for the confirming run (S86, S87) and the owner's decision.
- The game board still draws pieces as lettered discs. Using the new piece art on the board is a separate step if the owner wants it.
