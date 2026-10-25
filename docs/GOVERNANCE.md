# Governance

Chess Nines is a platform for testing rule variants in the open. Anyone can propose rules. A small, transparent process decides which become official.

> Status: **draft**. Numbers marked "proposed" will be confirmed before the first ratification.

## Roles

- **Project owner:** Duke Johnson (and successors and assigns). Sets the default rules, ratifies Official rulesets, and publishes the reasoning.
- **Community:** proposes rules, playtests, files balance reports, and debates in Discussions.

## Status ladder

1. **Proposed:** an idea submitted through Discussions or an issue template.
2. **Experimental:** implemented as a selectable option so people can try it. Casual play only.
3. **Candidate:** a ruleset that has been checked for fairness and published for public discussion. The default 2-player ruleset is published here.
4. **Official:** ratified for tournament play after public discussion, and immutable.
5. **Deprecated:** kept for replays, no longer recommended.

## 2-player rules

Fair play is required for 2-player games.

1. **Default rules are made fair first.** The project owner designs the default 2-player ruleset to be fair to both sides and checks it before release. The evidence (for example self-play results and playtest notes) is published with the ruleset.
2. **Public discussion.** The fairness-checked default is published as a Candidate. Discussion then runs for a set period. Proposed minimum: 21 days.
3. **Ratification.** After discussion, the project owner may ratify an **Official** tournament ruleset and publish the reasoning in a short decision record in `docs/decisions/`. If the ratified ruleset differs from the fairness-checked default, it is re-checked for fairness first.

Only Official rulesets are used in tournaments. The measures and acceptance thresholds used for fairness checks will be published before the first default ruleset is released, so they cannot be tuned after the results are known.

Other 2-player variants can be offered as Experimental options. They are labeled as such and are not tournament rules.

### Submitted rulesets

Anyone can submit a 2-player ruleset they built at chess9s.com/build. **Submit for consideration** opens a Rule proposals discussion with the ruleset file and its settings filled in; the poster explains why it is fair and accepts the contribution terms. A custom ruleset never goes straight into tournaments (decision D46). It becomes a Candidate, and then Official, only through this checklist:

1. **The file loads.** `pnpm sim --ruleset-file <file>` reads it with the same checks the builder uses (2 players, known settings only, no `extends`). A file that is refused, or that switches on a feature that is not built yet, stops here.
2. **Fairness at both depths.** The same command, at the published measures (decision 0008: 2,000 games at each of depths 1 and 2), passes. The report is committed to `docs/fairness/`.
3. **Candidate.** The ruleset is added to `rules/rulesets/` as a new ruleset with its own id and version, status Candidate, and its fairness report linked.
4. **Public discussion.** Discussion runs for at least 21 days from the date the project owner announces.
5. **Ratification.** The project owner may ratify it as **Official** and publishes the reasoning in a decision record in `docs/decisions/`. If the ratified ruleset differs from the one checked, it is checked again first.

Online tournament play comes later. Until then a tournament invitation carries the ruleset link, for hot-seat or over-the-board games.

## 3-player rules

3-player rules stay **Experimental** until bot self-play shows the seats are balanced. Several Dragon-role variants can be tested in parallel, with results published as balance reports.

## Transparency

- Proposals, reports, and decisions are public.
- Each decision record states the choice, the alternatives considered, and the evidence.
- Manipulating discussions or data is a [Code of Conduct](../CODE_OF_CONDUCT.md) violation.
