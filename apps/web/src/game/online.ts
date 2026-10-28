// The online session (S53): the browser's side of a room, as pure functions over a model. The
// server decides everything; the browser replays what it is told through the same engine, so a
// snapshot or a move that does not fit this app's rules means the app is out of date, not that
// the game is wrong. A move the player clicks is played on the board at once (so the game feels
// as it does hot-seat) and sent; the server's echo confirms it, and a refusal takes it back with
// the reason. React only draws this and wires the socket (connection.ts).
//
// Clocks (S66): the room keeps them on the server's time. The browser shows each seat's time left
// as the server last sent it, running the seat to move from when that message arrived here; it
// never sets a clock and never drops a flag. The server says when a seat ran out of time.
import {
  endedBy,
  isClocked,
  outSeats,
  playMove,
  replayResignations,
  resign,
  snapshot as timesAt,
  timedFlag,
  timeOut,
  toNotation,
  type GameState,
  type TimeControl,
  type Timed,
  type Times,
} from '@chess9s/engine';
import type {
  ClientMessage,
  Refusal,
  RoomRuleset,
  SeatStatus,
  ServerMessage,
  Snapshot,
} from '@chess9s/online/protocol';
import type { Highlights } from '../board/view';
import type { ClosedWhy, Status } from './connection';
import { createRulesFor, same } from './rules';
import {
  cancelPromotion as cancelPick,
  click,
  highlights,
  newModel,
  promote,
  statusLine,
  type Model,
} from './session';
import { controlById } from './timeControls';

export type Closed = ClosedWhy | 'desync' | 'lost';

export interface Online {
  code: string;
  /** The side this browser plays. */
  seat: string;
  ruleset: RoomRuleset;
  /** The game and the board's selection and play aids; a snapshot replaces the game only. */
  model: Model;
  seats: Record<string, SeatStatus>;
  /** The seat whose draw offer stands. */
  drawOffer: string | null;
  /** 3-seat rooms: the seats the creator's browser plays for the computer. */
  computer: string[];
  /** The game before a move that was sent and not yet confirmed. */
  pending: GameState | null;
  /** The last thing the server refused, in its words. */
  notice: string | null;
  connection: Status;
  /** Set when the session cannot go on and why. */
  closed: Closed | null;
  /** The room's time control (S66); null when untimed. A clocked one runs in `model.timed`. */
  control: TimeControl | null;
  /** Running out of time is shown and play goes on. */
  showOnly: boolean;
  /** The abandonment control: when (this browser's time) each seat away now would be out. */
  away: Record<string, number>;
}

/** The game a room's ruleset, moves and result describe, replayed here; null when it does not replay. */
function replay(
  ruleset: RoomRuleset,
  moves: readonly string[],
  result: Snapshot['result'],
  resignations: Snapshot['resignations'] = [],
) {
  try {
    const { id, version, name, overrides } = ruleset;
    const info = { id, version, name, ...(overrides && { overrides }) };
    let { game } = newModel(createRulesFor(info), info);
    // A resignation is a seat going out, which only a 3-seat game has.
    if (resignations.length > 0 && game.order.length !== 3) return null;
    game = replayResignations(game, resignations);
    for (const notation of moves) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      if (!move) return null;
      game = playMove(game, move);
      game = replayResignations(game, resignations);
    }
    if (game.resignations.length !== resignations.length) return null;
    game = endedBy(game, result) ?? game;
    return same(game.result, result) ? game : null;
  } catch {
    return null;
  }
}

const until = (away: Times, now: number): Record<string, number> =>
  Object.fromEntries(Object.entries(away).map(([side, ms]) => [side, now + ms]));

/**
 * The clock shown at `now` with each seat's time left `left` (the server's, just arrived), or as
 * it reads now. The seat to move runs once every seat is taken, unless it is out of time or out.
 */
function retime(o: Online, now: number, left?: Times): Online {
  const timed = o.model.timed;
  if (!timed) return o;
  const { game } = o.model;
  const ongoing = game.result.status === 'ongoing';
  const out = outSeats(game.seats);
  const { flagged } = timed.clock;
  const runs =
    ongoing &&
    Object.values(o.seats).every((s) => s !== 'open') &&
    !flagged.includes(game.turn) &&
    !out.includes(game.turn);
  const clock = {
    ...timed.clock,
    left: left ?? timesAt(timed.clock, now),
    turn: ongoing ? game.turn : null,
    since: runs ? now : null,
    out,
  };
  return { ...o, model: { ...o.model, timed: { ...timed, clock } } };
}

/** Each seat's time left after the move just played, kept for the game record. */
const withLeft = (o: Online, left: Times | undefined): Online =>
  left && o.model.timed
    ? {
        ...o,
        model: { ...o.model, timed: { ...o.model.timed, lefts: [...o.model.timed.lefts, left] } },
      }
    : o;

/**
 * The session a snapshot starts at `now`, or null when this app cannot replay it (an unknown
 * ruleset or time control, a move that is not legal here): the app is older than the server.
 * `aids` keeps the player's choices across a reconnect.
 */
export function startOnline(
  snapshot: Snapshot,
  aids?: Pick<Model, 'showMoves' | 'showDanger'>,
  connection: Status = 'connecting',
  now = Date.now(),
): Online | null {
  const game = replay(snapshot.ruleset, snapshot.moves, snapshot.result, snapshot.resignations);
  if (!game) return null;
  const time = snapshot.time;
  const control = time ? controlById(time.control) : null;
  if (control === undefined) return null;
  const showOnly = time?.showOnly === true;
  const timed: Timed | null =
    control && isClocked(control) && time?.left
      ? {
          control,
          showOnly,
          clock: {
            control,
            left: time.left,
            turn: null,
            since: null,
            flagged: time.flagged ?? [],
            out: [],
          },
          lefts: time.lefts ?? [],
        }
      : null;
  const online: Online = {
    code: snapshot.code,
    seat: snapshot.seat,
    ruleset: snapshot.ruleset,
    model: {
      game,
      selected: null,
      promoting: null,
      choosing: null,
      history: [],
      showMoves: aids?.showMoves ?? true,
      showDanger: aids?.showDanger ?? false,
      timed,
    },
    seats: snapshot.seats,
    drawOffer: snapshot.drawOffer,
    computer: snapshot.computer ?? [],
    pending: null,
    notice: null,
    connection,
    closed: null,
    control,
    showOnly,
    away: until(time?.away ?? {}, now),
  };
  return retime(online, now, time?.left);
}

/** For each seat whose time away counts (the abandonment control), how long until it is out. */
export const awayLeft = (o: Online, now: number): Times =>
  Object.fromEntries(Object.entries(o.away).map(([side, at]) => [side, Math.max(0, at - now)]));

/** The clock for the game record: only when it has the times of every move played. */
export const onlineTimed = (o: Online): Timed | null => {
  const timed = o.model.timed;
  return timed && timed.lefts.length === o.model.game.moves.length ? timed : null;
};

const ongoing = (o: Online) => o.model.game.result.status === 'ongoing';

/** The side across the board. */
export const opponentOf = (o: Online): string =>
  o.model.game.order.find((side) => side !== o.seat) ?? o.seat;

/** The seat is out of a 3-seat game (resigned or its King captured): it watches the rest. */
export const mySeatOut = (o: Online): boolean => o.model.game.seats[o.seat] === 'out';

/** Whether a click on the board may start or finish a move now. */
export const canPlay = (o: Online): boolean =>
  o.connection === 'open' &&
  o.closed === null &&
  ongoing(o) &&
  o.pending === null &&
  o.model.game.turn === o.seat &&
  !mySeatOut(o) &&
  Object.values(o.seats).every((s) => s !== 'open');

/** Buttons that send something other than a move (resign, draw offers) wait for the same things. */
export const canAct = (o: Online): boolean =>
  o.connection === 'open' &&
  o.closed === null &&
  ongoing(o) &&
  o.pending === null &&
  !mySeatOut(o) &&
  Object.values(o.seats).every((s) => s !== 'open');

export const setConnection = (o: Online, connection: Status, why?: ClosedWhy): Online => ({
  ...o,
  connection,
  closed: why ?? o.closed,
});

/** The model after a click or a promotion pick, with the move it made (if any) as a message to send. */
function moved(o: Online, model: Model): { online: Online; send?: ClientMessage } {
  const game = model.game;
  if (game.moves.length === o.model.game.moves.length + 1) {
    const move = game.moves.at(-1)!.notation;
    return {
      online: { ...o, model, pending: o.model.game, notice: null },
      send: { v: 1, type: 'move', move },
    };
  }
  return { online: { ...o, model } };
}

/**
 * The board's click handling without the clock: online, the server keeps the time and decides a
 * flag fall (a move that arrives late is refused there), so a click here only plays the move.
 */
const unclocked = (o: Online, act: (m: Model) => Model): Model => ({
  ...act({ ...o.model, timed: null }),
  timed: o.model.timed,
});

/** A click on a square. Only the player's own turn, on an open connection, does anything. */
export function pressSquare(o: Online, at: string): { online: Online; send?: ClientMessage } {
  if (!canPlay(o)) return { online: o };
  return moved(
    o,
    unclocked(o, (m) => click(m, at)),
  );
}

/** The player picked a promotion piece. */
export function choosePromotion(
  o: Online,
  piece: string,
): { online: Online; send?: ClientMessage } {
  if (!canPlay(o) || !o.model.promoting) return { online: o };
  const model = unclocked(o, (m) => promote(m, piece));
  return model.game === o.model.game && model.promoting === o.model.promoting
    ? { online: o }
    : moved(o, model);
}

export const cancelPromotion = (o: Online): Online => ({ ...o, model: cancelPick(o.model) });

/** The game as the server has it: without a move the server has not confirmed. */
const settled = (o: Online): Online =>
  o.pending
    ? {
        ...o,
        model: { ...o.model, game: o.pending, selected: null, promoting: null },
        pending: null,
      }
    : o;

/** The board back to what the server has, with the reason a move did not go through. */
export const takeBack = (o: Online, notice: string): Online => ({ ...settled(o), notice });

const desync = (o: Online): Online => ({ ...o, closed: 'desync' });

/** What a message from the server, arriving at `now`, does to the session. */
export function applyServer(o: Online, message: ServerMessage, now = Date.now()): Online {
  switch (message.type) {
    case 'snapshot': {
      const next = startOnline(message, o.model, o.connection, now);
      return next ? { ...next, closed: o.closed } : { ...o, closed: 'outdated' };
    }
    case 'move': {
      if (message.side === o.seat && o.pending) {
        // The echo of the move already on the board.
        const last = o.model.game.moves.at(-1)?.notation;
        if (last !== message.move) return desync(o);
        return retime(withLeft({ ...o, pending: null }, message.left), now, message.left);
      }
      const game = o.model.game;
      const move = game.legal.find((m) => toNotation(m) === message.move);
      if (!move || message.side !== game.turn) return desync(o);
      const next: Online = {
        ...o,
        model: { ...o.model, game: playMove(game, move), selected: null, promoting: null },
        notice: null,
      };
      return retime(withLeft(next, message.left), now, message.left);
    }
    case 'opponent': {
      // With three seats the message names the seat; with two it is the one across the board.
      const seats = { ...o.seats, [message.side ?? opponentOf(o)]: message.status };
      // The last player to arrive starts the clock.
      return retime({ ...o, seats }, now);
    }
    case 'resigned':
      return retime(seatOut(o, message.side, resign), now, message.left);
    case 'out-of-time': {
      const timed = o.model.timed;
      if (o.showOnly && timed) {
        const flagged = { ...o, model: { ...o.model, timed: timedFlag(timed, message.side) } };
        return retime(flagged, now, message.left);
      }
      return retime(seatOut(o, message.side, timeOut), now, message.left);
    }
    case 'away':
      return { ...o, away: until(message.away, now) };
    case 'offer-draw':
      return { ...o, drawOffer: message.side };
    case 'decline-draw':
      return { ...o, drawOffer: null };
    case 'game-over': {
      const back = settled(o);
      const game = endedBy(back.model.game, message.result) ?? back.model.game;
      const over: Online = {
        ...back,
        model: { ...back.model, game, selected: null, promoting: null },
        drawOffer: null,
        away: {},
      };
      return retime(over, now);
    }
    case 'refused':
      return refusal(o, message.reason, message.message);
  }
}

/**
 * A seat resigned a 3-seat game, or ran out of time (D66): it is out, and the others play on (or
 * the game ends). With two seats running out of time ends the game here too; the game-over follows.
 */
function seatOut(o: Online, side: string, how: typeof resign): Online {
  // A move the player sent and the server has not confirmed is put back on the changed game.
  const server = o.pending ?? o.model.game;
  let game: GameState;
  try {
    game = how(server, side);
  } catch {
    return desync(o);
  }
  let shown = game;
  if (o.pending) {
    const mine = o.model.game.moves.at(-1)?.notation;
    const again = game.legal.find((m) => toNotation(m) === mine);
    if (again) shown = playMove(game, again);
  }
  return {
    ...o,
    pending: o.pending ? game : null,
    model: { ...o.model, game: shown, selected: null, promoting: null },
    notice: null,
  };
}

function refusal(o: Online, reason: Refusal, text: string): Online {
  if (reason === 'version') return { ...o, closed: 'outdated' };
  if (reason === 'no-room') return { ...o, closed: 'gone' };
  if (reason === 'bad-token') return { ...o, closed: 'lost' };
  // While a move is out, its refusal comes first; the board goes back to what the server has.
  return takeBack(o, text);
}

/** One line on the state of the room: connection, waiting, whose move, or how it ended. */
export function onlineStatus(o: Online): string {
  const { game } = o.model;
  const threeSeats = game.order.length > 2;
  if (game.result.status !== 'ongoing') {
    const { result } = game;
    // With three seats the result card says who won and how; only two seats have "you lose".
    const mine =
      !threeSeats && result.status === 'win'
        ? result.winner === o.seat
          ? ' · you win'
          : ' · you lose'
        : '';
    return `${statusLine(game)}${mine}`;
  }
  if (o.connection === 'connecting') return 'Connecting…';
  if (o.connection === 'reconnecting') return 'Reconnecting…';
  const open = Object.values(o.seats).filter((s) => s === 'open').length;
  if (open > 0) {
    return threeSeats
      ? `Waiting for ${open} more ${open === 1 ? 'player' : 'players'} to join`
      : 'Waiting for an opponent to join';
  }
  const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
  if (mySeatOut(o)) return `You are out · ${title(game.turn)} to move`;
  return game.turn === o.seat
    ? `Your move${game.inCheck ? ' · in check' : ''}`
    : `Waiting for ${title(game.turn)} to move`;
}

export type JoinProblemKind = 'gone' | 'full' | 'lost' | 'outdated' | 'other';
export const RELOAD_TEXT = 'Chess Nines has been updated. Reload to update.';
export const GONE_TEXT =
  'This room no longer exists. It may have expired, or the code may be wrong.';
export const FULL_TEXT = 'This room is full: every seat is taken.';
export const REPLACED_TEXT =
  'You joined this room from another window or device, so this one stopped.';
export const DESYNC_TEXT = 'This game and the server no longer agree. Reload to get back in sync.';
export const LOST_TEXT = 'Your seat in this room is no longer valid, so it cannot be taken back.';

/** What a refusal to join means for the page. */
export function joinProblem(
  reason: Refusal,
  message: string,
): { kind: JoinProblemKind; text: string } {
  switch (reason) {
    case 'no-room':
      return { kind: 'gone', text: GONE_TEXT };
    case 'room-full':
      return { kind: 'full', text: FULL_TEXT };
    case 'bad-token':
      return { kind: 'lost', text: LOST_TEXT };
    case 'version':
      return { kind: 'outdated', text: RELOAD_TEXT };
    default:
      return { kind: 'other', text: message };
  }
}

/** What the board shows: the usual marks, but nothing to pick up while it is the opponent's turn. */
export function onlineHighlights(o: Online): Highlights {
  const marks = highlights(o.model);
  return canPlay(o) ? marks : { ...marks, targets: [], movable: [] };
}
