// A room (S51): one online game between two seats, as a state machine over the engine. Pure: the
// server (S52) keeps a Room per room code, feeds it each message with the seat of the connection
// it came on, and delivers what comes out. Every input is checked; a bad one is refused with a
// reason and leaves the room as it was. Nothing here throws on a player's input.
//
// Conduct (D51, provisional): resign and draw by agreement; no takebacks; untimed; a seat that
// goes away keeps its seat and the game stays open. Seats (D52, provisional): the creator picks a
// side or random; no spectators. A room has a seat for each side of its game: two, or three for a
// 3-player ruleset (S63, D61). There, a resignation puts the seat out and the others play on, and
// draws by agreement are not offered (decision 0018). The creator may give one or two seats to the
// computer: the creator's browser holds their tokens and plays them, and the room checks those
// moves as it checks a person's.
import {
  agreeDraw,
  endedBy,
  newGame,
  playMove,
  replayResignations,
  resign,
  resolveFileOverrides,
  RulesError,
  toNotation,
  type GameResult,
  type GameState,
  type MoveRules,
  type RulesData,
} from '@chess9s/engine';
import {
  RANDOM_SEAT,
  parseClientMessage,
  refused,
  type BundledRef,
  type ClientMessage,
  type CustomRef,
  type Ended,
  type Refusal,
  type RoomResignation,
  type RoomRuleset,
  type SeatStatus,
  type ServerMessage,
  type Snapshot,
} from './protocol';
import { newSeatToken, randomIndex, sameToken, type RandomBytes } from './secrets';

/** A custom ruleset's id and version in a room: it has no file and no versions of its own. */
export const CUSTOM_ID = 'custom';
export const CUSTOM_VERSION = '1.0.0';

export interface Seat {
  /** The seat's secret; null while the seat is open. */
  token: string | null;
  /** A connection holds the seat now. */
  present: boolean;
}

export interface Room {
  code: string;
  ruleset: RoomRuleset;
  game: GameState;
  /** By side id, one per side of the game. */
  seats: Record<string, Seat>;
  /** The seat whose draw offer stands. */
  drawOffer: string | null;
  /** Seats whose last offer was declined: they may offer again once they have moved. */
  offerWait: string[];
  /** Seats the creator's browser plays for the computer (3-seat rooms). */
  computer: string[];
}

/** Who a message goes to: the connection it answers, or every connection of a seat. */
export type Recipient = 'sender' | { seat: string };
export interface Outgoing {
  to: Recipient;
  message: ServerMessage;
}

/** A room after one input: the room (null while none was created), the sender's seat, what to send. */
export interface Step {
  room: Room | null;
  seat: string | null;
  out: Outgoing[];
}

export interface RoomContext {
  data: RulesData;
  random: RandomBytes;
  /** The code the server routes this room by. */
  code: string;
}

type Ok<T> = { ok: true } & T;
type Refused = { ok: false; reason: Refusal; problem: string };
const no = (reason: Refusal, problem: string): Refused => ({ ok: false, reason, problem });

/** The rules a room plays, from a bundled ruleset reference or a custom ruleset's overrides. */
export function roomRules(
  data: RulesData,
  ref: BundledRef | CustomRef,
): Ok<{ rules: MoveRules; ruleset: RoomRuleset }> | Refused {
  if ('overrides' in ref) {
    // Untrusted input, read as strictly as a ruleset file (S42): known parameters, listed options.
    const read = resolveFileOverrides(data.registry, ref.name.trim(), ref.overrides);
    if (!read.ok) return no('invalid-ruleset', read.problem);
    return {
      ok: true,
      rules: data.rulesWith(read.values),
      ruleset: {
        id: CUSTOM_ID,
        version: CUSTOM_VERSION,
        name: read.name,
        overrides: read.overrides,
      },
    };
  }
  const found = data.find(ref.id, ref.version);
  if (!found) return no('unknown-ruleset', `There is no ruleset ${ref.id} ${ref.version}.`);
  if (found.ruleset.players !== 2 && found.ruleset.players !== 3) {
    return no('invalid-ruleset', `${found.ruleset.name} is not playable online.`);
  }
  try {
    // An archived version plays from its lock (S45).
    const rules = data.rules(ref.id, ref.version);
    return {
      ok: true,
      rules,
      ruleset: { id: ref.id, version: ref.version, name: found.ruleset.name },
    };
  } catch (e) {
    return no(
      'invalid-ruleset',
      e instanceof RulesError ? e.message : 'The ruleset could not be read.',
    );
  }
}

const startGame = (rules: MoveRules, ruleset: RoomRuleset): GameState =>
  newGame(rules, {
    id: ruleset.id,
    version: ruleset.version,
    ...(ruleset.overrides && { overrides: ruleset.overrides }),
  });

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A game replayed from its ruleset, moves, resignations (3-seat rooms) and result (a snapshot, a
 * saved room): every move and resignation checked by the engine, each made where it was made,
 * and the result the replay gives must be the one given.
 */
export function replayGame(
  data: RulesData,
  ruleset: RoomRuleset,
  moves: readonly string[],
  result: GameResult,
  resignations: readonly RoomResignation[] = [],
): Ok<{ game: GameState }> | { ok: false; problem: string } {
  const ref: BundledRef | CustomRef = ruleset.overrides
    ? { name: ruleset.name, overrides: ruleset.overrides }
    : { id: ruleset.id, version: ruleset.version };
  const read = roomRules(data, ref);
  if (!read.ok) return { ok: false, problem: read.problem };
  try {
    let game = startGame(read.rules, read.ruleset);
    // A resignation is a seat going out, which only a game with three seats has.
    if (resignations.length > 0 && game.order.length !== 3) {
      return { ok: false, problem: 'This game has no resignations to replay.' };
    }
    game = replayResignations(game, resignations);
    for (const [i, notation] of moves.entries()) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      if (!move) return { ok: false, problem: `Move ${i + 1} (${notation}) is not legal.` };
      game = playMove(game, move);
      game = replayResignations(game, resignations);
    }
    if (game.resignations.length !== resignations.length) {
      return { ok: false, problem: 'The resignations do not match the moves.' };
    }
    game = endedBy(game, result) ?? game;
    if (!same(game.result, result)) {
      return { ok: false, problem: 'The result does not match the moves.' };
    }
    return { ok: true, game };
  } catch {
    return { ok: false, problem: 'The game could not be replayed on its ruleset.' };
  }
}

/** The game a snapshot describes, replayed: what a client shows after joining or reconnecting. */
export const replaySnapshot = (data: RulesData, snapshot: Snapshot) =>
  replayGame(data, snapshot.ruleset, snapshot.moves, snapshot.result, snapshot.resignations);

const statusOf = (seat: Seat): SeatStatus =>
  seat.token === null ? 'open' : seat.present ? 'present' : 'away';

/** The seats that resigned a 3-seat game, as a snapshot and a saved room list them. */
export const resignationsOf = (game: GameState): RoomResignation[] =>
  game.resignations.map(({ side, after }) => ({ side, after }));

/**
 * What a seat is shown of the room. The token goes only to its own seat, and only when asked; the
 * computer seats' tokens go only to the creator, in the reply that makes the room.
 */
export function snapshotFor(
  room: Room,
  seat: string,
  withToken = false,
  withComputerTokens = false,
): Snapshot {
  const token = room.seats[seat]?.token;
  const resignations = resignationsOf(room.game);
  return {
    v: 1,
    type: 'snapshot',
    code: room.code,
    seat,
    ...(withToken && token ? { token } : {}),
    ruleset: room.ruleset,
    moves: room.game.moves.map((m) => m.notation),
    result: room.game.result,
    // In turn order, which is the order joiners are seated in: a preview shows the seat they get.
    seats: Object.fromEntries(room.game.order.map((side) => [side, statusOf(room.seats[side]!)])),
    drawOffer: room.drawOffer,
    ...(resignations.length > 0 && { resignations }),
    ...(room.computer.length > 0 && { computer: room.computer }),
    ...(withComputerTokens &&
      room.computer.length > 0 && {
        computerTokens: Object.fromEntries(
          room.computer.map((side) => [side, room.seats[side]!.token!]),
        ),
      }),
  };
}

const toSender = (message: ServerMessage): Outgoing => ({ to: 'sender', message });
const toSeat = (seat: string, message: ServerMessage): Outgoing => ({ to: { seat }, message });
const toAll = (room: Room, message: ServerMessage): Outgoing[] =>
  room.game.order.map((seat) => toSeat(seat, message));
const others = (room: Room, seat: string) => room.game.order.filter((s) => s !== seat);

/** A seat came or went. With three seats the message names it; with two it is the other one. */
const presence = (room: Room, seat: string, status: 'present' | 'away'): ServerMessage => ({
  v: 1,
  type: 'opponent',
  status,
  ...(room.game.order.length > 2 && { side: seat }),
});

const refuse = (
  room: Room | null,
  seat: string | null,
  reason: Refusal,
  problem: string,
): Step => ({
  room,
  seat,
  out: [toSender(refused(reason, problem))],
});

/** Open a room with the creator in their chosen seat. */
function openRoom(ctx: RoomContext, msg: Extract<ClientMessage, { type: 'create' }>): Step {
  const read = roomRules(ctx.data, msg.ruleset);
  if (!read.ok) return refuse(null, null, read.reason, read.problem);
  let game: GameState;
  try {
    game = startGame(read.rules, read.ruleset);
  } catch (e) {
    const problem = e instanceof RulesError ? e.message : 'The game could not be started.';
    return refuse(null, null, 'invalid-ruleset', problem);
  }
  const sides = [...game.order].sort();
  const computer = msg.computer ?? [];
  if (computer.length > 0) {
    if (sides.length < 3) {
      return refuse(null, null, 'computer-seats', 'Only 3-player games can have computer seats.');
    }
    const unknown = computer.find((s) => !sides.includes(s));
    if (unknown !== undefined) {
      return refuse(null, null, 'unknown-seat', `This game has no seat ${unknown}.`);
    }
    if (computer.length >= sides.length) {
      return refuse(null, null, 'computer-seats', 'A person must have a seat.');
    }
  }
  const people = sides.filter((s) => !computer.includes(s));
  const seat =
    msg.seat === RANDOM_SEAT ? people[randomIndex(ctx.random, people.length)]! : msg.seat;
  if (!sides.includes(seat)) {
    return refuse(null, null, 'unknown-seat', `This game has no seat ${seat}.`);
  }
  if (computer.includes(seat)) {
    return refuse(null, null, 'computer-seats', "Your own seat cannot be the computer's.");
  }
  const seats: Record<string, Seat> = Object.fromEntries(
    sides.map((s) => [s, { token: null, present: false }]),
  );
  seats[seat] = { token: newSeatToken(ctx.random), present: true };
  // The computer's seats are taken now, so no one else can: they are away until the creator's
  // browser connects to them with these tokens.
  for (const side of computer) seats[side] = { token: newSeatToken(ctx.random), present: false };
  const room: Room = {
    code: ctx.code,
    ruleset: read.ruleset,
    game,
    seats,
    drawOffer: null,
    offerWait: [],
    computer,
  };
  return { room, seat, out: [toSender(snapshotFor(room, seat, true, true))] };
}

const withSeat = (room: Room, seat: string, s: Seat): Room => ({
  ...room,
  seats: { ...room.seats, [seat]: s },
});

/** Take an open seat, or with a token take back one's own seat. */
function joinRoom(
  ctx: RoomContext,
  room: Room,
  msg: Extract<ClientMessage, { type: 'join' }>,
): Step {
  if (msg.code !== room.code) return refuse(room, null, 'wrong-room', 'This is another room.');
  let seat: string | undefined;
  let fresh = false;
  if (msg.token !== undefined) {
    // Every seat is compared, so the time taken does not say which seat (if any) matched.
    for (const side of room.game.order) {
      const token = room.seats[side]!.token;
      if (token !== null && sameToken(token, msg.token)) seat = side;
    }
    if (seat === undefined)
      return refuse(room, null, 'bad-token', 'That seat token is not valid here.');
  } else {
    seat = room.game.order.find((side) => room.seats[side]!.token === null);
    if (seat === undefined) return refuse(room, null, 'room-full', 'Both seats are taken.');
    fresh = true;
  }
  const was = room.seats[seat]!;
  const next = withSeat(room, seat, {
    token: fresh ? newSeatToken(ctx.random) : was.token,
    present: true,
  });
  const out = [toSender(snapshotFor(next, seat, fresh))];
  if (!was.present) {
    for (const other of others(next, seat)) {
      if (next.seats[other]!.token !== null) {
        out.push(toSeat(other, presence(next, seat, 'present')));
      }
    }
  }
  return { room: next, seat, out };
}

/** A seat's connection closed: the seat stays its own (D51: no forfeit for a disconnection). */
export function leave(room: Room, seat: string): Step {
  const s = Object.hasOwn(room.seats, seat) ? room.seats[seat]! : null;
  if (!s || !s.present) return { room, seat, out: [] };
  const next = withSeat(room, seat, { ...s, present: false });
  return {
    room: next,
    seat,
    out: others(next, seat)
      .filter((other) => next.seats[other]!.token !== null)
      .map((other) => toSeat(other, presence(next, seat, 'away'))),
  };
}

const gameOver = (room: Room): Outgoing[] =>
  room.game.result.status === 'ongoing'
    ? []
    : toAll(room, { v: 1, type: 'game-over', result: room.game.result as Ended });

type GameMessage = Exclude<ClientMessage, { type: 'create' | 'join' }>;

/** A seated player's move, resignation or draw message. */
function act(room: Room, seat: string, msg: GameMessage): Step {
  const fail = (reason: Refusal, problem: string) => refuse(room, seat, reason, problem);
  const { game } = room;
  if (game.result.status !== 'ongoing') return fail('game-over', 'The game is over.');
  if (game.order.some((side) => room.seats[side]!.token === null)) {
    return fail('waiting-for-opponent', 'The other seat is still open.');
  }
  switch (msg.type) {
    case 'move': {
      if (game.turn !== seat) return fail('not-your-turn', 'It is not your turn.');
      const move = game.legal.find((m) => toNotation(m) === msg.move);
      if (!move) return fail('illegal-move', `${msg.move} is not a legal move.`);
      // A move by the seat a draw was offered to declines the offer.
      const lapsed = room.drawOffer !== null && room.drawOffer !== seat;
      const next: Room = {
        ...room,
        game: playMove(game, move),
        drawOffer: lapsed ? null : room.drawOffer,
        offerWait: room.offerWait.filter((s) => s !== seat),
      };
      return {
        room: next,
        seat,
        out: [
          ...toAll(next, { v: 1, type: 'move', move: msg.move, side: seat }),
          ...(lapsed ? toAll(next, { v: 1, type: 'decline-draw', side: seat }) : []),
          ...gameOver(next),
        ],
      };
    }
    case 'resign': {
      if (game.order.length > 2) {
        if (game.seats[seat] === 'out') return fail('seat-out', 'You are already out of the game.');
        // The seat's pieces turn to stone and the others play on, unless that ends the game.
        const next: Room = { ...room, game: resign(game, seat) };
        return {
          room: next,
          seat,
          out: [...toAll(next, { v: 1, type: 'resigned', side: seat }), ...gameOver(next)],
        };
      }
      const next: Room = { ...room, game: resign(game, seat), drawOffer: null };
      return { room: next, seat, out: gameOver(next) };
    }
    case 'offer-draw':
    case 'accept-draw':
    case 'decline-draw':
      if (game.order.length > 2) {
        // Decision 0018: agreed draws stay refused in 3-player games.
        return fail('draw-unavailable', 'Draws by agreement are not offered in 3-player games.');
      }
      return drawMessage(room, seat, msg, fail);
  }
}

/** A draw offer, acceptance or decline in a 2-seat room. */
function drawMessage(
  room: Room,
  seat: string,
  msg: Extract<GameMessage, { type: 'offer-draw' | 'accept-draw' | 'decline-draw' }>,
  fail: (reason: Refusal, problem: string) => Step,
): Step {
  const { game } = room;
  switch (msg.type) {
    case 'offer-draw': {
      if (room.drawOffer !== null) return fail('offer-pending', 'A draw offer already stands.');
      if (room.offerWait.includes(seat)) {
        return fail(
          'offer-again-later',
          'Your last offer was declined: move before offering again.',
        );
      }
      const next: Room = { ...room, drawOffer: seat };
      return { room: next, seat, out: toAll(next, { v: 1, type: 'offer-draw', side: seat }) };
    }
    case 'accept-draw':
    case 'decline-draw': {
      const offeredBy = room.drawOffer;
      if (offeredBy === null || offeredBy === seat) {
        return fail('no-offer', 'There is no draw offer to answer.');
      }
      if (msg.type === 'accept-draw') {
        const next: Room = { ...room, game: agreeDraw(game), drawOffer: null };
        return { room: next, seat, out: gameOver(next) };
      }
      const next: Room = { ...room, drawOffer: null, offerWait: [...room.offerWait, offeredBy] };
      return { room: next, seat, out: toAll(next, { v: 1, type: 'decline-draw', side: seat }) };
    }
  }
}

/**
 * One message from a connection: `seat` is the seat it holds (null before it creates or joins).
 * Parses, checks and applies it; anything wrong is refused to the sender and changes nothing.
 */
export function receive(
  ctx: RoomContext,
  room: Room | null,
  seat: string | null,
  text: string,
): Step {
  const parsed = parseClientMessage(text);
  if (!parsed.ok) return { room, seat, out: [toSender(parsed.refused)] };
  const msg = parsed.message;
  try {
    if (msg.type === 'create') {
      if (room) return refuse(room, seat, 'room-exists', 'This room has already been created.');
      return openRoom(ctx, msg);
    }
    if (!room) return refuse(null, seat, 'no-room', 'There is no room with this code.');
    if (msg.type === 'join') {
      if (seat !== null) return refuse(room, seat, 'already-seated', 'You already hold a seat.');
      return joinRoom(ctx, room, msg);
    }
    if (seat === null || !Object.hasOwn(room.seats, seat)) {
      return refuse(room, seat, 'not-seated', 'Join the room before playing.');
    }
    return act(room, seat, msg);
  } catch {
    // The checks above leave the engine nothing to refuse; this keeps a bug from closing the room.
    return refuse(room, seat, 'malformed', 'The message could not be applied.');
  }
}
