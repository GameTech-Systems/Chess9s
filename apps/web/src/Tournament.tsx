import { GOVERNANCE_URL } from './links';
import { listRulesets, type RulesetInfo } from './game/rules';
import { STANDARD_DISCUSSION, longDate, type Discussion } from './tournament';

/** Which ruleset tournaments use, and where it stands. Official wins; else the default Candidate. */
function Which({ discussion, rules }: { discussion: Discussion | null; rules: RulesetInfo[] }) {
  const official = rules.find((r) => r.status === 'official' && r.players === 2);
  if (official) {
    return (
      <p>
        Tournaments use <strong>{official.name}</strong> (version {official.version}), the Official
        ruleset. It is ratified and does not change: a change would be a new version.
      </p>
    );
  }
  const candidate = rules.find((r) => r.isDefault) ?? rules[0];
  const name = candidate?.name ?? 'Standard';
  return discussion ? (
    <p>
      There is no Official ruleset yet. {name} is a Candidate under public discussion, opened{' '}
      {longDate(discussion.opened)} and closing {longDate(discussion.closes)}.{' '}
      <a href={discussion.url} target="_blank" rel="noopener noreferrer">
        Join the discussion
      </a>
      .
    </p>
  ) : (
    <p>
      There is no Official ruleset yet. {name} is a Candidate: its public discussion starts when
      announced.
    </p>
  );
}

/** The tournament rules page: which rulesets, how one becomes Official, how games are played. */
export function Tournament({
  discussion = STANDARD_DISCUSSION,
}: {
  /** The Candidate's discussion, or null when it has not been announced. */
  discussion?: Discussion | null;
}) {
  const rules = listRulesets();
  return (
    <article className="prose" aria-labelledby="tournament-title">
      <h2 id="tournament-title">Tournament rules</h2>
      <h3>Which ruleset</h3>
      <p>
        Tournaments use Official rulesets only, never custom ones. A ruleset you build, or one
        someone sends you, is for casual play, and a tournament invitation says so.
      </p>
      <Which discussion={discussion} rules={rules} />
      <h3>How a ruleset becomes Official</h3>
      <ol>
        <li>
          It is checked for fairness by bot self-play at two search depths, at published measures.
        </li>
        <li>It is published as a Candidate, with the fairness report.</li>
        <li>Public discussion runs for at least 21 days from the date the owner announces it.</li>
        <li>
          The owner may ratify it as Official and publishes the reasoning. If it changed after the
          fairness check, it is checked again first.
        </li>
      </ol>
      <p>
        A ruleset made by a player reaches a tournament only through the same checklist:{' '}
        <a href={GOVERNANCE_URL} target="_blank" rel="noopener noreferrer">
          Governance, submitted rulesets
        </a>
        .
      </p>
      <h3>How games are played</h3>
      <p>
        Until online play (Phase 5), tournament games are hot-seat or over the board. A tournament
        invitation carries the link to the ruleset. After a game, Save game record downloads it as a
        file you can send the organizer; Open game record replays it.
      </p>
      <h3>Conduct</h3>
      <p>
        No conduct rules are published yet (clock, draw offers, touch-move, disputes). The organizer
        announces them with the invitation.
      </p>
    </article>
  );
}
