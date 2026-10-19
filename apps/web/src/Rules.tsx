import type { RulesetInfo } from './game/rules';

/** The rules screen, opened from the "?" button. Rules come from the ruleset data, not this text. */
export function RulesScreen({
  ruleset,
  missing,
  onClose,
}: {
  ruleset: Pick<RulesetInfo, 'name' | 'id' | 'version' | 'status' | 'description'>;
  missing: string[];
  onClose: () => void;
}) {
  return (
    <div className="rules-screen" role="dialog" aria-modal="true" aria-label="Rules">
      <h2>{ruleset.name}</h2>
      <p className="facts small">
        {ruleset.id} v{ruleset.version} · {ruleset.status}
      </p>
      {ruleset.description && <p>{ruleset.description}</p>}
      <h3>How to play</h3>
      <ul>
        <li>Pick one of your pieces, then a marked square to move it.</li>
        <li>The side whose King cannot escape check loses.</li>
        <li>The Coast starts closed; the status panel says when it opens.</li>
        <li>Undo takes back one move; Show legal moves and Show danger help you look ahead.</li>
        <li>The full rules are in docs/RULES.md in the Chess Nines repository.</li>
      </ul>
      {missing.length > 0 && (
        <>
          <h3>Not in this build yet</h3>
          <ul>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
