import { useEffect, useMemo, useRef, useState } from 'react';
import { deadline, unbuiltFeatures } from '@chess9s/engine';
import { RulesScreen } from './Rules';
import { JoinByCode } from './JoinByCode';
import { addSpent, formatElapsed, formatLeft, play, soundsFor } from './game/aids';
import { clockSeats, controlText } from './game/clockText';
import { controlById, hotSeatControls, timeControls } from './game/timeControls';
import { searchMove, type BotSearch } from './game/botClient';
import {
  LEVELS_3P,
  canToggleBot,
  followSeat,
  levelOf,
  toggleBot,
  undoForHuman,
  type Level3,
} from './game/bots';
import { clearGuest, loadGuest, saveGuest, type Mode, type Store } from './game/guest';
import { openRecord, saveRecordFile, type Opened } from './game/record';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';
import { DEFAULT_RULESET_ID, createRulesFor, listRulesets, type RulesetInfo } from './game/rules';
import {
  noticeLines,
  phaseLine,
  resignable,
  resignPrompt,
  resultCard,
  seatLines,
} from './game/threeText';
import {
  canUndo,
  cancelPromotion,
  choose,
  clockLines,
  click,
  highlights,
  isPaused,
  newModel,
  pauseTimed,
  playFor,
  fromGame,
  promote,
  resignFor,
  resumeTimed,
  rounds,
  startTimed,
  statusLine,
  tick,
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
    () => initial ?? (saved ? fromGame(saved.game, saved.timed ?? null) : newModel(rules, ruleset)),
  );
  const [mode, setMode] = useState<Mode>(saved?.mode ?? 'hot-seat');
  // 3-player games: the computer plays the seats in `bots` (S58), each at its level (S62).
  const [bots, setBots] = useState<string[]>(saved?.bots ?? []);
  const [levels, setLevels] = useState<Record<string, Level3>>(saved?.levels ?? {});
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
  // 3-player games: the seat whose Resign button was pressed and awaits its confirm step (S67).
  const [resigning, setResigning] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // 3-player games: the time each seat has had the move, for display only (untimed, decision 0017).
  const [spent, setSpent] = useState<Record<string, number>>({});
  const started = useRef(Date.now());
  const moveCount = useRef(game.moves.length);
  // Against the computer, the player has the side that moves first (2 players; S58 adds the
  // computer to 3-player games).
  const botSide = !three && mode === 'computer' ? game.order[1] : undefined;
  // A clock (S65): the Pause button stops it, and with it the computer and the board.
  const { timed } = model;
  const paused = isPaused(model);
  const botTurn =
    (botSide !== undefined ? game.turn === botSide : three && bots.includes(game.turn)) &&
    !over &&
    !paused;
  const [now, setNow] = useState(() => Date.now());
  const clocks = clockLines(model, now);
  const begun = game.moves.length > 0 || game.resignations.length > 0;
  useEffect(() => {
    if (!botTurn) return;
    let search: BotSearch | undefined;
    const id = setTimeout(() => {
      // Search off-thread, and play the move only on the game it was found for.
      search = searchMove(
        game,
        (move) => setModel((m) => (move && m.game === game ? playFor(m, move) : m)),
        three ? levelOf(game, levels, game.turn) : undefined,
      );
    }, BOT_DELAY_MS);
    return () => {
      clearTimeout(id);
      search?.cancel();
    };
  }, [botTurn, game, levels]);
  // Keep the game in the browser, with its clock: it comes back paused.
  const latest = useRef({ game, mode, bots, levels, timed });
  latest.current = { game, mode, bots, levels, timed };
  useEffect(() => {
    if (store) saveGuest(store, { game, mode, bots, levels, ...(timed && { timed }) });
    // A resignation is not a move, so the game itself is the sign that something changed.
  }, [game, mode, bots, levels, timed]);
  // Leaving the page keeps the time the running seat has used.
  useEffect(() => {
    if (!store || typeof window === 'undefined') return;
    const keep = () => {
      const { game: g, mode: md, bots: b, levels: l, timed: t } = latest.current;
      saveGuest(store, { game: g, mode: md, bots: b, levels: l, ...(t && { timed: t }) });
    };
    const hidden = () => document.visibilityState === 'hidden' && keep();
    window.addEventListener('pagehide', keep);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', keep);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  // The clock: the display follows it, and a seat whose time is up runs out (D66).
  const ticking = timed !== null && !paused && !over;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setModel((m) => tick(m, t));
    }, 250);
    return () => clearInterval(id);
  }, [ticking]);
  const due = timed && ticking ? deadline(timed.clock) : null;
  useEffect(() => {
    if (due === null) return;
    const id = setTimeout(
      () => {
        const t = Date.now();
        setNow(t);
        setModel((m) => tick(m, t));
      },
      Math.max(0, due - Date.now()),
    );
    return () => clearTimeout(id);
  }, [due]);
  const picker = useRef<HTMLInputElement>(null);
  const [recordProblem, setRecordProblem] = useState<string | null>(null);
  const saveRecord = () => saveRecordFile(game, ruleset, timed);
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
    // The time control chosen stays for the next game; its clock starts now.
    const fresh = newModel(rules, ruleset);
    setModel(timed ? startTimed(fresh, timed.control, timed.showOnly) : fresh);
  };
  // Undo takes back the computer's reply too, so it is the player's turn again.
  const undoMove = () =>
    setModel((m) => {
      if (three) return undoForHuman(m, bots);
      const back = undo(m);
      return botSide !== undefined && back.game.turn === botSide ? undo(back) : back;
    });
  // A pending resignation lapses when the game moves on (a move, an undo, a new game).
  useEffect(() => setResigning(null), [game]);
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
                {...(clocks.find((c) => c.side === s.side)?.flagged && { 'data-flag': 'true' })}
              >
                <span className="seat-name">{s.name}</span>
                <span className="seat-note">
                  {bots.includes(s.side) && (
                    <>
                      <span className="seat-bot">Computer</span>
                      {s.text && ' · '}
                    </>
                  )}
                  {s.text}
                  {clocks.find((c) => c.side === s.side)?.flagged &&
                    !s.text.includes('out of time') && <>{s.text && ' · '}out of time</>}
                </span>
                <span className="seat-time" aria-label={`${s.name} time`}>
                  {timed
                    ? formatLeft(clocks.find((c) => c.side === s.side)?.ms ?? 0)
                    : formatElapsed(spent[s.side] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!three && timed && (
          <ul className="seats" aria-label="Clocks">
            {clockSeats(clocks, over, game.turn).map((c) => (
              <li
                key={c.side}
                data-seat={c.side}
                data-turn={c.toMove ? 'true' : 'false'}
                {...(c.flagged && { 'data-flag': 'true' })}
              >
                <span className="seat-name">{c.name}</span>
                <span className="seat-note">{c.text}</span>
                <span className="seat-time" aria-label={`${c.name} time`}>
                  {formatLeft(c.ms)}
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
        {three && resignable(game, bots).length > 0 && (
          <div className="resign" role="group" aria-label="Resign">
            {resigning === null ? (
              <div className="segmented">
                {resignable(game, bots).map((side) => (
                  <button key={side} type="button" onClick={() => setResigning(side)}>
                    Resign as {title(side)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="promotion" role="alertdialog" aria-label="Confirm resignation">
                <span>{resignPrompt(game, resigning)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModel((m) => resignFor(m, resigning));
                    setResigning(null);
                  }}
                >
                  Confirm
                </button>
                <button type="button" onClick={() => setResigning(null)}>
                  Keep playing
                </button>
              </div>
            )}
          </div>
        )}
        {three && phaseLine(game) && <p className="facts phase">{phaseLine(game)}</p>}

        <p className="facts">
          Time <strong aria-label="Elapsed time">{formatElapsed(elapsed)}</strong>
          {three && !timed && ' · Untimed'}
          <button
            type="button"
            className="help"
            aria-label="Rules"
            onClick={() => setShowRules(true)}
          >
            ?
          </button>
        </p>

        {!begun && !over ? (
          <div className="timecontrol" role="group" aria-label="Time control">
            <label>
              Time control{' '}
              <select
                aria-label="Time control"
                value={timed?.control.id ?? timeControls.default}
                onChange={(e) => {
                  const control = controlById(e.target.value);
                  if (control) setModel((m) => startTimed(m, control, m.timed?.showOnly ?? false));
                }}
              >
                {hotSeatControls().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={timed?.showOnly ?? false}
                disabled={!timed}
                onClick={() =>
                  timed && setModel((m) => startTimed(m, timed.control, !timed.showOnly))
                }
              >
                Show only
              </button>
            </div>
          </div>
        ) : (
          timed && (
            <p className="facts">
              Time control: <strong>{controlText(timed)}</strong>
            </p>
          )
        )}
        {timed && !over && (
          <div className="segmented" role="group" aria-label="Clock">
            <button
              type="button"
              onClick={() => setModel((m) => (isPaused(m) ? resumeTimed(m) : pauseTimed(m)))}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        )}
        {paused && (
          <p className="facts notice" role="status">
            Paused. Press Resume to go on.
          </p>
        )}

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
            <p className="facts">
              Computer levels: <strong>Greedy</strong> takes the best move without looking ahead;{' '}
              <strong>Search</strong> looks ahead, as the 2-player computer does.
            </p>
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
            {game.order
              .filter((side) => bots.includes(side))
              .map((side) => (
                <div
                  key={side}
                  className="segmented"
                  role="group"
                  aria-label={`${title(side)} computer level`}
                >
                  <span className="segmented-label">{title(side)}:</span>
                  {LEVELS_3P.map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={levelOf(game, levels, side) === level}
                      onClick={() => setLevels((l) => ({ ...l, [side]: level }))}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              ))}
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
