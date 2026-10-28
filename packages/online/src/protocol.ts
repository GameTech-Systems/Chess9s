// The online protocol (S51): versioned JSON messages between a player's browser and a room on
// the server. Every message is checked whole before it is used: a size cap, `v: 1`, a known type
// and exactly that type's keys with values of the right shape. Anything else becomes a `refused`
// message; nothing here throws on input. Side ids (light, dark) come from the board's data, so
// seats are checked against the game, not here.
import type {
  DrawReason,
  GameResult,
  ParamValue,
  Times,
  TimeoutDraw,
  WinReason,
} from '@chess9s/engine';

export const PROTOCOL_VERSION = 1;
/** A create message carries a custom ruleset's overrides, as large as a ruleset file (20 KB). */
export const MAX_CLIENT_MESSAGE_BYTES = 24_000;
/** A snapshot carries every move of the game. */
export const MAX_SERVER_MESSAGE_BYTES = 64_000;
export const MAX_RULESET_NAME = 40;

/** Room codes (D54, provisional): 6 characters, no look-alikes (no 0, O, 1, I, L). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 6;
const CODE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);
/** Whether a string is a well-formed room code (the server routes rooms by it). */
export const isRoomCode = (s: string): boolean => CODE.test(s);
/** A seat token: 32 random bytes as base64url. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** Whether a value is shaped like a seat token (a browser checks what it keeps before it uses it). */
export const isSeatToken = (v: unknown): v is string => typeof v === 'string' && TOKEN.test(v);
const SIDE = /^[a-z][a-z0-9-]{0,31}$/;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
/** Move notation: `e2-e4`, `e5xd6`, `d8-d9=queen`, `e1-g1/h1-f1`. */
const NOTATION = /^[a-z0-9x=/-]{1,48}$/;
/** A time control's id in rules/timeControls.json: `3+2`, `move30s`, `away5m`. */
const CONTROL = /^[A-Za-z0-9+-]{1,24}$/;

/** A ruleset in rules/rulesets/ (current or archived), by id and version. */
export interface BundledRef {
  id: string;
  version: string;
}

/** A ruleset a player built: a name and the overrides it plays (checked as untrusted input). */
export interface CustomRef {
  name: string;
  overrides: Record<string, unknown>;
}

/** The creator's seat: a side of the game, or `random` (D52, provisional default). */
export type SeatChoice = string;
export const RANDOM_SEAT = 'random';

/** Most seats the computer may play in a room (S63, D61): a person always has a seat. */
export const MAX_COMPUTER_SEATS = 2;

/** The time control a room is made with (S66, decision 0017): an id, and Show only. */
export interface TimeChoice {
  control: string;
  /** Running out of time is shown and play goes on. Left out when off. */
  showOnly?: true;
}

/**
 * A room's clock as a seat is shown it (S66). The room keeps the time; a browser only shows it.
 * Times are milliseconds, as of when the message was sent.
 */
export interface RoomTime extends TimeChoice {
  /** Fischer and per-move controls: each seat's time left. */
  left?: Times;
  /** Fischer and per-move controls: each seat's time left after each move, in move order. */
  lefts?: Times[];
  /** Show only: the seats that ran out of time and play on. */
  flagged?: string[];
  /** The abandonment control: for each seat whose time away is counting, how long until it is out. */
  away?: Times;
}

export type ClientMessage =
  | {
      v: 1;
      type: 'create';
      ruleset: BundledRef | CustomRef;
      seat: SeatChoice;
      /** 3-seat rooms: seats the creator's browser plays for the computer (S63). */
      computer?: string[];
      /** The time control (S66); untimed when left out (D51). */
      time?: TimeChoice;
    }
  /** Take an open seat, or with a token, take back one's own seat (reconnect). */
  | { v: 1; type: 'join'; code: string; token?: string }
  | { v: 1; type: 'move'; move: string }
  | { v: 1; type: 'resign' }
  | { v: 1; type: 'offer-draw' }
  | { v: 1; type: 'accept-draw' }
  | { v: 1; type: 'decline-draw' };

/** The ruleset a room plays, as the snapshot names it. A custom one carries its overrides. */
export interface RoomRuleset {
  id: string;
  version: string;
  name: string;
  overrides?: Record<string, ParamValue>;
}

export type SeatStatus = 'open' | 'present' | 'away';

/** A seat that resigned a 3-player game, and how many moves had been played (decision 0018). */
export interface RoomResignation {
  side: string;
  after: number;
  /** The seat ran out of time (S66, D66): out as after a resignation. */
  timeout?: true;
}

export interface Snapshot {
  v: 1;
  type: 'snapshot';
  code: string;
  /** The seat this snapshot is sent to. */
  seat: string;
  /** The seat's secret, sent only to its holder, and only when the seat is first taken. */
  token?: string;
  ruleset: RoomRuleset;
  moves: string[];
  result: GameResult;
  seats: Record<string, SeatStatus>;
  /** The seat whose draw offer stands, if any. */
  drawOffer: string | null;
  /** 3-seat rooms: the seats that resigned, in order (a resignation is not a move). Left out when none. */
  resignations?: RoomResignation[];
  /** 3-seat rooms: the seats the creator's browser plays for the computer. Left out when none. */
  computer?: string[];
  /** Only in the reply that makes a room: the computer seats' secrets, for the creator alone. */
  computerTokens?: Record<string, string>;
  /** The room's clock (S66). Left out for an untimed room. */
  time?: RoomTime;
}

/** What `GET /api/rooms/<code>` shows (S52): enough to decide to join (D54), never a token. */
export interface RoomInfo {
  v: 1;
  code: string;
  ruleset: RoomRuleset;
  seats: Record<string, SeatStatus>;
  result: GameResult;
  computer?: string[];
  /** The time control, shown before a player takes a seat (S66). Left out when untimed. */
  time?: TimeChoice;
}

export type Refusal =
  | 'too-large'
  | 'malformed'
  | 'version'
  | 'unknown-type'
  | 'no-room'
  | 'room-exists'
  | 'wrong-room'
  | 'unknown-ruleset'
  | 'invalid-ruleset'
  | 'unknown-seat'
  | 'room-full'
  | 'bad-token'
  | 'already-seated'
  | 'not-seated'
  | 'waiting-for-opponent'
  | 'game-over'
  | 'not-your-turn'
  | 'illegal-move'
  | 'offer-pending'
  | 'offer-again-later'
  | 'no-offer'
  | 'computer-seats'
  | 'seat-out'
  | 'draw-unavailable'
  | 'unknown-time-control'
  | 'out-of-time';

export type Ended = Exclude<GameResult, { status: 'ongoing' }>;

export type ServerMessage =
  | Snapshot
  /** A move; in a room with a clock, each seat's time left right after it (S66). */
  | { v: 1; type: 'move'; move: string; side: string; left?: Times }
  /** Another seat came or went; `side` names it in rooms with three seats (2-seat rooms leave it out). */
  | { v: 1; type: 'opponent'; status: 'present' | 'away'; side?: string }
  /** 3-seat rooms: a seat resigned and is out; the others play on (the game-over follows if that ended it). */
  | { v: 1; type: 'resigned'; side: string; left?: Times }
  /**
   * A seat ran out of time (S66, D66). With Show only it plays on; otherwise it is out: with two
   * seats the game-over follows, with three it is out as after a resignation.
   */
  | { v: 1; type: 'out-of-time'; side: string; left?: Times }
  /** The abandonment control: the seats whose time away is counting now, and how long each has. */
  | { v: 1; type: 'away'; away: Times }
  | { v: 1; type: 'offer-draw'; side: string }
  | { v: 1; type: 'decline-draw'; side: string }
  | { v: 1; type: 'refused'; reason: Refusal; message: string }
  | { v: 1; type: 'game-over'; result: Ended };

export type RefusedMessage = Extract<ServerMessage, { type: 'refused' }>;
export type Parsed<T> = { ok: true; message: T } | { ok: false; refused: RefusedMessage };

export const refused = (reason: Refusal, message: string): RefusedMessage => ({
  v: 1,
  type: 'refused',
  reason,
  message,
});

/**
 * The keep-alive (S52): a client sends exactly PING now and then, and the server answers PONG
 * without waking the room (Cloudflare's WebSocket auto-response). Neither is a protocol message:
 * compare the text before parsing. A seated socket with no message and no ping for a while is
 * closed as idle.
 */
export const PING = '{"v":1,"type":"ping"}';
export const PONG = '{"v":1,"type":"pong"}';

/** Close codes the server uses (S52). Idle: the client may reconnect with its seat token. */
export const CLOSE_IDLE = 4000;
/** The seat was taken back on another connection: reconnecting would take it back again. */
export const CLOSE_REPLACED = 4001;
/** The room was deleted (D53). */
export const CLOSE_GONE = 4002;

export const encode = (message: ClientMessage | ServerMessage): string => JSON.stringify(message);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Exactly these keys: every required one, some optional ones, nothing else. */
const keys = (o: Obj, required: string[], optional: string[] = []): boolean =>
  required.every((k) => Object.hasOwn(o, k)) &&
  Object.keys(o).every((k) => required.includes(k) || optional.includes(k));
const str = (v: unknown, pattern: RegExp): v is string => typeof v === 'string' && pattern.test(v);
const isName = (v: unknown): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.length <= MAX_RULESET_NAME;

// Records keep the reason lists in step with the engine's types: a new reason fails to compile.
const WIN_REASONS: Record<WinReason, true> = {
  checkmate: true,
  stalemate: true,
  resignation: true,
  // Running out of time (S65), in rooms with a clock (S66).
  timeout: true,
  // 3-player results (S56), played in 3-seat rooms (S63).
  'king-capture': true,
  'dragon-captured': true,
  'exposed-king': true,
};
const DRAW_REASONS: Record<DrawReason | 'agreement' | TimeoutDraw, true> = {
  stalemate: true,
  'insufficient-material': true,
  repetition: true,
  'fifty-move': true,
  agreement: true,
  'timeout-insufficient-material': true,
};

function isResult(v: unknown): v is GameResult {
  if (!isObj(v)) return false;
  switch (v.status) {
    case 'ongoing':
      return keys(v, ['status']);
    case 'win':
      return (
        keys(v, ['status', 'winner', 'loser', 'reason']) &&
        str(v.winner, SIDE) &&
        str(v.loser, SIDE) &&
        v.winner !== v.loser &&
        typeof v.reason === 'string' &&
        Object.hasOwn(WIN_REASONS, v.reason)
      );
    case 'draw':
      return (
        keys(v, ['status', 'reason'], ['between']) &&
        typeof v.reason === 'string' &&
        Object.hasOwn(DRAW_REASONS, v.reason) &&
        (v.between === undefined ||
          (Array.isArray(v.between) &&
            v.between.length >= 2 &&
            v.between.length <= 3 &&
            v.between.every((s) => str(s, SIDE)) &&
            new Set(v.between).size === v.between.length))
      );
    default:
      return false;
  }
}

/** One to MAX_COMPUTER_SEATS different sides. */
const isSides = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length >= 1 &&
  v.length <= MAX_COMPUTER_SEATS &&
  v.every((s) => str(s, SIDE)) &&
  new Set(v).size === v.length;

const MAX_MOVES = 100_000;
const isResignations = (v: unknown): v is RoomResignation[] =>
  Array.isArray(v) &&
  v.length >= 1 &&
  v.length <= 2 &&
  v.every(
    (r) =>
      isObj(r) &&
      keys(r, ['side', 'after'], ['timeout']) &&
      str(r.side, SIDE) &&
      (r.timeout === undefined || r.timeout === true) &&
      Number.isInteger(r.after) &&
      (r.after as number) >= 0 &&
      (r.after as number) <= MAX_MOVES,
  );

const isTokens = (v: unknown): v is Record<string, string> =>
  isObj(v) &&
  Object.keys(v).length >= 1 &&
  Object.keys(v).length <= MAX_COMPUTER_SEATS &&
  Object.entries(v).every(([k, t]) => SIDE.test(k) && str(t, TOKEN));

/** The longest time a clock can hold (3 days per move is the longest control), with room to spare. */
const MAX_TIME_MS = 30 * 24 * 3_600_000;
/** Milliseconds by seat: one to three seats, each a whole number of milliseconds or more. */
const isTimes = (v: unknown): v is Times =>
  isObj(v) &&
  Object.keys(v).length <= 3 &&
  Object.entries(v).every(
    ([k, t]) => SIDE.test(k) && typeof t === 'number' && t >= 0 && t <= MAX_TIME_MS,
  );
const isFilledTimes = (v: unknown): v is Times => isTimes(v) && Object.keys(v).length > 0;

const isTimeChoice = (v: unknown): v is TimeChoice =>
  isObj(v) &&
  keys(v, ['control'], ['showOnly']) &&
  str(v.control, CONTROL) &&
  (v.showOnly === undefined || v.showOnly === true);

/** A snapshot's clock: its per-move times must be one per move played. */
const isRoomTime = (v: unknown, moves: number): v is RoomTime =>
  isObj(v) &&
  keys(v, ['control'], ['showOnly', 'left', 'lefts', 'flagged', 'away']) &&
  isTimeChoice({
    control: v.control,
    ...(v.showOnly !== undefined && { showOnly: v.showOnly }),
  }) &&
  (v.left === undefined || isFilledTimes(v.left)) &&
  (v.lefts === undefined ||
    (Array.isArray(v.lefts) && v.lefts.length === moves && v.lefts.every(isFilledTimes))) &&
  (v.flagged === undefined ||
    (Array.isArray(v.flagged) &&
      v.flagged.length <= 3 &&
      v.flagged.every((s) => str(s, SIDE)) &&
      new Set(v.flagged).size === v.flagged.length)) &&
  (v.away === undefined || isTimes(v.away));

const isOverrides = (v: unknown): v is Obj => isObj(v) && !Object.hasOwn(v, '__proto__');

function isRulesetRef(v: unknown): v is BundledRef | CustomRef {
  if (!isObj(v)) return false;
  if (keys(v, ['id', 'version'])) return str(v.id, ID) && str(v.version, VERSION);
  return keys(v, ['name', 'overrides']) && isName(v.name) && isOverrides(v.overrides);
}

function isRoomRuleset(v: unknown): v is RoomRuleset {
  return (
    isObj(v) &&
    keys(v, ['id', 'version', 'name'], ['overrides']) &&
    str(v.id, ID) &&
    str(v.version, VERSION) &&
    isName(v.name) &&
    (v.overrides === undefined || isOverrides(v.overrides))
  );
}

const SEAT_STATUS = new Set(['open', 'present', 'away']);
const isSeats = (v: unknown): v is Record<string, SeatStatus> =>
  isObj(v) &&
  Object.keys(v).length > 0 &&
  Object.entries(v).every(([k, s]) => SIDE.test(k) && SEAT_STATUS.has(s as string));

// A record, so a reason added to Refusal fails to compile until it is listed here.
const REFUSAL_RECORD: Record<Refusal, true> = {
  'too-large': true,
  malformed: true,
  version: true,
  'unknown-type': true,
  'no-room': true,
  'room-exists': true,
  'wrong-room': true,
  'unknown-ruleset': true,
  'invalid-ruleset': true,
  'unknown-seat': true,
  'room-full': true,
  'bad-token': true,
  'already-seated': true,
  'not-seated': true,
  'waiting-for-opponent': true,
  'game-over': true,
  'not-your-turn': true,
  'illegal-move': true,
  'offer-pending': true,
  'offer-again-later': true,
  'no-offer': true,
  'computer-seats': true,
  'seat-out': true,
  'draw-unavailable': true,
  'unknown-time-control': true,
  'out-of-time': true,
};
/** Every reason a message can be refused. */
export const REFUSALS = Object.keys(REFUSAL_RECORD) as Refusal[];
const REFUSAL_SET = new Set<string>(REFUSALS);

/** The checks of each client message type, after `v` and `type`. */
const CLIENT: Record<ClientMessage['type'], (o: Obj) => boolean> = {
  create: (o) =>
    keys(o, ['ruleset', 'seat'], ['computer', 'time']) &&
    isRulesetRef(o.ruleset) &&
    (o.seat === RANDOM_SEAT || str(o.seat, SIDE)) &&
    (o.computer === undefined || isSides(o.computer)) &&
    (o.time === undefined || isTimeChoice(o.time)),
  join: (o) =>
    keys(o, ['code'], ['token']) &&
    str(o.code, CODE) &&
    (o.token === undefined || str(o.token, TOKEN)),
  move: (o) => keys(o, ['move']) && str(o.move, NOTATION),
  resign: (o) => keys(o, []),
  'offer-draw': (o) => keys(o, []),
  'accept-draw': (o) => keys(o, []),
  'decline-draw': (o) => keys(o, []),
};

const SERVER: Record<ServerMessage['type'], (o: Obj) => boolean> = {
  snapshot: (o) =>
    keys(
      o,
      ['code', 'seat', 'ruleset', 'moves', 'result', 'seats', 'drawOffer'],
      ['token', 'resignations', 'computer', 'computerTokens', 'time'],
    ) &&
    str(o.code, CODE) &&
    str(o.seat, SIDE) &&
    (o.token === undefined || str(o.token, TOKEN)) &&
    isRoomRuleset(o.ruleset) &&
    Array.isArray(o.moves) &&
    o.moves.every((m) => str(m, NOTATION)) &&
    isResult(o.result) &&
    isSeats(o.seats) &&
    (o.drawOffer === null || str(o.drawOffer, SIDE)) &&
    (o.resignations === undefined || isResignations(o.resignations)) &&
    (o.computer === undefined || isSides(o.computer)) &&
    (o.computerTokens === undefined || isTokens(o.computerTokens)) &&
    (o.time === undefined || isRoomTime(o.time, (o.moves as unknown[]).length)),
  move: (o) =>
    keys(o, ['move', 'side'], ['left']) &&
    str(o.move, NOTATION) &&
    str(o.side, SIDE) &&
    (o.left === undefined || isFilledTimes(o.left)),
  opponent: (o) =>
    keys(o, ['status'], ['side']) &&
    (o.status === 'present' || o.status === 'away') &&
    (o.side === undefined || str(o.side, SIDE)),
  resigned: (o) =>
    keys(o, ['side'], ['left']) &&
    str(o.side, SIDE) &&
    (o.left === undefined || isFilledTimes(o.left)),
  'out-of-time': (o) =>
    keys(o, ['side'], ['left']) &&
    str(o.side, SIDE) &&
    (o.left === undefined || isFilledTimes(o.left)),
  away: (o) => keys(o, ['away']) && isTimes(o.away),
  'offer-draw': (o) => keys(o, ['side']) && str(o.side, SIDE),
  'decline-draw': (o) => keys(o, ['side']) && str(o.side, SIDE),
  refused: (o) =>
    keys(o, ['reason', 'message']) &&
    typeof o.reason === 'string' &&
    REFUSAL_SET.has(o.reason) &&
    typeof o.message === 'string' &&
    o.message.length <= 500,
  'game-over': (o) => keys(o, ['result']) && isResult(o.result) && o.result.status !== 'ongoing',
};

function parse<T>(
  text: string,
  maxBytes: number,
  checks: Record<string, (o: Obj) => boolean>,
): Parsed<T> {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      refused: refused('too-large', `A message may be at most ${maxBytes} bytes.`),
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, refused: refused('malformed', 'The message is not JSON.') };
  }
  if (!isObj(value))
    return { ok: false, refused: refused('malformed', 'The message is not an object.') };
  if (value.v !== PROTOCOL_VERSION) {
    return {
      ok: false,
      refused: refused('version', `This server speaks protocol version ${PROTOCOL_VERSION}.`),
    };
  }
  const type = value.type;
  if (typeof type !== 'string' || !Object.hasOwn(checks, type)) {
    return { ok: false, refused: refused('unknown-type', 'The message type is not known.') };
  }
  const rest = Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'v' && k !== 'type'));
  if (!checks[type]!(rest)) {
    return { ok: false, refused: refused('malformed', `The ${type} message is not well formed.`) };
  }
  return { ok: true, message: value as T };
}

/** A message from a player, checked whole, or the refusal to send back. */
export const parseClientMessage = (text: string): Parsed<ClientMessage> =>
  parse(text, MAX_CLIENT_MESSAGE_BYTES, CLIENT);

/** A message from the server, checked whole (the browser trusts nothing it receives either). */
export const parseServerMessage = (text: string): Parsed<ServerMessage> =>
  parse(text, MAX_SERVER_MESSAGE_BYTES, SERVER);

/** The room peek, checked whole (the browser trusts nothing it receives). */
export function parseRoomInfo(text: string): { ok: true; info: RoomInfo } | { ok: false } {
  if (
    typeof text !== 'string' ||
    new TextEncoder().encode(text).length > MAX_SERVER_MESSAGE_BYTES
  ) {
    return { ok: false };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (
    !isObj(value) ||
    !keys(value, ['v', 'code', 'ruleset', 'seats', 'result'], ['computer', 'time']) ||
    value.v !== PROTOCOL_VERSION ||
    !str(value.code, CODE) ||
    !isRoomRuleset(value.ruleset) ||
    !isSeats(value.seats) ||
    !isResult(value.result) ||
    (value.computer !== undefined && !isSides(value.computer)) ||
    (value.time !== undefined && !isTimeChoice(value.time))
  ) {
    return { ok: false };
  }
  return { ok: true, info: value as unknown as RoomInfo };
}
