import { listRulesets, type RulesetInfo } from './game/rules';

/** Pick a ruleset before a game. A ruleset the engine cannot play yet is listed, not offered. */
export function RulePicker({ onPick }: { onPick: (ruleset: RulesetInfo) => void }) {
  return (
    <section className="picker" aria-labelledby="picker-title">
      <h2 id="picker-title">Choose a ruleset</h2>
      <ul>
        {listRulesets().map((r) => (
          <li key={r.id} className="ruleset" data-playable={r.playable ? '' : undefined}>
            <div className="ruleset-head">
              <strong>{r.name}</strong>
              <span className="badge" data-status={r.status}>
                {r.status}
              </span>
            </div>
            <p className="facts small">
              {r.id} v{r.version} · {r.players} players
            </p>
            {r.description && <p className="facts">{r.description}</p>}
            {r.playable ? (
              <button type="button" className="again" onClick={() => onPick(r)}>
                Play
              </button>
            ) : (
              <p className="facts small">Not playable yet</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
