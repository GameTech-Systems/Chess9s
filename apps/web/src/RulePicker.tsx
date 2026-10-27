import { useState } from 'react';
import { listRulesets, type RulesetInfo } from './game/rules';
import { rulesPath } from './links';
import { JoinByCode } from './JoinByCode';

/** Pick a ruleset before a game. 3-player presets play hot-seat only until the 3-seat room (S63). */
export function RulePicker({
  onPick,
  onPlayOnline,
  onJoinRoom,
  linkTo,
  customs = [],
  onBuild,
  onEdit,
  onDelete,
}: {
  onPick: (ruleset: RulesetInfo) => void;
  /** Make an online room for a ruleset (S53). */
  onPlayOnline?: (ruleset: RulesetInfo) => void;
  /** Go to the room with this code. */
  onJoinRoom?: (code: string) => void;
  /** In-app navigation for the rules links. */
  linkTo?: (to: string) => (e: React.MouseEvent) => void;
  /** The player's own rulesets, kept in this browser. */
  customs?: RulesetInfo[];
  /** Open the builder with a new draft. */
  onBuild?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const card = (r: RulesetInfo) => (
    <li
      key={r.id}
      className="ruleset"
      data-playable={r.playable ? '' : undefined}
      data-custom={r.custom ? '' : undefined}
    >
      <div className="ruleset-head">
        <strong>{r.name}</strong>
        {r.defaultFor && (
          <span className="default-tag">
            {r.defaultFor === 3 ? 'Default for 3 players' : 'Default'}
          </span>
        )}
        <span className="badge" data-status={r.status}>
          {r.status}
        </span>
      </div>
      <p className="facts small">
        {r.custom ? 'Your own ruleset' : `${r.id} v${r.version}`} · {r.players} players
      </p>
      {r.description && <p className="facts">{r.description}</p>}
      <div className="ruleset-actions">
        {r.playable ? (
          <button type="button" className="again" onClick={() => onPick(r)}>
            Play
          </button>
        ) : (
          <p className="facts small">Not playable yet</p>
        )}
        {r.online && onPlayOnline && (
          <button type="button" className="again" onClick={() => onPlayOnline(r)}>
            Play online
          </button>
        )}
        <a href={rulesPath(r.id)} onClick={linkTo?.(rulesPath(r.id))}>
          Rules
        </a>
        {r.custom && (
          <>
            <button type="button" className="again" onClick={() => onEdit?.(r.id)}>
              Edit
            </button>
            {deleting === r.id ? (
              <>
                <button
                  type="button"
                  className="again"
                  onClick={() => {
                    setDeleting(null);
                    onDelete?.(r.id);
                  }}
                >
                  Delete {r.name}?
                </button>
                <button type="button" className="again" onClick={() => setDeleting(null)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="again" onClick={() => setDeleting(r.id)}>
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
  return (
    <section className="picker" aria-labelledby="picker-title">
      <h2 id="picker-title">Choose a ruleset</h2>
      <ul>{listRulesets().map(card)}</ul>
      <h3 id="custom-title">Your rulesets</h3>
      {customs.length > 0 ? (
        <ul aria-labelledby="custom-title">{customs.map(card)}</ul>
      ) : (
        <p className="facts">None yet. Start from a preset and change what you like.</p>
      )}
      <div className="ruleset-actions">
        <button type="button" className="again" onClick={onBuild}>
          Build a ruleset
        </button>
      </div>
      {onJoinRoom && <JoinByCode onJoin={onJoinRoom} />}
    </section>
  );
}
