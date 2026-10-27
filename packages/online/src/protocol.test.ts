// The online protocol (S51): every message type, valid and malformed. A bad message is refused
// with a reason, never thrown.
import { describe, expect, it } from 'vitest';
import {
  MAX_CLIENT_MESSAGE_BYTES,
  MAX_SERVER_MESSAGE_BYTES,
  PING,
  PONG,
  encode,
  isRoomCode,
  isSeatToken,
  parseClientMessage,
  parseRoomInfo,
  parseServerMessage,
  type Parsed,
  type Refusal,
} from './protocol';

const TOKEN = 'A'.repeat(42) + '_';
const CODE = 'K7RX2M';
const json = (o: unknown) => JSON.stringify(o);

const reasonOf = (r: Parsed<unknown>): Refusal | 'ok' => (r.ok ? 'ok' : r.refused.reason);
const client = (o: unknown) => reasonOf(parseClientMessage(json(o)));
const server = (o: unknown) => reasonOf(parseServerMessage(json(o)));

const validClient = {
  'create (bundled ruleset)': {
    v: 1,
    type: 'create',
    ruleset: { id: 'standard-2p', version: '0.1.0' },
    seat: 'random',
  },
  'create (custom ruleset)': {
    v: 1,
    type: 'create',
    ruleset: { name: 'My rules', overrides: { 'turn.firstMove': 'light' } },
    seat: 'light',
  },
  join: { v: 1, type: 'join', code: CODE },
  'join (reconnect)': { v: 1, type: 'join', code: CODE, token: TOKEN },
  move: { v: 1, type: 'move', move: 'd8-d9=queen' },
  'move (castle)': { v: 1, type: 'move', move: 'e1-g1/h1-f1' },
  resign: { v: 1, type: 'resign' },
  'offer-draw': { v: 1, type: 'offer-draw' },
  'accept-draw': { v: 1, type: 'accept-draw' },
  'decline-draw': { v: 1, type: 'decline-draw' },
};

const snapshot = {
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'light',
  ruleset: { id: 'standard-2p', version: '0.1.0', name: 'Standard' },
  moves: ['c9-b7', 'c1-b3'],
  result: { status: 'ongoing' },
  seats: { light: 'present', dark: 'away' },
  drawOffer: null,
};

const validServer = {
  snapshot,
  'snapshot (with token, custom ruleset, offer)': {
    ...snapshot,
    token: TOKEN,
    ruleset: {
      id: 'custom',
      version: '1.0.0',
      name: 'Mine',
      overrides: { 'pawn.doubleStep': false },
    },
    drawOffer: 'dark',
    seats: { light: 'present', dark: 'open' },
  },
  'snapshot (resigned)': {
    ...snapshot,
    result: { status: 'win', winner: 'dark', loser: 'light', reason: 'resignation' },
  },
  move: { v: 1, type: 'move', move: 'c9-b7', side: 'dark' },
  'opponent present': { v: 1, type: 'opponent', status: 'present' },
  'opponent away': { v: 1, type: 'opponent', status: 'away' },
  'offer-draw': { v: 1, type: 'offer-draw', side: 'light' },
  'decline-draw': { v: 1, type: 'decline-draw', side: 'dark' },
  refused: { v: 1, type: 'refused', reason: 'not-your-turn', message: 'It is not your turn.' },
  'game-over (checkmate)': {
    v: 1,
    type: 'game-over',
    result: { status: 'win', winner: 'light', loser: 'dark', reason: 'checkmate' },
  },
  'game-over (agreement)': {
    v: 1,
    type: 'game-over',
    result: { status: 'draw', reason: 'agreement' },
  },
};

describe('client messages', () => {
  it.each(Object.entries(validClient))('accepts %s', (_, message) => {
    const r = parseClientMessage(json(message));
    expect(r).toEqual({ ok: true, message });
  });

  it.each(Object.entries(validClient))('refuses %s with an extra key', (_, message) => {
    expect(client({ ...message, extra: 1 })).toBe('malformed');
  });

  it.each([
    ['create without a seat', { v: 1, type: 'create', ruleset: validClient.join }],
    [
      'create with a seat that is not a side id',
      { ...validClient['create (bundled ruleset)'], seat: 'Light!' },
    ],
    [
      'create with a ruleset id and no version',
      { ...validClient['create (bundled ruleset)'], ruleset: { id: 'standard-2p' } },
    ],
    [
      'create with a version that is not x.y.z',
      { ...validClient['create (bundled ruleset)'], ruleset: { id: 'standard-2p', version: '1' } },
    ],
    [
      'create with both a bundled and a custom ruleset',
      {
        ...validClient['create (bundled ruleset)'],
        ruleset: { id: 'a', version: '1.0.0', name: 'x', overrides: {} },
      },
    ],
    [
      'create with an empty name',
      { ...validClient['create (custom ruleset)'], ruleset: { name: '  ', overrides: {} } },
    ],
    [
      'create with a name over 40 characters',
      {
        ...validClient['create (custom ruleset)'],
        ruleset: { name: 'x'.repeat(41), overrides: {} },
      },
    ],
    [
      'create with overrides that are a list',
      { ...validClient['create (custom ruleset)'], ruleset: { name: 'x', overrides: [] } },
    ],
    [
      'create with a __proto__ override',
      {
        ...validClient['create (custom ruleset)'],
        ruleset: { name: 'x', overrides: JSON.parse('{"__proto__":{"a":1}}') },
      },
    ],
    ['join without a code', { v: 1, type: 'join' }],
    ['join with a code holding a look-alike (O)', { v: 1, type: 'join', code: 'K7RXOM' }],
    ['join with a lower-case code', { v: 1, type: 'join', code: 'k7rx2m' }],
    ['join with a code of 5 characters', { v: 1, type: 'join', code: 'K7RX2' }],
    ['join with a short token', { v: 1, type: 'join', code: CODE, token: 'abc' }],
    ['join with a token that is not a string', { v: 1, type: 'join', code: CODE, token: 7 }],
    ['move without a move', { v: 1, type: 'move' }],
    ['move with an empty move', { v: 1, type: 'move', move: '' }],
    ['move with a space', { v: 1, type: 'move', move: 'e2 e4' }],
    ['move with a long move', { v: 1, type: 'move', move: 'a'.repeat(49) }],
    ['move with a number', { v: 1, type: 'move', move: 42 }],
  ])('refuses %s', (_, message) => {
    expect(client(message)).toBe('malformed');
  });

  it('refuses text that is not JSON, or JSON that is not an object', () => {
    expect(reasonOf(parseClientMessage('{"v":1,'))).toBe('malformed');
    expect(client([1, 2])).toBe('malformed');
    expect(client(null)).toBe('malformed');
    expect(client('resign')).toBe('malformed');
  });

  it('refuses another protocol version, or none', () => {
    expect(client({ ...validClient.resign, v: 2 })).toBe('version');
    expect(client({ ...validClient.resign, v: '1' })).toBe('version');
    expect(client({ type: 'resign' })).toBe('version');
  });

  it('refuses an unknown type, a server-only type and a type that is not a string', () => {
    expect(client({ v: 1, type: 'takeback' })).toBe('unknown-type');
    expect(client({ v: 1, type: 'snapshot' })).toBe('unknown-type');
    expect(client({ v: 1, type: 'toString' })).toBe('unknown-type');
    expect(client({ v: 1 })).toBe('unknown-type');
    expect(client({ v: 1, type: ['resign'] })).toBe('unknown-type');
  });

  it('refuses a message over the size cap without parsing it', () => {
    const big = json({
      ...validClient['create (custom ruleset)'],
      ruleset: { name: 'x', overrides: { pad: 'x'.repeat(MAX_CLIENT_MESSAGE_BYTES) } },
    });
    expect(reasonOf(parseClientMessage(big))).toBe('too-large');
    // Counted in bytes, not characters.
    const wide = '{"v":1,"type":"move","move":"' + 'é'.repeat(MAX_CLIENT_MESSAGE_BYTES / 2) + '"}';
    expect(reasonOf(parseClientMessage(wide))).toBe('too-large');
  });

  it('encodes a message as JSON that parses back to it', () => {
    for (const message of Object.values(validClient)) {
      expect(parseClientMessage(encode(message as never))).toEqual({ ok: true, message });
    }
  });
});

describe('server messages', () => {
  it.each(Object.entries(validServer))('accepts %s', (_, message) => {
    expect(parseServerMessage(json(message))).toEqual({ ok: true, message });
  });

  it.each(Object.entries(validServer))('refuses %s with an extra key', (_, message) => {
    expect(server({ ...message, extra: 1 })).toBe('malformed');
  });

  it.each([
    ['a snapshot without seats', { ...snapshot, seats: undefined }],
    ['a snapshot with no seat at all', { ...snapshot, seats: {} }],
    ['a snapshot with an unknown seat status', { ...snapshot, seats: { light: 'gone' } }],
    ['a snapshot with a bad move', { ...snapshot, moves: ['e2 e4'] }],
    ['a snapshot with an unknown result', { ...snapshot, result: { status: 'won' } }],
    [
      'a snapshot with an extra key in the result',
      { ...snapshot, result: { status: 'ongoing', why: 1 } },
    ],
    [
      'a snapshot with an unknown win reason',
      { ...snapshot, result: { status: 'win', winner: 'light', loser: 'dark', reason: 'timeout' } },
    ],
    [
      'a snapshot where a side beats itself',
      {
        ...snapshot,
        result: { status: 'win', winner: 'light', loser: 'light', reason: 'checkmate' },
      },
    ],
    [
      'a snapshot with an unknown draw reason',
      { ...snapshot, result: { status: 'draw', reason: 'boredom' } },
    ],
    [
      'a snapshot with a ruleset without a name',
      { ...snapshot, ruleset: { id: 'standard-2p', version: '0.1.0' } },
    ],
    ['a snapshot with a draw offer that is not a side', { ...snapshot, drawOffer: 3 }],
    ['an opponent with another status', { v: 1, type: 'opponent', status: 'open' }],
    ['a refusal with an unknown reason', { v: 1, type: 'refused', reason: 'nope', message: '' }],
    [
      'a refusal with a long message',
      { v: 1, type: 'refused', reason: 'malformed', message: 'x'.repeat(501) },
    ],
    ['game-over while ongoing', { v: 1, type: 'game-over', result: { status: 'ongoing' } }],
    ['a move without its side', { v: 1, type: 'move', move: 'c9-b7' }],
  ])('refuses %s', (_, message) => {
    expect(server(message)).toBe('malformed');
  });

  it('refuses client-only types, other versions and oversized messages', () => {
    expect(server(validClient.resign)).toBe('unknown-type');
    expect(server({ ...snapshot, v: 0 })).toBe('version');
    const big = json({
      ...snapshot,
      moves: Array(Math.ceil(MAX_SERVER_MESSAGE_BYTES / 6)).fill('c9-b7'),
    });
    expect(reasonOf(parseServerMessage(big))).toBe('too-large');
  });
});

describe('around the messages', () => {
  it('knows a room code by its alphabet and length', () => {
    expect(isRoomCode(CODE)).toBe(true);
    for (const bad of ['K7RX2', 'K7RX2MM', 'k7rx2m', 'K7RX0M', 'K7RXIM', 'K7RX2M/', ''])
      expect(isRoomCode(bad), bad).toBe(false);
  });

  it('keeps the keep-alive ping outside the messages a room answers', () => {
    // The server answers PING with PONG itself, without waking the room; a room never sees it.
    expect(client(JSON.parse(PING))).toBe('unknown-type');
    expect(server(JSON.parse(PONG))).toBe('unknown-type');
  });
});

describe('the room peek (S53)', () => {
  const info = {
    v: 1,
    code: CODE,
    ruleset: { id: 'standard-2p', version: '0.1.0', name: 'Standard' },
    seats: { light: 'present', dark: 'open' },
    result: { status: 'ongoing' },
  };

  it('reads what GET /api/rooms/<code> returns', () => {
    expect(parseRoomInfo(json(info))).toEqual({ ok: true, info });
    const custom = { ...info, ruleset: { ...info.ruleset, id: 'custom', overrides: {} } };
    expect(parseRoomInfo(json(custom)).ok).toBe(true);
  });

  it.each([
    ['not JSON', 'nope'],
    ['an array', '[]'],
    ['another version', json({ ...info, v: 2 })],
    ['a bad code', json({ ...info, code: 'k7' })],
    ['an extra key (a token)', json({ ...info, token: TOKEN })],
    ['no seats', json({ ...info, seats: {} })],
    ['a seat status that is unknown', json({ ...info, seats: { light: 'here' } })],
    ['a result that is not one', json({ ...info, result: { status: 'won' } })],
  ])('refuses %s', (_, text) => {
    expect(parseRoomInfo(text).ok).toBe(false);
  });

  it('knows a seat token by its shape', () => {
    expect(isSeatToken(TOKEN)).toBe(true);
    for (const bad of ['', 'A'.repeat(42), 'A'.repeat(44), `${'A'.repeat(42)}=`, 7])
      expect(isSeatToken(bad), String(bad)).toBe(false);
  });
});
