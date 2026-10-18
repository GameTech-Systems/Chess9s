# 0001: License

**Status:** Provisional (to be reviewed by counsel before the first outside contribution)

## Context
The project wants others to verify fairness and test variants, but not to ship a substitute game under another name. Game mechanics are generally not protected by copyright, so the license protects code, rules text, and data, while trademark and reserved creative rights protect the name and brand.

## Decision
- Code, tests, tooling, rules text, rule data, and documentation: **PolyForm Shield License 1.0.0** (source-available, not open source). Others may use, modify, and distribute it for any purpose except providing a product that competes with the software, or with any product the owner provides using it.
- NOTICE carries a `Licensor Line of Business:` line, so that competing with the game is not allowed to open up if a product is later discontinued.
- Name, logos, art, story, characters, books, video, merchandise: **All Rights Reserved** (see NOTICE). Shield does not reach products that neither compete with the software nor use it, so these rely on reserved rights and trademark.
- Contributions require a **CLA** that lets the owner relicense them.

## Alternatives considered
- **PolyForm Perimeter:** narrower. It bars competing with the software itself. It was the initial default.
- **PolyForm Noncommercial:** permits free hobby rebrands, which does not meet the goal.
- **PolyForm Strict:** blocks modification and forks, which blocks testing and contributing.
- **Open source licenses (MIT, Apache-2.0, AGPL-3.0):** do not prevent competing rebrands.

## Consequences
The project must say "source-available", never "open source". GitHub will show the license as non-standard. Shield's definition of competition is broad and untested for a game, so counsel should review it before outside contributions are accepted.
