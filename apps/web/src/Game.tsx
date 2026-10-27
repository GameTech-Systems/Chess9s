import { useEffect, useMemo, useRef, useState } from 'react';
import { unbuiltFeatures } from '@chess9s/engine';
import { RulesScreen } from './Rules';
import { JoinByCode } from './JoinByCode';
import { addSpent, formatElapsed, play, soundsFor } from './game/aids';
import { searchMove, type BotSearch } from './game/botClient';
import { BOT_LEVEL_3P, canToggleBot, followSeat, toggleBot, undoForHuman } from './game/bots';
import { clearGuest, loadGuest, saveGuest, type Mode, type Store } from './game/guest';
import { openRecord, saveRecordFile, type Opened } from './game/record';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';
import { DEFAULT_RULESET_ID, createRulesFor, listRulesets, type RulesetInfo } from './game/rules';
import { noticeLines, phaseLine, resultCard, seatLines } from './game/threeText';
import {
  canUndo,
  cancelPromotion,
  choose,
  click,
  highlights,
  newModel,
  playFor,
  fromGame,
  promote,
  rounds,
  statusLine,
  toggleDanger,
  toggleMoves,
  undo,
  type Model,
} from './game/session';

type View = 'light' | 'dark' | 'dragon' | 'follow';
const VIEWS: { id: View; label: string; players: 2 | 3 }[] = [
  { id: 'light', label: 'Light', players: 2 },
  { id: 'dark', label: 'Dark', players: 2 },
  { id: 'dragon', label: 'Dragon', players: 3 },
  { id: 'follow', label: 'Follow turn', players: 2 },
];

const pretty = (id: string) => id.replace(/-/g, ' ');
const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** Lost piece types with counts: "pawn ×3, rook". */
function lostLine(pieces: string[]): string {
  const counts = new Map<string, number>();
  for (const id of pieces) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, n]) => (n > 1 ? `${pretty(id)} ×${n}` : pretty(id))).join(', ');
}

function browserStore(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Pause before the computer moves, so the player sees their own move land. */
const BOT_DELAY_MS = 500;

/**
 * `ruleset` is the one being played (default: Standard, standard-2p). `initial` starts the screen from a given
 * game (tests); otherwise a new game. `onChangeRuleset` returns to the picker.
 */
export function Game({
  initial,
  ruleset = listRulesets().find((r) => r.id === DEFAULT_RULESET_ID)!,
  onChangeRuleset,
  onOpenRecord,
  onPlayOnline,
  onJoinRoom,
  store = browserStore(),
}: {
  initial?: Model;
  /** Where guest play is kept; the browser's localStorage by default. */
  store?: Store | null;
  ruleset?: RulesetInfo;
  onChangeRuleset?: () => void;
  /** A game record was opened; the app shows its game, on the ruleset it names. */
  onOpenRecord?: (record: Opened & { ok: true }) => void;
  /** Make an online room for this ruleset (S53). */
  onPlayOnline?: () => void;
  /** Go to the room with this code. */
  onJoinRoom?: (code: string) => void;
}) {
  const rules = useMemo(
    () => createRulesFor(ruleset),
    [ruleset.id, ruleset.version, ruleset.overrides],
  );
  const saved = useMemo(
    () => (initial || !store ? null : loadGuest(store, rules, ruleset)),
    // Read once, when the screen opens.
    [],
  );
  const [model, setModel] = useState(
    () => initial ?? (saved ? fromGame(saved.game) : newModel(rules, ruleset)),
  );
  const [mode, setMode] = useState<Mode>(saved?.mode ?? 'hot-seat');
  // 3-player games: the computer plays the seats in `bots`, at the Greedy level (S58).
  const [bots, setBots] = useState<string[]>(saved?.bots ?? []);
  // 3-player games turn the board to the side to move (each seat's view, D34); 2-player games
  // start on Light's view.
  const three = rules.players === 3;
  const [view, setView] = useState<View>(three ? 'follow' : 'light');
  const { game, promoting, choosing } = model;
  const over = game.result.status !== 'ongoing';
  const card = three ? resultCard(game) : null;
  const seat = view === 'follow' ? followSeat(game, bots) : view;
  const missing = unbuiltFeatures(rules);
  const lost = Object.entries(game.lost);
  const list = useRef<HTMLOListElement>(null);
  const [sound, setSound] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // 3-player games: the time each seat has had the move, for display only (untimed, decision 0017).
  const [spent, setSpent] = useState<Record<string, number>>({});
  const started = useRef(Date.now());
  const moveCount = useRef(game.moves.length);
  // Against the computer, the player has the side that moves first (2 players; S58 adds the
  // computer to 3-player games).
  const botSide = !three && mode === 'computer' ? game.order[1] : undefined;
  const botTurn =
    (botSide !== undefined ? game.turn === botSide : three && bots.includes(game.turn)) && !over;
  useEffect(() => {
    if (!botTurn) return;
    let search: BotSearch | undefined;
    const id = setTimeout(() => {
      // Search off-thread, and play the move only on the game it was found for.
      search = searchMove(game, (move) =>
        setModel((m) => (move && m.game === game ? playFor(m, move) : m)),
      );
    }, BOT_DELAY_MS);
    return () => {
      clearTimeout(id);
      search?.cancel();
    };
  }, [botTurn, game.moves.length]);
  // Keep the game in the browser.
  useEffect(() => {
    if (store) saveGuest(store, { game, mode, bots });
  }, [game.moves.length, mode, bots]);
  const picker = useRef<HTMLInputElement>(null);
  const [recordProblem, setRecordProblem] = useState<string | null>(null);
  const saveRecord = () => saveRecordFile(game, ruleset);
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const opened = openRecord(await file.text());
    if (opened.ok) {
      setRecordProblem(null);
      onOpenRecord?.(opened);
    } else setRecordProblem(opened.problem);
  };
  const restart = () => {
    if (store) clearGuest(store);
    setModel(newModel(rules, ruleset));
  };
  // Undo takes back the computer's reply too, so it is the player's turn again.
  const undoMove = () =>
    setModel((m) => {
      if (three) return undoForHuman(m, bots);
      const back = undo(m);
      return botSide !== undefined && back.game.turn === botSide ? undo(back) : back;
    });
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
      setSpent({});
    }
  }, [game.moves.length]);
  // Each second goes to the seat whose turn it is; the part second left when the turn changes
  // or the game ends goes to that seat too.
  useEffect(() => {
    if (!three || over) return;
    const side = game.turn;
    let last = Date.now();
    const take = () => {
      const now = Date.now();
      const ms = now - last;
      last = now;
      setSpent((s) => addSpent(s, side, ms));
    };
    const id = setInterval(take, 1000);
    return () => {
      clearInterval(id);
      take();
    };
  }, [three, over, game.turn]);
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
          players={rules.players}
          position={game.position}
          highlights={highlights(model)}
          onSquareClick={(at) => !botTurn && setModel((m) => click(m, at))}
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

        {three && (
          <ul className="seats" aria-label="Seats">
            {seatLines(game).map((s) => (
              <li
                key={s.side}
                data-seat={s.side}
                data-turn={s.toMove ? 'true' : 'false'}
                data-state={s.state}
              >
                <span className="seat-name">{s.name}</span>
                {bots.includes(s.side) && <span className="seat-bot">Computer</span>}
                <span className="seat-note">{s.text}</span>
                <span className="seat-time" aria-label={`${s.name} time`}>
                  {formatElapsed(spent[s.side] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {card && (
          <section className="result-card" aria-label="Result" data-tone={card.tone}>
            <h3>{card.heading}</h3>
            <p>{card.detail}</p>
          </section>
        )}

        {three &&
          !over &&
          noticeLines(game).map((line) => (
            <p key={line} className="facts notice" role="status">
              {line}
            </p>
          ))}
        {three && phaseLine(game) && <p className="facts phase">{phaseLine(game)}</p>}

        <p className="facts">
          Time <strong aria-label="Elapsed time">{formatElapsed(elapsed)}</strong>
          {three && ' · Untimed'}
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

        {choosing && (
          <div
            className="promotion"
            role="group"
            aria-label={
              choosing.kind === 'mate' ? 'Which piece checkmates the Tail' : 'The pawn becomes'
            }
          >
            <span>
              {choosing.kind === 'mate' ? 'Checkmate the Tail with' : 'The pawn swaps in as'}
            </span>
            {choosing.choices.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setModel((m) => choose(m, c.value))}
              >
                {choosing.kind === 'mate' ? c.label : title(pretty(c.label))}
              </button>
            ))}
            <button type="button" onClick={() => setModel(cancelPromotion)}>
              Cancel
            </button>
          </div>
        )}

        {!three && (
          <p className="facts">
            Coast: <strong>{game.coastOpen ? 'open' : 'closed'}</strong>
            {!game.coastOpen && !over && ' · move the Dragon Tail from a5 to e5 to open it'}
          </p>
        )}

        {lost.map(([side, pieces]) => (
          <p key={side} className="facts">
            {title(side)} lost: {lostLine(pieces)}
          </p>
        ))}

        {!three && (
          <div className="segmented" role="group" aria-label="Opponent">
            {(['hot-seat', 'computer'] as const).map((id) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>
                {id === 'computer' ? 'Computer' : 'Hot-seat'}
              </button>
            ))}
          </div>
        )}

        {three && (
          <>
            <div className="segmented" role="group" aria-label="Computer seats">
              {game.order.map((side) => (
                <button
                  key={side}
                  type="button"
                  aria-pressed={bots.includes(side)}
                  disabled={!canToggleBot(bots, side)}
                  onClick={() => setBots((b) => toggleBot(b, side))}
                >
                  {title(side)}
                </button>
              ))}
            </div>
            <p className="facts">
              Computer seats play at the <strong>{BOT_LEVEL_3P}</strong> level (no look-ahead).
            </p>
          </>
        )}

        <div className="segmented" role="group" aria-label="Board view">
          {VIEWS.filter((v) => (three ? true : v.players === 2)).map((v) => (
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
          <button type="button" disabled={!canUndo(model) || botTurn} onClick={undoMove}>
            Undo
          </button>
        </div>

        <ol className="moves" aria-label="Moves" ref={list}>
          {rounds(game).map((r) => (
            <li key={r.number} value={r.number}>
              <span>{r.first}</span>
              {r.second && <span>{r.second}</span>}
              {r.third && <span>{r.third}</span>}
            </li>
          ))}
        </ol>

        <button type="button" className="again" onClick={restart} data-over={over ? '' : undefined}>
          New game
        </button>

        <div className="segmented" role="group" aria-label="Game record">
          <button type="button" disabled={game.moves.length === 0} onClick={saveRecord}>
            Save game record
          </button>
          <button type="button" onClick={() => picker.current?.click()}>
            Open game record
          </button>
          <input
            ref={picker}
            type="file"
            hidden
            aria-label="Game record file"
            accept=".json,application/json"
            onChange={(e) => {
              void openFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        {recordProblem && (
          <p className="facts" role="alert">
            {recordProblem}
          </p>
        )}

        {onPlayOnline && !three && (
          <button type="button" className="again" onClick={onPlayOnline}>
            Play online
          </button>
        )}
        {onJoinRoom && <JoinByCode onJoin={onJoinRoom} />}

        <button type="button" className="again" onClick={onChangeRuleset}>
          Change ruleset
        </button>

        <p className="facts small">
          {ruleset.name} · {ruleset.id} v{ruleset.version} · {ruleset.status}
          {ruleset.custom && ' · your own, kept in this browser'}
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
