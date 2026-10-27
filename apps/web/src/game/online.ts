// The online session (S53): the browser's side of a room, as pure functions over a model. The
// server decides everything; the browser replays what it is told through the same engine, so a
// snapshot or a move that does not fit this app's rules means the app is out of date, not that
// the game is wrong. A move the player clicks is played on the board at once (so the game feels
// as it does hot-seat) and sent; the server's echo confirms it, and a refusal takes it back with
// the reason. React only draws this and wires the socket (connection.ts).
import { endedBy, playMove, toNotation, type GameState } from '@chess9s/engine';
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
  /** The game before a move that was sent and not yet confirmed. */
  pending: GameState | null;
  /** The last thing the server refused, in its words. */
  notice: string | null;
  connection: Status;
  /** Set when the session cannot go on and why. */
  closed: Closed | null;
}

/** The game a room's ruleset, moves and result describe, replayed here; null when it does not replay. */
function replay(ruleset: RoomRuleset, moves: readonly string[], result: Snapshot['result']) {
  try {
    const { id, version, name, overrides } = ruleset;
    const info = { id, version, name, ...(overrides && { overrides }) };
    let { game } = newModel(createRulesFor(info), info);
    for (const notation of moves) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      if (!move) return null;
      game = playMove(game, move);
    }
    game = endedBy(game, result) ?? game;
    return same(game.result, result) ? game : null;
  } catch {
    return null;
  }
}

/**
 * The session a snapshot starts, or null when this app cannot replay it (an unknown ruleset, a
 * move that is not legal here): the app is older than the server. `aids` keeps the player's
 * choices across a reconnect.
 */
export function startOnline(
  snapshot: Snapshot,
  aids?: Pick<Model, 'showMoves' | 'showDanger'>,
  connection: Status = 'connecting',
): Online | null {
  const game = replay(snapshot.ruleset, snapshot.moves, snapshot.result);
  if (!game) return null;
  return {
    code: snapshot.code,
    seat: snapshot.seat,
    ruleset: snapshot.ruleset,
    model: {
      game,
      selected: null,
      promoting: null,
      history: [],
      showMoves: aids?.showMoves ?? true,
      showDanger: aids?.showDanger ?? false,
    },
    seats: snapshot.seats,
    drawOffer: snapshot.drawOffer,
    pending: null,
    notice: null,
    connection,
    closed: null,
  };
}

const ongoing = (o: Online) => o.model.game.result.status === 'ongoing';

/** The side across the board. */
export const opponentOf = (o: Online): string =>
  o.model.game.order.find((side) => side !== o.seat) ?? o.seat;

/** Whether a click on the board may start or finish a move now. */
export const canPlay = (o: Online): boolean =>
  o.connection === 'open' &&
  o.closed === null &&
  ongoing(o) &&
  o.pending === null &&
  o.model.game.turn === o.seat &&
  Object.values(o.seats).every((s) => s !== 'open');

/** Buttons that send something other than a move (resign, draw offers) wait for the same things. */
export const canAct = (o: Online): boolean =>
  o.connection === 'open' &&
  o.closed === null &&
  ongoing(o) &&
  o.pending === null &&
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

/** A click on a square. Only the player's own turn, on an open connection, does anything. */
export function pressSquare(o: Online, at: string): { online: Online; send?: ClientMessage } {
  if (!canPlay(o)) return { online: o };
  return moved(o, click(o.model, at));
}

/** The player picked a promotion piece. */
export function choosePromotion(
  o: Online,
  piece: string,
): { online: Online; send?: ClientMessage } {
  if (!canPlay(o) || !o.model.promoting) return { online: o };
  const model = promote(o.model, piece);
  return model === o.model ? { online: o } : moved(o, model);
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

/** What a message from the server does to the session. */
export function applyServer(o: Online, message: ServerMessage): Online {
  switch (message.type) {
    case 'snapshot': {
      const next = startOnline(message, o.model, o.connection);
      return next ? { ...next, closed: o.closed } : { ...o, closed: 'outdated' };
    }
    case 'move': {
      if (message.side === o.seat && o.pending) {
        // The echo of the move already on the board.
        const last = o.model.game.moves.at(-1)?.notation;
        return last === message.move ? { ...o, pending: null } : desync(o);
      }
      const game = o.model.game;
      const move = game.legal.find((m) => toNotation(m) === message.move);
      if (!move || message.side !== game.turn) return desync(o);
      return {
        ...o,
        model: { ...o.model, game: playMove(game, move), selected: null, promoting: null },
        notice: null,
      };
    }
    case 'opponent':
      return { ...o, seats: { ...o.seats, [opponentOf(o)]: message.status } };
    case 'offer-draw':
      return { ...o, drawOffer: message.side };
    case 'decline-draw':
      return { ...o, drawOffer: null };
    case 'game-over': {
      const back = settled(o);
      const game = endedBy(back.model.game, message.result) ?? back.model.game;
      return {
        ...back,
        model: { ...back.model, game, selected: null, promoting: null },
        drawOffer: null,
      };
    }
    case 'refused':
      return refusal(o, message.reason, message.message);
  }
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
  if (game.result.status !== 'ongoing') {
    const { result } = game;
    const mine =
      result.status === 'win' ? (result.winner === o.seat ? ' · you win' : ' · you lose') : '';
    return `${statusLine(game)}${mine}`;
  }
  if (o.connection === 'connecting') return 'Connecting…';
  if (o.connection === 'reconnecting') return 'Reconnecting…';
  if (Object.values(o.seats).some((s) => s === 'open')) return 'Waiting for an opponent to join';
  const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
  return game.turn === o.seat
    ? `Your move${game.inCheck ? ' · in check' : ''}`
    : `Waiting for ${title(game.turn)} to move`;
}

export type JoinProblemKind = 'gone' | 'full' | 'lost' | 'outdated' | 'other';
export const RELOAD_TEXT = 'Chess Nines has been updated. Reload to update.';
export const GONE_TEXT =
  'This room no longer exists. It may have expired, or the code may be wrong.';
export const FULL_TEXT = 'This room is full: both seats are taken.';
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
