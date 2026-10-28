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
  'game-over (3-player draw, shared)': {
    v: 1,
    type: 'game-over',
    result: { status: 'draw', reason: 'fifty-move', between: ['light', 'dragon'] },
  },
  'game-over (3-player win)': {
    v: 1,
    type: 'game-over',
    result: { status: 'win', winner: 'dark', loser: 'dragon', reason: 'dragon-captured' },
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
      { ...snapshot, result: { status: 'win', winner: 'light', loser: 'dark', reason: 'forfeit' } },
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
    [
      'a draw shared by a repeated seat',
      json({ ...info, result: { status: 'draw', reason: 'stalemate', between: ['dark', 'dark'] } }),
    ],
    [
      'a draw shared by one seat',
      json({ ...info, result: { status: 'draw', reason: 'stalemate', between: ['dark'] } }),
    ],
  ])('refuses %s', (_, text) => {
    expect(parseRoomInfo(text).ok).toBe(false);
  });

  it('knows a seat token by its shape', () => {
    expect(isSeatToken(TOKEN)).toBe(true);
    for (const bad of ['', 'A'.repeat(42), 'A'.repeat(44), `${'A'.repeat(42)}=`, 7])
      expect(isSeatToken(bad), String(bad)).toBe(false);
  });
});

describe('3-seat rooms (S63)', () => {
  const create3 = {
    v: 1,
    type: 'create',
    ruleset: { id: 'standard-3p', version: '0.1.0' },
    seat: 'dark',
  };
  const snapshot3 = {
    v: 1,
    type: 'snapshot',
    code: CODE,
    seat: 'dark',
    ruleset: { id: 'standard-3p', version: '0.1.0', name: 'Standard 3-player' },
    moves: ['c9-b7'],
    result: { status: 'ongoing' },
    seats: { dark: 'present', light: 'open', dragon: 'away' },
    drawOffer: null,
  };

  it('lets a create message name one or two seats for the computer', () => {
    expect(client({ ...create3, computer: ['dragon'] })).toBe('ok');
    expect(client({ ...create3, computer: ['light', 'dragon'] })).toBe('ok');
  });

  it('refuses a computer list that is empty, too long, repeated or not sides', () => {
    expect(client({ ...create3, computer: [] })).toBe('malformed');
    expect(client({ ...create3, computer: ['a', 'b', 'c'] })).toBe('malformed');
    expect(client({ ...create3, computer: ['dragon', 'dragon'] })).toBe('malformed');
    expect(client({ ...create3, computer: 'dragon' })).toBe('malformed');
    expect(client({ ...create3, computer: [7] })).toBe('malformed');
  });

  it('reads a snapshot with resignations, computer seats and their tokens', () => {
    expect(server({ ...snapshot3, resignations: [{ side: 'light', after: 4 }] })).toBe('ok');
    expect(server({ ...snapshot3, computer: ['dragon'] })).toBe('ok');
    expect(
      server({
        ...snapshot3,
        token: TOKEN,
        computer: ['dragon'],
        computerTokens: { dragon: TOKEN },
      }),
    ).toBe('ok');
  });

  it('refuses resignations that are not whole, and computer tokens that are not tokens', () => {
    expect(server({ ...snapshot3, resignations: [{ side: 'light' }] })).toBe('malformed');
    expect(server({ ...snapshot3, resignations: [{ side: 'light', after: -1 }] })).toBe(
      'malformed',
    );
    expect(server({ ...snapshot3, resignations: [{ side: 'light', after: 1.5 }] })).toBe(
      'malformed',
    );
    // A seat out of time (S66) is a resignation entry marked timeout, and only `true` marks it.
    expect(
      server({ ...snapshot3, resignations: [{ side: 'light', after: 1, timeout: false }] }),
    ).toBe('malformed');
    expect(server({ ...snapshot3, computerTokens: { dragon: 'short' } })).toBe('malformed');
    expect(server({ ...snapshot3, computer: ['dragon', 'dragon'] })).toBe('malformed');
  });

  it('reads the resigned message, and an opponent message that names the seat', () => {
    expect(server({ v: 1, type: 'resigned', side: 'light' })).toBe('ok');
    expect(server({ v: 1, type: 'resigned' })).toBe('malformed');
    expect(server({ v: 1, type: 'opponent', status: 'away', side: 'dragon' })).toBe('ok');
    expect(server({ v: 1, type: 'opponent', status: 'away', side: 7 })).toBe('malformed');
  });

  it('reads a game over that names the seats a 3-player draw is shared by', () => {
    const between = ['dark', 'light', 'dragon'];
    expect(
      server({
        v: 1,
        type: 'game-over',
        result: { status: 'draw', reason: 'stalemate', between },
      }),
    ).toBe('ok');
    expect(
      server({
        v: 1,
        type: 'game-over',
        result: { status: 'win', winner: 'dragon', loser: 'dark', reason: 'king-capture' },
      }),
    ).toBe('ok');
  });

  it('shows the peek which seats are the computer', () => {
    const peek = {
      v: 1,
      code: CODE,
      ruleset: snapshot3.ruleset,
      seats: snapshot3.seats,
      result: snapshot3.result,
      computer: ['dragon'],
    };
    expect(parseRoomInfo(json(peek)).ok).toBe(true);
    expect(parseRoomInfo(json({ ...peek, computer: ['dragon', 'dragon'] })).ok).toBe(false);
  });
});

describe('clocks in rooms (S66)', () => {
  const create = {
    v: 1,
    type: 'create',
    ruleset: { id: 'standard-2p', version: '0.1.0' },
    seat: 'light',
  };
  const left = { light: 179_000, dark: 180_000 };

  it('lets a create message choose a time control, with Show only', () => {
    expect(client({ ...create, time: { control: '3+2' } })).toBe('ok');
    expect(client({ ...create, time: { control: 'move1d', showOnly: true } })).toBe('ok');
    expect(client({ ...create, time: { control: 'away5m' } })).toBe('ok');
  });

  it('refuses a time control that is not shaped like one', () => {
    expect(client({ ...create, time: '3+2' })).toBe('malformed');
    expect(client({ ...create, time: {} })).toBe('malformed');
    expect(client({ ...create, time: { control: '' } })).toBe('malformed');
    expect(client({ ...create, time: { control: '3+2', showOnly: false } })).toBe('malformed');
    expect(client({ ...create, time: { control: '3+2', left } })).toBe('malformed');
  });

  it('gives a client no way to set a clock', () => {
    // The room keeps the time; a move, a join or any other message that carries one is refused.
    expect(client({ v: 1, type: 'move', move: 'c1-b3', left })).toBe('malformed');
    expect(client({ v: 1, type: 'move', move: 'c1-b3', clock: left })).toBe('malformed');
    expect(client({ v: 1, type: 'join', code: CODE, left })).toBe('malformed');
    expect(client({ v: 1, type: 'resign', left })).toBe('malformed');
    expect(client({ v: 1, type: 'out-of-time', side: 'dark' })).toBe('unknown-type');
    expect(client({ v: 1, type: 'away', away: {} })).toBe('unknown-type');
  });

  it("reads a snapshot with the room's clock", () => {
    const time = { control: '3+2', left, lefts: [left, left] };
    expect(server({ ...snapshot, time })).toBe('ok');
    expect(server({ ...snapshot, time: { ...time, showOnly: true, flagged: ['dark'] } })).toBe(
      'ok',
    );
    expect(server({ ...snapshot, time: { control: 'away5m', away: { dark: 120_000 } } })).toBe(
      'ok',
    );
    expect(server({ ...snapshot, time: { control: 'away5m', away: {} } })).toBe('ok');
  });

  it('refuses a snapshot clock that does not fit its moves or its seats', () => {
    const time = { control: '3+2', left, lefts: [left, left] };
    expect(server({ ...snapshot, time: { ...time, lefts: [left] } })).toBe('malformed');
    expect(server({ ...snapshot, time: { ...time, left: { light: -1, dark: 0 } } })).toBe(
      'malformed',
    );
    expect(server({ ...snapshot, time: { ...time, left: { light: 'a lot' } } })).toBe('malformed');
    expect(server({ ...snapshot, time: { ...time, flagged: ['dark', 'dark'] } })).toBe('malformed');
    expect(server({ ...snapshot, time: { ...time, since: 5 } })).toBe('malformed');
  });

  it('reads the time left with a move and a resignation, and the clock messages', () => {
    expect(server({ v: 1, type: 'move', move: 'c1-b3', side: 'light', left })).toBe('ok');
    expect(server({ v: 1, type: 'resigned', side: 'light', left })).toBe('ok');
    expect(server({ v: 1, type: 'out-of-time', side: 'dark' })).toBe('ok');
    expect(server({ v: 1, type: 'out-of-time', side: 'dark', left })).toBe('ok');
    expect(server({ v: 1, type: 'out-of-time' })).toBe('malformed');
    expect(server({ v: 1, type: 'away', away: { dark: 300_000 } })).toBe('ok');
    expect(server({ v: 1, type: 'away', away: {} })).toBe('ok');
    expect(server({ v: 1, type: 'away', away: { dark: -5 } })).toBe('malformed');
  });

  it('reads the results of running out of time (D66)', () => {
    expect(
      server({
        v: 1,
        type: 'game-over',
        result: { status: 'win', winner: 'light', loser: 'dark', reason: 'timeout' },
      }),
    ).toBe('ok');
    expect(
      server({
        v: 1,
        type: 'game-over',
        result: { status: 'draw', reason: 'timeout-insufficient-material' },
      }),
    ).toBe('ok');
  });

  it('shows the peek the time control before a player takes a seat', () => {
    const peek = {
      v: 1,
      code: CODE,
      ruleset: snapshot.ruleset,
      seats: snapshot.seats,
      result: snapshot.result,
    };
    expect(parseRoomInfo(json({ ...peek, time: { control: '3+2' } })).ok).toBe(true);
    expect(parseRoomInfo(json({ ...peek, time: { control: '3+2', showOnly: true } })).ok).toBe(
      true,
    );
    expect(parseRoomInfo(json({ ...peek, time: { control: '3+2', left } })).ok).toBe(false);
  });
});
