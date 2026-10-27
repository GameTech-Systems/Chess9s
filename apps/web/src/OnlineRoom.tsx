import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RoomRulesetCard } from './RoomRulesetCard';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';
import { play, soundsFor } from './game/aids';
import { socketUrl } from './game/api';
import type { SocketLike } from './game/connection';
import type { Store } from './game/guest';
import {
  DESYNC_TEXT,
  RELOAD_TEXT,
  REPLACED_TEXT,
  canAct,
  onlineHighlights,
  onlineStatus,
  opponentOf,
  type Online,
} from './game/online';
import { saveRecordFile } from './game/record';
import { RoomController, type Phase } from './game/roomController';
import { roomInviteMailto, roomPath } from './game/share';
import { rounds } from './game/session';

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

function browserStore(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

type LinkTo = (to: string) => (e: React.MouseEvent) => void;

const PROBLEM_TITLES = {
  gone: 'Room not found',
  full: 'Room is full',
  offline: 'Could not connect',
  lost: 'Seat not available',
  outdated: 'Update needed',
  other: 'Room closed',
} as const;

/** The room cannot be shown or played: what is wrong, and the one thing to do about it. */
function RoomProblem({
  phase,
  onRetry,
  onLeave,
  linkTo,
}: {
  phase: Extract<Phase, { kind: 'problem' }>;
  onRetry: () => void;
  onLeave: () => void;
  linkTo?: LinkTo | undefined;
}) {
  return (
    <section className="picker" aria-labelledby="room-title">
      <h2 id="room-title">{PROBLEM_TITLES[phase.problem]}</h2>
      <p className="facts" role="alert">
        {phase.text}
      </p>
      <div className="ruleset-actions">
        {phase.problem === 'offline' && (
          <button type="button" className="again" onClick={onRetry}>
            Try again
          </button>
        )}
        {phase.problem === 'outdated' && (
          <button type="button" className="again" onClick={() => window.location.reload()}>
            Reload
          </button>
        )}
        <a
          href="/"
          onClick={(e) => {
            linkTo?.('/')(e);
            onLeave();
          }}
        >
          Back to the game
        </a>
      </div>
    </section>
  );
}

/** A room with an open seat, shown before the player takes it. */
function RoomPreview({
  phase,
  onJoin,
  linkTo,
}: {
  phase: Extract<Phase, { kind: 'preview' }>;
  onJoin: () => void;
  linkTo?: LinkTo | undefined;
}) {
  const { info, side } = phase;
  return (
    <section className="picker" aria-labelledby="room-title">
      <h2 id="room-title">Join a game</h2>
      <RoomRulesetCard ruleset={info.ruleset} linkTo={linkTo} />
      <p className="facts">
        You will play <strong>{title(side)}</strong>.
      </p>
      <div className="ruleset-actions">
        <button type="button" className="again" onClick={onJoin}>
          Take the {title(side)} seat
        </button>
      </div>
    </section>
  );
}

/** The room's link, its code and an invitation by email: shown while the other seat is open. */
function Invite({ online, origin }: { online: Online; origin: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${origin}${roomPath(online.code)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // The field is selectable: the player can copy it by hand.
    }
  };
  return (
    <div className="invite">
      <p className="facts">
        Send this link, or the room code <strong>{online.code}</strong>, to your opponent.
      </p>
      <input
        readOnly
        aria-label="Room link"
        value={link}
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="ruleset-actions">
        <button type="button" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a href={roomInviteMailto({ code: online.code, ruleset: online.ruleset }, origin)}>
          Invite by email
        </a>
      </div>
    </div>
  );
}

const SEAT_WORDS = { present: 'connected', away: 'away', open: 'not joined yet' } as const;

/** The game: the board turned to the player's side, and the panel beside it. */
function OnlineGame({
  online,
  controller,
  origin,
  onLeave,
}: {
  online: Online;
  controller: RoomController;
  origin: string;
  onLeave: () => void;
}) {
  const { game, promoting } = online.model;
  const over = game.result.status !== 'ongoing';
  const opponent = opponentOf(online);
  const waiting = online.seats[opponent] === 'open';
  const [resigning, setResigning] = useState(false);
  const [sound, setSound] = useState(true);
  const list = useRef<HTMLOListElement>(null);
  const moveCount = useRef(game.moves.length);
  useEffect(() => {
    const before = moveCount.current;
    moveCount.current = game.moves.length;
    if (sound) play(soundsFor(before, game.moves.length, over));
  }, [game.moves.length]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [game.moves.length]);
  useEffect(() => {
    if (over) setResigning(false);
  }, [over]);
  const acts = canAct(online);
  const offer = online.drawOffer;
  const { ruleset } = online;
  const status = online.model.game.ruleset.overrides ? 'proposed' : undefined;

  return (
    <div className="table">
      <div className="table-board">
        <Board
          board={boardData}
          pieceLetters={pieceLetters}
          seat={online.seat}
          position={game.position}
          highlights={onlineHighlights(online)}
          onSquareClick={(at) => controller.press(at)}
        />
      </div>

      <aside className="panel" aria-label="Online game">
        <p
          className="status"
          role="status"
          data-result={game.result.status}
          data-check={game.inCheck ? '' : undefined}
        >
          {onlineStatus(online)}
        </p>

        {online.closed === 'outdated' && (
          <p className="facts banner" role="alert">
            {RELOAD_TEXT}{' '}
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </p>
        )}
        {online.closed === 'desync' && (
          <p className="facts banner" role="alert">
            {DESYNC_TEXT}{' '}
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </p>
        )}
        {online.closed === 'replaced' && (
          <p className="facts banner" role="alert">
            {REPLACED_TEXT}
          </p>
        )}
        {online.notice && (
          <p className="facts banner" role="alert">
            {online.notice}
          </p>
        )}

        <p className="facts">
          You play <strong>{title(online.seat)}</strong> · Opponent{' '}
          <strong>{SEAT_WORDS[online.seats[opponent] ?? 'open']}</strong>
        </p>

        {promoting && (
          <div className="promotion" role="group" aria-label="Promote the pawn to">
            <span>Promote to</span>
            {promoting.choices.map((piece) => (
              <button key={piece} type="button" onClick={() => controller.promote(piece)}>
                {title(piece.replace(/-/g, ' '))}
              </button>
            ))}
            <button type="button" onClick={() => controller.cancelPromotion()}>
              Cancel
            </button>
          </div>
        )}

        {waiting && !over && <Invite online={online} origin={origin} />}
        {!waiting && (
          <p className="facts small">
            Room <strong>{online.code}</strong>
          </p>
        )}

        {!over && !waiting && (
          <div className="conduct" role="group" aria-label="Resign or draw">
            {resigning ? (
              <>
                <span className="facts">Resign this game?</span>
                <button
                  type="button"
                  disabled={!acts}
                  onClick={() => {
                    setResigning(false);
                    controller.resign();
                  }}
                >
                  Yes, resign
                </button>
                <button type="button" onClick={() => setResigning(false)}>
                  Keep playing
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={!acts} onClick={() => setResigning(true)}>
                  Resign
                </button>
                {offer === null && (
                  <button type="button" disabled={!acts} onClick={() => controller.offerDraw()}>
                    Offer draw
                  </button>
                )}
                {offer === online.seat && <span className="facts">Draw offered</span>}
                {offer !== null && offer !== online.seat && (
                  <>
                    <span className="facts">{title(offer)} offers a draw</span>
                    <button type="button" disabled={!acts} onClick={() => controller.acceptDraw()}>
                      Accept draw
                    </button>
                    <button type="button" disabled={!acts} onClick={() => controller.declineDraw()}>
                      Decline
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="segmented" role="group" aria-label="Play aids">
          <button
            type="button"
            aria-pressed={online.model.showMoves}
            onClick={() => controller.toggleMoves()}
          >
            Show legal moves
          </button>
          <button
            type="button"
            aria-pressed={online.model.showDanger}
            onClick={() => controller.toggleDanger()}
          >
            Show danger
          </button>
          <button type="button" aria-pressed={sound} onClick={() => setSound((v) => !v)}>
            Sound
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

        <div className="segmented" role="group" aria-label="Game record">
          <button
            type="button"
            disabled={game.moves.length === 0}
            onClick={() => saveRecordFile(game, ruleset)}
          >
            Save game record
          </button>
        </div>

        <button type="button" className="again" onClick={onLeave}>
          Leave room
        </button>

        <p className="facts small">
          {ruleset.name} · {ruleset.id} v{ruleset.version}
          {status ? ' · Unofficial' : ''}
        </p>
      </aside>
    </div>
  );
}

/**
 * The page at /room/<code> (S53): looks for the room, previews it, joins it and plays. All the
 * logic is in `RoomController`; this draws its phase. A `controller` is passed in tests.
 */
export function OnlineRoom({
  code,
  controller,
  store = browserStore(),
  origin = typeof window === 'undefined' ? '' : window.location.origin,
  onLeave = () => {},
  linkTo,
}: {
  code: string;
  controller?: RoomController;
  store?: Store | null;
  origin?: string;
  /** The player leaves the room page (back to the game). */
  onLeave?: () => void;
  linkTo?: LinkTo;
}) {
  const room = useMemo(
    () =>
      controller ??
      new RoomController({
        code,
        store,
        fetch: (url, init) => fetch(url, init),
        // The browser's WebSocket has more events than the connection listens to.
        open: () => new WebSocket(socketUrl(window.location, code)) as unknown as SocketLike,
      }),
    [controller, code],
  );
  const phase = useSyncExternalStore(room.subscribe, room.getSnapshot, room.getSnapshot);
  useEffect(() => {
    void room.start();
    // Back on the network, or the page shown again: reconnect now rather than after the wait.
    const nudge = () => room.nudge();
    window.addEventListener('online', nudge);
    document.addEventListener('visibilitychange', nudge);
    return () => {
      window.removeEventListener('online', nudge);
      document.removeEventListener('visibilitychange', nudge);
      room.stop();
    };
  }, [room]);
  switch (phase.kind) {
    case 'loading':
      return (
        <p className="facts" role="status">
          Looking for the room…
        </p>
      );
    case 'joining':
      return (
        <p className="facts" role="status">
          Connecting to the room…
        </p>
      );
    case 'problem':
      return (
        <RoomProblem
          phase={phase}
          onRetry={() => void room.start()}
          onLeave={onLeave}
          linkTo={linkTo}
        />
      );
    case 'preview':
      return <RoomPreview phase={phase} onJoin={() => room.join()} linkTo={linkTo} />;
    case 'playing':
      return (
        <OnlineGame online={phase.online} controller={room} origin={origin} onLeave={onLeave} />
      );
  }
}
