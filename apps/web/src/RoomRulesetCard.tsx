import { rulesPath } from './links';
import { differences } from './game/custom';
import { DEFAULT_RULESET_ID, customValues, findRuleset, rulesetValues } from './game/rules';

/** The ruleset of a room as the pages that show it before play name it. */
export interface RoomRulesetLike {
  id: string;
  version: string;
  name: string;
  overrides?: Record<string, unknown> | undefined;
}

/**
 * A ruleset's name, version and badge. A ruleset the creator built says "Unofficial" and what
 * differs from Standard; a bundled one links to its rules page.
 */
export function RoomRulesetCard({
  ruleset,
  linkTo,
}: {
  ruleset: RoomRulesetLike;
  linkTo?: ((to: string) => (e: React.MouseEvent) => void) | undefined;
}) {
  const custom = ruleset.overrides !== undefined;
  const bundled = custom ? undefined : findRuleset(ruleset.id, ruleset.version);
  const status = custom ? 'proposed' : bundled?.status;
  const diffs = custom
    ? differences(
        rulesetValues(DEFAULT_RULESET_ID),
        customValues({
          id: ruleset.id,
          name: ruleset.name,
          overrides: ruleset.overrides as Parameters<typeof customValues>[0]['overrides'],
        }),
      )
    : [];
  return (
    <div className="ruleset" data-playable="">
      <div className="ruleset-head">
        <strong>{ruleset.name}</strong>
        {status && (
          <span className="badge" data-status={status}>
            {status}
          </span>
        )}
      </div>
      <p className="facts small">
        {custom ? 'A ruleset the creator built' : `${ruleset.id} v${ruleset.version}`}
      </p>
      {custom && (
        <>
          <p className="facts">
            <strong>Unofficial</strong>: this ruleset is not fairness-checked and is not a
            tournament ruleset.
          </p>
          <p className="facts small">Differs from Standard:</p>
          {diffs.length > 0 ? (
            <ul className="facts small">
              {diffs.map((d) => (
                <li key={d.id}>
                  {d.label}: {d.from} → {d.to}
                </li>
              ))}
            </ul>
          ) : (
            <p className="facts small">Nothing: it plays like Standard.</p>
          )}
        </>
      )}
      {bundled && (
        <a href={rulesPath(bundled.id)} onClick={linkTo?.(rulesPath(bundled.id))}>
          Rules
        </a>
      )}
    </div>
  );
}
