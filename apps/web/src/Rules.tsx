import { useEffect, useRef } from 'react';
import { rulesetSettings, type RulesetInfo } from './game/rules';
import { RULES_DOC_URL, rulesPath } from './links';

/** What every 2-player game shares; the ruleset's own settings follow. */
export const HOW_TO_PLAY = [
  'Pick one of your pieces, then a marked square to move it.',
  'The side whose King cannot escape check loses.',
  'The Coast starts closed; the status panel says when it opens.',
  "Each pawn's ring shows the color of the file it started on; the full rules say which colored squares keep it safe.",
  'Undo takes back one move; Show legal moves and Show danger help you look ahead.',
];

/** What every 3-player game shares (decision 0016); the ruleset's own settings follow. */
export const HOW_TO_PLAY_3P = [
  'Three sides take turns: Dark, Light, then the Dragon. Pick one of your pieces, then a marked square to move it.',
  "Dark and Light each have a King. The Dragon has the Dragon Heads, the Sun and the Moon, and its Tail, which plays the role of the Dragon's King.",
  "The Dragon's pieces start on the Coast, the blue file. Unless the settings below say otherwise, each one first leaves the Coast from A5, the Tail's square: the Tail goes first, the Sun and Moon step along the Coast to A5, and the Heads follow once the way is clear.",
  'The board turns to the side to move. The panel names each seat, who is out and what the last move did.',
  'A piece turned to stone stays where it is: it blocks, but never moves, attacks or is captured.',
  'Show danger also marks a King that a Dragon piece attacks when that is not check: the Dragon may capture it on its turn.',
  'Undo takes back one move. How the game ends, and what ends it in a draw, are among the settings below.',
];

/** The how-to-play lines for a game of this many players. */
export const howToPlay = (players: 2 | 3): string[] =>
  players === 3 ? HOW_TO_PLAY_3P : HOW_TO_PLAY;

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab and Shift+Tab inside the dialog while it is open. */
function trapTab(e: KeyboardEvent, box: HTMLElement | null) {
  const items = box ? [...box.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const at = document.activeElement;
  if (e.shiftKey && (at === first || at === box)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && at === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * The rules screen, opened from the "?" button. Rules come from the ruleset data, not this text:
 * the settings this ruleset changes, and a link to its full rules page.
 */
export function RulesScreen({
  ruleset,
  missing,
  onClose,
}: {
  ruleset: Pick<
    RulesetInfo,
    'name' | 'id' | 'version' | 'status' | 'description' | 'custom' | 'overrides'
  > & { players?: 2 | 3 };
  missing: string[];
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // The game re-renders every second (elapsed time), so the latest onClose is read from a ref
  // and focus is moved only when the dialog opens.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      } else if (e.key === 'Tab') {
        trapTab(e, box.current);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);
  const changed = rulesetSettings(ruleset).filter((s) => s.changed);
  return (
    <>
      <div className="rules-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={box}
        className="rules-screen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        tabIndex={-1}
      >
        <h2 id="rules-title">{ruleset.name}</h2>
        <p className="meta">
          {ruleset.id} v{ruleset.version} ·{' '}
          <span className="badge" data-status={ruleset.status}>
            {ruleset.status}
          </span>
        </p>
        {ruleset.description && <p>{ruleset.description}</p>}
        <h3>How to play</h3>
        <ul>
          {howToPlay(ruleset.players ?? 2).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3>What this ruleset changes</h3>
        {changed.length === 0 ? (
          <p>Every setting at its default (the Chess Nines defaults in the rules guide).</p>
        ) : (
          <ul>
            {changed.map((s) => (
              <li key={s.id}>
                <strong>{s.label}</strong>: {s.valueLabel}{' '}
                <span className="meta">(default {s.defaultLabel})</span>
              </li>
            ))}
          </ul>
        )}
        <p className="rules-links">
          {/* A custom ruleset lives in this browser's storage; its page opens in the app only. */}
          {!ruleset.custom && (
            <a href={rulesPath(ruleset.id)} target="_blank" rel="noopener">
              Full rules for {ruleset.name}
            </a>
          )}
          <a href={RULES_DOC_URL} target="_blank" rel="noopener noreferrer">
            Rules guide on GitHub
          </a>
        </p>
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
        <button type="button" className="close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
