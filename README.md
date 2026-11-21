# Chess Nines

**A 9×9 chess variant with custom pieces, special squares, and rules the community helps decide.**

- Play now, free, no account: [chess9s.com](https://chess9s.com)

## What you can play today

- **2 players or 3.** Hot-seat on one screen, against a computer opponent (it can play any seat), or in an online room you share by link.
- **The 3-player Dragon mode.** A third player, the Dragon, plays the five Coast pieces and wins a different way. Only the Standard 3-player ruleset has been balance-tested; the others are marked "In testing".
- **Time controls**, on one screen and in rooms.
- **Offline.** After one visit the game works with no network, on a phone too. Online rooms need a connection and say so.
- **A ruleset builder.** Change any setting, export the ruleset, load it back or share it as a link.
- **Rules pages** for every ruleset, generated from the same data the game plays.

The default rulesets, Standard for 2 players and Standard for 3, are Candidates: bot self-play found the seats evenly matched, and the [fairness reports](docs/fairness/) are public. Nothing is Official until there are players to discuss it ([Governance](docs/GOVERNANCE.md)). There is no tournament page yet. The [roadmap](docs/ROADMAP.md) lists what comes next, and the [press page](docs/launch/press.md) has the facts in one place.

## Core-source, not open source

The game's code, rules text, and rule data are published here so anyone can **verify the game is fair** and **test their own variants**. You can read, run, and modify everything locally.

This repository is **source-available**, not open source. It is licensed under the [PolyForm Shield License 1.0.0](LICENSE): you may use, modify, and share the software for any purpose except providing a product that competes with it, or with any product the project owner provides using it. The license text says goods and services can compete even when they are free or built for other platforms or programming languages, and that a product marketed as a practical substitute definitely competes. In plain terms: study it, test it, build on it, but don't ship a substitute for the game. The license text controls; this summary is not legal advice.

The name, logos, art, story, characters, books, video, and merchandise are **All Rights Reserved** and are not covered by that license. They are protected by those reserved rights and by trademark. See [NOTICE](NOTICE) and [TRADEMARKS](TRADEMARKS.md).

## Rules are variables

Every piece behavior is a **parameter** with a default and a list of options. For example, in the current draft the King's range is 2 squares, with 1, 3, or 4 as options. Draft values are unverified until the default rules are fairness-checked. A **ruleset** is a named bundle of choices, and every game records which ruleset it used.

Players can pick from published rulesets and propose new ones. For 2-player games, fair play is required: the default rules are built and checked for fairness before they are released, and a ruleset becomes **Official** only after public discussion. Tournaments are a later phase, once there are players; there is no Tournaments page yet. The 3-player default has been balance-tested; the other 3-player rulesets are still in testing.

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
packages/sim/      bot self-play and the fairness reports
packages/online/   room protocol shared by the app and the server
apps/web/          the browser game (Vite and React)
apps/worker/       the Cloudflare Worker: serves the app and keeps the rooms
assets/            reserved materials (see assets/README.md)
```

## Run it yourself

Node 22 and pnpm 10, then:

```bash
pnpm install
pnpm dev
```

`pnpm dev` serves the game for hot-seat and computer play. To try online rooms locally, build the app and run the same Worker that chess9s.com uses:

```bash
pnpm build
pnpm exec wrangler dev
```

Open the address it prints, make a room, and open the room link in a second browser window. `pnpm test` runs the whole suite, and `pnpm sim` runs the fairness simulation (see `CLAUDE.md` for every command).

## Legal

Copyright 2026 Duke Johnson and successors and assigns. Chess Nines™ is claimed as a trademark; see [TRADEMARKS](TRADEMARKS.md).
