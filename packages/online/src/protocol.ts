// The online protocol (S51): versioned JSON messages between a player's browser and a room on
// the server. Every message is checked whole before it is used: a size cap, `v: 1`, a known type
// and exactly that type's keys with values of the right shape. Anything else becomes a `refused`
// message; nothing here throws on input. Side ids (light, dark) come from the board's data, so
// seats are checked against the game, not here.
import type { DrawReason, GameResult, ParamValue, WinReason } from '@chess9s/engine';

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

export type ClientMessage =
  | { v: 1; type: 'create'; ruleset: BundledRef | CustomRef; seat: SeatChoice }
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
}

/** What `GET /api/rooms/<code>` shows (S52): enough to decide to join (D54), never a token. */
export interface RoomInfo {
  v: 1;
  code: string;
  ruleset: RoomRuleset;
  seats: Record<string, SeatStatus>;
  result: GameResult;
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
  | 'no-offer';

export type Ended = Exclude<GameResult, { status: 'ongoing' }>;

export type ServerMessage =
  | Snapshot
  | { v: 1; type: 'move'; move: string; side: string }
  | { v: 1; type: 'opponent'; status: 'present' | 'away' }
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
// Rooms have no clock until S66, so running out of time (S65) is not a result they carry yet.
const WIN_REASONS: Record<Exclude<WinReason, 'timeout'>, true> = {
  checkmate: true,
  stalemate: true,
  resignation: true,
  // 3-player results (S56); rooms are 2-player until S63.
  'king-capture': true,
  'dragon-captured': true,
  'exposed-king': true,
};
const DRAW_REASONS: Record<DrawReason | 'agreement', true> = {
  stalemate: true,
  'insufficient-material': true,
  repetition: true,
  'fifty-move': true,
  agreement: true,
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
};
/** Every reason a message can be refused. */
export const REFUSALS = Object.keys(REFUSAL_RECORD) as Refusal[];
const REFUSAL_SET = new Set<string>(REFUSALS);

/** The checks of each client message type, after `v` and `type`. */
const CLIENT: Record<ClientMessage['type'], (o: Obj) => boolean> = {
  create: (o) =>
    keys(o, ['ruleset', 'seat']) &&
    isRulesetRef(o.ruleset) &&
    (o.seat === RANDOM_SEAT || str(o.seat, SIDE)),
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
    keys(o, ['code', 'seat', 'ruleset', 'moves', 'result', 'seats', 'drawOffer'], ['token']) &&
    str(o.code, CODE) &&
    str(o.seat, SIDE) &&
    (o.token === undefined || str(o.token, TOKEN)) &&
    isRoomRuleset(o.ruleset) &&
    Array.isArray(o.moves) &&
    o.moves.every((m) => str(m, NOTATION)) &&
    isResult(o.result) &&
    isSeats(o.seats) &&
    (o.drawOffer === null || str(o.drawOffer, SIDE)),
  move: (o) => keys(o, ['move', 'side']) && str(o.move, NOTATION) && str(o.side, SIDE),
  opponent: (o) => keys(o, ['status']) && (o.status === 'present' || o.status === 'away'),
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
    !keys(value, ['v', 'code', 'ruleset', 'seats', 'result']) ||
    value.v !== PROTOCOL_VERSION ||
    !str(value.code, CODE) ||
    !isRoomRuleset(value.ruleset) ||
    !isSeats(value.seats) ||
    !isResult(value.result)
  ) {
    return { ok: false };
  }
  return { ok: true, info: value as unknown as RoomInfo };
}
