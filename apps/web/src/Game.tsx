import { useEffect, useMemo, useRef, useState } from 'react';
import { unbuiltFeatures } from '@chess9s/engine';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';
import { createRules, ruleset } from './game/rules';
import {
  cancelPromotion,
  click,
  highlights,
  newModel,
  promote,
  rounds,
  statusLine,
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

/** `initial` starts the screen from a given game (tests); otherwise a new game. */
export function Game({ initial }: { initial?: Model }) {
  const rules = useMemo(createRules, []);
  const [model, setModel] = useState(() => initial ?? newModel(rules));
  const [view, setView] = useState<View>('light');
  const { game, promoting } = model;
  const over = game.result.status !== 'ongoing';
  const seat = view === 'follow' ? game.turn : view;
  const missing = unbuiltFeatures(rules);
  const lost = Object.entries(game.lost);
  const list = useRef<HTMLOListElement>(null);
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
          onClick={() => setModel(newModel(rules))}
          data-over={over ? '' : undefined}
        >
          New game
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
    </div>
  );
}
