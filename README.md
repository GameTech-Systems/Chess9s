# Chess Nines

**A 9×9 chess variant with custom pieces, special squares, and rules the community helps decide.**

- Play (coming soon): [chess9s.com](https://chess9s.com)
- Story and lore (coming soon): [chessnines.com](https://chessnines.com)

> **Status: Phase 1 built.** The engine and a 2-player hot-seat game run locally (`pnpm dev`): click a piece to see its legal moves, and check, checkmate and stalemate end the game. Several rules are not built yet (en passant, castling, pawn-safe zones, three of the four draws), and there is no 3-player play, computer opponent or hosted build. The draft rules are unverified until they are fairness-checked. See the [roadmap](docs/ROADMAP.md).

## Core-source, not open source

The game's code, rules text, and rule data are published here so anyone can **verify the game is fair** and **test their own variants**. You can read, run, and modify everything locally.

This repository is **source-available**, not open source. It is licensed under the [PolyForm Shield License 1.0.0](LICENSE): you may use, modify, and share the software for any purpose except providing a product that competes with it, or with any product the project owner provides using it. The license text says goods and services can compete even when they are free or built for other platforms or programming languages, and that a product marketed as a practical substitute definitely competes. In plain terms: study it, test it, build on it, but don't ship a substitute for the game. The license text controls; this summary is not legal advice.

The name, logos, art, story, characters, books, video, and merchandise are **All Rights Reserved** and are not covered by that license. They are protected by those reserved rights and by trademark. See [NOTICE](NOTICE) and [TRADEMARKS](TRADEMARKS.md).

## Rules are variables

Every piece behavior is a **parameter** with a default and a list of options. For example, in the current draft the King's range is 2 squares, with 1, 3, or 4 as options. Draft values are unverified until the default rules are fairness-checked. A **ruleset** is a named bundle of choices, and every game records which ruleset it used.

Players can pick from published rulesets and propose new ones. For 2-player games, fair play is required: the default rules are built and checked for fairness before they are released, and **official tournament rules** are established only after public discussion. 3-player rules are experimental and will be tested for balance later.

Learn more: [Draft rules](docs/RULES.md) · [Rules framework](docs/RULES-FRAMEWORK.md) · [Governance](docs/GOVERNANCE.md) · [Parameter registry](rules/parameters.json)

## Take part

- **Discuss and propose rules:** [GitHub Discussions](https://github.com/GameTech-Systems/Chess9s/discussions)
- **Structured proposals and reports:** [open an issue](https://github.com/GameTech-Systems/Chess9s/issues/new/choose) (rule proposal, movement proposal, balance report, bug)
- **Contribute:** read [CONTRIBUTING](CONTRIBUTING.md) first. A [CLA](CLA.md) is required, and art, lore, and character contributions are not accepted.
- **Conduct:** [Code of Conduct](CODE_OF_CONDUCT.md)

## Repository map

```
docs/              roadmap, rules framework, governance, workflow, decision records
rules/             parameter registry, schemas, boards, pieces, rulesets
packages/engine/   rules loader, move generator, check and game state (TypeScript)
apps/web/          the browser game (Vite and React)
assets/            reserved materials (see assets/README.md)
```

Run it: Node 22 and pnpm 10, then `pnpm install` and `pnpm dev`. `pnpm test` runs the whole suite.

## Legal

Copyright 2026 Duke Johnson and successors and assigns. Chess Nines™ is claimed as a trademark; see [TRADEMARKS](TRADEMARKS.md).
