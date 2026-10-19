import { useEffect, useMemo, useRef, useState } from 'react';
import { unbuiltFeatures } from '@chess9s/engine';
import { RulesScreen } from './Rules';
import { formatElapsed, play, soundsFor } from './game/aids';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';
import { DEFAULT_RULESET_ID, createRules, listRulesets, type RulesetInfo } from './game/rules';
import {
  canUndo,
  cancelPromotion,
  click,
  highlights,
  newModel,
  promote,
  rounds,
  statusLine,
  toggleDanger,
  toggleMoves,
  undo,
  type Model,
} from './game/session';

type View = 'light' | 'dark' | 'follow';
const VIEWS: { id: View; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'follow', label: 'Follow turn' },
];

const pretty = (id: string) => id.replace(/-/g, ' ');
const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** Lost piece types with counts: "pawn ×3, rook". */
function lostLine(pieces: string[]): string {
  const counts = new Map<string, number>();
  for (const id of pieces) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, n]) => (n > 1 ? `${pretty(id)} ×${n}` : pretty(id))).join(', ');
}

/**
 * `ruleset` is the one being played (default draft-2p). `initial` starts the screen from a given
 * game (tests); otherwise a new game. `onChangeRuleset` returns to the picker.
 */
export function Game({
  initial,
  ruleset = listRulesets().find((r) => r.id === DEFAULT_RULESET_ID)!,
  onChangeRuleset,
}: {
  initial?: Model;
  ruleset?: RulesetInfo;
  onChangeRuleset?: () => void;
}) {
  const rules = useMemo(() => createRules(ruleset.id), [ruleset.id]);
  const [model, setModel] = useState(() => initial ?? newModel(rules, ruleset));
  const [view, setView] = useState<View>('light');
  const { game, promoting } = model;
  const over = game.result.status !== 'ongoing';
  const seat = view === 'follow' ? game.turn : view;
  const missing = unbuiltFeatures(rules);
  const lost = Object.entries(game.lost);
  const list = useRef<HTMLOListElement>(null);
  const [sound, setSound] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());
  const moveCount = useRef(game.moves.length);
  // Sound on each new move.
  useEffect(() => {
    const before = moveCount.current;
    moveCount.current = game.moves.length;
    if (sound) play(soundsFor(before, game.moves.length, over));
  }, [game.moves.length]);
  // Elapsed time since the game began; it stops at the end and restarts with a new game.
  useEffect(() => {
    if (game.moves.length === 0) {
      started.current = Date.now();
      setElapsed(0);
    }
  }, [game.moves.length]);
  useEffect(() => {
    if (over) return;
    const id = setInterval(() => setElapsed(Date.now() - started.current), 1000);
    return () => clearInterval(id);
  }, [over]);
  // Keep the latest move in view.
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [game.moves.length]);

  return (
    <div className="table">
      <div className="table-board">
        <Board
          board={boardData}
          pieceLetters={pieceLetters}
          seat={seat}
          position={game.position}
          highlights={highlights(model)}
          onSquareClick={(at) => setModel((m) => click(m, at))}
        />
      </div>

      <aside className="panel">
        <p
          className="status"
          role="status"
          data-result={game.result.status}
          data-check={game.inCheck ? '' : undefined}
        >
          {statusLine(game)}
        </p>

        <p className="facts">
          Time <strong aria-label="Elapsed time">{formatElapsed(elapsed)}</strong>
          <button
            type="button"
            className="help"
            aria-label="Rules"
            onClick={() => setShowRules(true)}
          >
            ?
          </button>
        </p>

        {promoting && (
          <div className="promotion" role="group" aria-label="Promote the pawn to">
            <span>Promote to</span>
            {promoting.choices.map((piece) => (
              <button key={piece} type="button" onClick={() => setModel((m) => promote(m, piece))}>
                {title(pretty(piece))}
              </button>
            ))}
            <button type="button" onClick={() => setModel(cancelPromotion)}>
              Cancel
            </button>
          </div>
        )}

        <p className="facts">
          Coast: <strong>{game.coastOpen ? 'open' : 'closed'}</strong>
          {!game.coastOpen && !over && ' · move the Dragon Tail from a5 to e5 to open it'}
        </p>

        {lost.map(([side, pieces]) => (
          <p key={side} className="facts">
            {title(side)} lost: {lostLine(pieces)}
          </p>
        ))}

        <div className="segmented" role="group" aria-label="Board view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="segmented" role="group" aria-label="Play aids">
          <button
            type="button"
            aria-pressed={model.showMoves}
            onClick={() => setModel(toggleMoves)}
          >
            Show legal moves
          </button>
          <button
            type="button"
            aria-pressed={model.showDanger}
            onClick={() => setModel(toggleDanger)}
          >
            Show danger
          </button>
          <button type="button" aria-pressed={sound} onClick={() => setSound((v) => !v)}>
            Sound
          </button>
          <button type="button" disabled={!canUndo(model)} onClick={() => setModel(undo)}>
            Undo
          </button>
        </div>

        <ol className="moves" aria-label="Moves" ref={list}>
          {rounds(game).map((r) => (
            <li key={r.number} value={r.number}>
              <span>{r.first}</span>
              {r.second && <span>{r.second}</span>}
            </li>
          ))}
        </ol>

        <button
          type="button"
          className="again"
          onClick={() => setModel(newModel(rules, ruleset))}
          data-over={over ? '' : undefined}
        >
          New game
        </button>

        <button type="button" className="again" onClick={onChangeRuleset}>
          Change ruleset
        </button>

        <p className="facts small">
          {ruleset.name} · {ruleset.id} v{ruleset.version} · {ruleset.status}
        </p>

        {missing.length > 0 && (
          <details className="missing">
            <summary>Not in this build yet ({missing.length})</summary>
            <ul>
              {missing.map((f) => (
                <li key={f.id}>{f.label}</li>
              ))}
            </ul>
          </details>
        )}
      </aside>
      {showRules && (
        <RulesScreen
          ruleset={ruleset}
          missing={missing.map((f) => f.label)}
          onClose={() => setShowRules(false)}
        />
      )}
    </div>
  );
}
