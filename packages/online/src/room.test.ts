// A room (S51): two seats playing one game through the protocol. The S17 80-move game, the
// reconnect snapshot, custom and archived rulesets, resign and draws, and every refusal.
import {
  loadRules,
  newGame,
  playMove,
  stateKey,
  three,
  toNotation,
  type Lock,
  type Ruleset,
  type RulesFiles,
} from '@chess9s/engine';
import { describe, expect, it } from 'vitest';
import hotSeatMate from '../../engine/test/fixtures/games/hot-seat-mate.json';
import threeEnds from '../../engine/test/fixtures/games/three-player-ends.json';
import {
  CODE_ALPHABET,
  REFUSALS,
  encode,
  isSeatToken as isToken,
  parseServerMessage,
  type Refusal,
  type ServerMessage,
  type Snapshot,
} from './protocol';
import {
  expire,
  leave,
  receive,
  replaySnapshot,
  roomDeadline,
  snapshotFor as roomSnapshot,
  type Outgoing,
  type Room,
  type Step,
} from './room';
import { rulesFiles } from './rules-index';
import { newRoomCode, newSeatToken, randomIndex, sameToken, type RandomBytes } from './secrets';

const CODE = 'K7RX2M';
/** The server's time when a test starts; `t.at` moves it. */
const T0 = Date.UTC(2026, 9, 28, 12);
const data = loadRules(rulesFiles);
const DRAFT = { id: 'draft-2p', version: '0.2.0' };

/** A seeded source of bytes (mulberry32), so rooms are the same on every run. */
function seeded(seed: number): RandomBytes {
  let a = seed >>> 0;
  return (n) =>
    Uint8Array.from({ length: n }, () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) & 255;
    });
}

/** Every refusal any test saw, so the last test can check that each one has a test. */
const seenRefusals = new Set<Refusal>();

/** A room and the messages it sent, driven one message at a time. */
function table(files: RulesFiles = rulesFiles, seed = 1) {
  const ctx = { data: loadRules(files), random: seeded(seed), code: CODE, now: T0 };
  let room: Room | null = null;
  const sent: Outgoing[] = [];
  const record = (step: Step): Step => {
    for (const o of step.out) {
      // Everything the room sends is a valid server message.
      expect(parseServerMessage(encode(o.message))).toEqual({ ok: true, message: o.message });
      if (o.message.type === 'refused') seenRefusals.add(o.message.reason);
    }
    sent.push(...step.out);
    room = step.room;
    return step;
  };
  const send = (seat: string | null, msg: unknown): Step => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    return record(receive(ctx, room, seat, text));
  };
  return {
    send,
    sent,
    get room(): Room {
      return room!;
    },
    close: (seat: string) => record(leave(room!, seat, ctx.now)),
    /** The server's time is `ms` after the start. */
    at(ms: number) {
      ctx.now = T0 + ms;
    },
    /** What the room's alarm does at the server's time now. */
    expire: () => record(expire(ctx.now, room!)),
    /** What a seat is shown of the room now. */
    snapshot: (seat: string, opts?: { token?: boolean; computerTokens?: boolean }) =>
      roomSnapshot(room!, seat, ctx.now, opts),
  };
}

const create = (ruleset: unknown = DRAFT, seat = 'light', time?: unknown) => ({
  v: 1,
  type: 'create',
  ruleset,
  seat,
  ...(time !== undefined && { time }),
});
const join = (token?: string) => ({ v: 1, type: 'join', code: CODE, ...(token && { token }) });
const move = (m: string) => ({ v: 1, type: 'move', move: m });
const bare = (type: string) => ({ v: 1, type });

const only = (step: Step): ServerMessage => {
  expect(step.out).toHaveLength(1);
  return step.out[0]!.message;
};
const refusal = (step: Step): Refusal | undefined => {
  const m = only(step);
  return m.type === 'refused' ? m.reason : undefined;
};
const snapshotOf = (step: Step): Snapshot => {
  const m = step.out[0]!.message;
  if (m.type !== 'snapshot') throw new Error(`expected a snapshot, got ${m.type}`);
  return m;
};

/** A room on draft-2p with light (the creator) and dark seated; dark moves first. */
function seated(seed = 1) {
  const t = table(rulesFiles, seed);
  const light = snapshotOf(t.send(null, create())).token!;
  const dark = snapshotOf(t.send(null, join())).token!;
  return Object.assign(t, { tokens: { light, dark } });
}

const firstMove = (room: Room) => toNotation(room.game.legal[0]!);

describe('the S17 80-move game through two seats', () => {
  it('ends with the hot-seat result', () => {
    const t = seated();
    for (const notation of hotSeatMate.moves) {
      const step = t.send(t.room.game.turn, move(notation));
      expect(step.out[0]?.message).toMatchObject({ type: 'move', move: notation });
    }
    let hotSeat = newGame(data.rules(DRAFT.id, DRAFT.version), DRAFT);
    for (const n of hotSeatMate.moves) {
      hotSeat = playMove(
        hotSeat,
        hotSeat.legal.find((m) => toNotation(m) === n)!,
      );
    }
    expect(t.room.game.result).toEqual(hotSeatMate.result);
    expect(t.room.game.result).toEqual(hotSeat.result);
    expect(stateKey(t.room.game)).toBe(stateKey(hotSeat));
    // Both seats are told the game is over.
    const over = t.sent.filter((o) => o.message.type === 'game-over');
    expect(over.map((o) => o.to)).toEqual([{ seat: 'dark' }, { seat: 'light' }]);
    expect(over[0]!.message).toEqual({ v: 1, type: 'game-over', result: hotSeatMate.result });
    // Every move went to both seats.
    expect(t.sent.filter((o) => o.message.type === 'move')).toHaveLength(80 * 2);
  });
});

describe('creating a room', () => {
  it('seats the creator where they chose and sends them a snapshot with their token', () => {
    const t = table();
    const step = t.send(null, create(DRAFT, 'dark'));
    expect(step.seat).toBe('dark');
    const snap = snapshotOf(step);
    expect(snap).toMatchObject({
      code: CODE,
      seat: 'dark',
      ruleset: { id: 'draft-2p', version: '0.2.0', name: expect.any(String) },
      moves: [],
      result: { status: 'ongoing' },
      seats: { light: 'open', dark: 'present' },
      drawOffer: null,
    });
    expect(snap.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(step.out[0]!.to).toBe('sender');
  });

  it('picks a seat at random when asked (D52), from the random source', () => {
    const seats = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => table(rulesFiles, seed).send(null, create(DRAFT, 'random')).seat,
      ),
    );
    expect(seats).toEqual(new Set(['light', 'dark']));
  });

  it('refuses a seat the game does not have', () => {
    expect(refusal(table().send(null, create(DRAFT, 'dragon')))).toBe('unknown-seat');
  });

  it('refuses an unknown ruleset or version', () => {
    const t = table();
    expect(refusal(t.send(null, create({ id: 'nothing', version: '1.0.0' })))).toBe(
      'unknown-ruleset',
    );
    expect(refusal(t.send(null, create({ id: 'draft-2p', version: '9.9.9' })))).toBe(
      'unknown-ruleset',
    );
    expect(t.room).toBeNull();
  });

  it('refuses a second create in the same room', () => {
    const t = table();
    t.send(null, create());
    const before = t.room;
    expect(refusal(t.send(null, create()))).toBe('room-exists');
    expect(t.room).toBe(before);
  });

  it('refuses every other message while no room exists', () => {
    expect(refusal(table().send(null, join()))).toBe('no-room');
    expect(refusal(table().send('light', move('a1-a2')))).toBe('no-room');
  });
});

describe('a custom ruleset (untrusted overrides)', () => {
  const custom = (overrides: Record<string, unknown>) => ({ name: 'Mine', overrides });

  it('plays its overrides', () => {
    const t = table();
    const snap = snapshotOf(t.send(null, create(custom({ 'turn.firstMove': 'light' }))));
    expect(snap.ruleset).toEqual({
      id: 'custom',
      version: '1.0.0',
      name: 'Mine',
      overrides: { 'turn.firstMove': 'light' },
    });
    expect(t.room.game.turn).toBe('light');
    expect(t.room.game.ruleset.overrides).toEqual({ 'turn.firstMove': 'light' });
  });

  it('refuses an unknown parameter', () => {
    const step = table().send(null, create(custom({ 'queen.flies': true })));
    expect(refusal(step)).toBe('invalid-ruleset');
    expect((only(step) as { message: string }).message).toMatch(/queen\.flies/);
  });

  it('refuses a value that is not one of the options', () => {
    expect(refusal(table().send(null, create(custom({ 'turn.firstMove': 'dragon' }))))).toBe(
      'invalid-ruleset',
    );
    expect(refusal(table().send(null, create(custom({ 'tail.repeatLimit': 99 }))))).toBe(
      'invalid-ruleset',
    );
    expect(refusal(table().send(null, create(custom({ 'turn.firstMove': null }))))).toBe(
      'invalid-ruleset',
    );
  });

  it('refuses a 3-player-only parameter', () => {
    const threeOnly = data.registry.parameters.find(
      (p) => p.status !== 'deprecated' && !p.players.includes(2),
    )!;
    expect(refusal(table().send(null, create(custom({ [threeOnly.id]: threeOnly.default }))))).toBe(
      'invalid-ruleset',
    );
  });
});

describe('an archived ruleset version', () => {
  it('plays from its lock, not from the registry', () => {
    const current = rulesFiles['rulesets/standard-2p.json'] as Ruleset;
    const lock = rulesFiles['locks/standard-2p@0.1.0.json'] as Lock;
    const files: RulesFiles = {
      ...rulesFiles,
      'rulesets/archive/standard-2p@0.0.9.json': {
        ...current,
        version: '0.0.9',
        status: 'deprecated',
      },
      'locks/standard-2p@0.0.9.json': {
        id: 'standard-2p',
        version: '0.0.9',
        values: { ...lock.values, 'turn.firstMove': 'light' },
      },
    };
    const t = table(files);
    const snap = snapshotOf(t.send(null, create({ id: 'standard-2p', version: '0.0.9' })));
    expect(snap.ruleset).toMatchObject({ id: 'standard-2p', version: '0.0.9' });
    expect(t.room.game.turn).toBe('light');
    expect(t.room.game.ruleset).toEqual({ id: 'standard-2p', version: '0.0.9' });
    // The current version still lets dark move first.
    const now = table(files);
    now.send(null, create({ id: 'standard-2p', version: '0.1.0' }));
    expect(now.room.game.turn).toBe('dark');
  });
});

describe('joining', () => {
  it('takes the open seat, gets its own token, and the creator is told', () => {
    const t = table();
    const lightToken = snapshotOf(t.send(null, create())).token!;
    const step = t.send(null, join());
    expect(step.seat).toBe('dark');
    const snap = snapshotOf(step);
    expect(snap.seats).toEqual({ light: 'present', dark: 'present' });
    expect(snap.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(snap.token).not.toBe(lightToken);
    expect(step.out[1]).toEqual({
      to: { seat: 'light' },
      message: { v: 1, type: 'opponent', status: 'present' },
    });
  });

  it('refuses a third player: no spectators (D52)', () => {
    const t = seated();
    expect(refusal(t.send(null, join()))).toBe('room-full');
  });

  it('refuses another room code', () => {
    const t = table();
    t.send(null, create());
    expect(refusal(t.send(null, { ...join(), code: 'ABCDEF' }))).toBe('wrong-room');
  });

  it('refuses a wrong token', () => {
    const t = seated();
    expect(refusal(t.send(null, join(newSeatToken(seeded(99)))))).toBe('bad-token');
  });

  it('refuses a token before its seat is taken (an open seat has none)', () => {
    const t = table();
    t.send(null, create());
    expect(refusal(t.send(null, join(newSeatToken(seeded(5)))))).toBe('bad-token');
  });

  it('refuses a connection that already holds a seat', () => {
    const t = seated();
    expect(refusal(t.send('light', join(t.tokens.light)))).toBe('already-seated');
  });
});

describe('reconnecting', () => {
  it('gives back the seat by its token, and the snapshot replays to the same position', () => {
    const t = seated();
    for (const n of hotSeatMate.moves.slice(0, 12)) t.send(t.room.game.turn, move(n));
    const away = t.close('light');
    expect(away.out).toEqual([
      { to: { seat: 'dark' }, message: { v: 1, type: 'opponent', status: 'away' } },
    ]);
    expect(t.room.seats.light!.present).toBe(false);

    const step = t.send(null, join(t.tokens.light));
    expect(step.seat).toBe('light');
    const snap = snapshotOf(step);
    expect(snap.seats).toEqual({ light: 'present', dark: 'present' });
    expect(snap.moves).toEqual(hotSeatMate.moves.slice(0, 12));
    expect(step.out[1]).toEqual({
      to: { seat: 'dark' },
      message: { v: 1, type: 'opponent', status: 'present' },
    });

    // The client checks the snapshot it received, then replays it.
    const parsed = parseServerMessage(encode(snap));
    expect(parsed.ok).toBe(true);
    const replay = replaySnapshot(data, snap);
    expect(replay.ok).toBe(true);
    if (replay.ok) expect(stateKey(replay.game)).toBe(stateKey(t.room.game));
  });

  it('works for a custom ruleset and a resigned game too', () => {
    const t = table();
    t.send(null, create({ name: 'Mine', overrides: { 'turn.firstMove': 'light' } }));
    t.send(null, join());
    t.send('light', move(firstMove(t.room)));
    t.send('light', bare('resign'));
    const snap = snapshotFor(t);
    const replay = replaySnapshot(data, snap);
    expect(replay.ok && stateKey(replay.game)).toBe(stateKey(t.room.game));
    expect(replay.ok && replay.game.result).toEqual(t.room.game.result);
  });

  it('refuses a snapshot whose moves or result do not hold', () => {
    const t = seated();
    t.send('dark', move(firstMove(t.room)));
    const snap = snapshotFor(t);
    expect(replaySnapshot(data, { ...snap, moves: ['a1-a9'] }).ok).toBe(false);
    expect(
      replaySnapshot(data, { ...snap, result: { status: 'draw', reason: 'repetition' } }).ok,
    ).toBe(false);
    expect(
      replaySnapshot(data, { ...snap, ruleset: { ...snap.ruleset, version: '9.9.9' } }).ok,
    ).toBe(false);
  });

  it('sends nothing when a seat that is already away leaves again', () => {
    const t = seated();
    t.close('dark');
    expect(t.close('dark').out).toEqual([]);
  });

  it('never sends a seat token to the other seat', () => {
    const t = seated();
    t.close('light');
    t.send(null, join(t.tokens.light));
    t.send('dark', bare('offer-draw'));
    t.send('light', bare('accept-draw'));
    for (const o of t.sent) {
      const text = encode(o.message);
      if (o.to !== 'sender') {
        expect(text).not.toContain(t.tokens.light);
        expect(text).not.toContain(t.tokens.dark);
      }
    }
    // A reconnect snapshot does not repeat the token either.
    const again = t.sent.filter((o) => o.message.type === 'snapshot').at(-1)!.message as Snapshot;
    expect(again.token).toBeUndefined();
  });
});

/** The snapshot light would get now. */
const snapshotFor = (t: { room: Room }): Snapshot => ({
  v: 1,
  type: 'snapshot',
  code: t.room.code,
  seat: 'light',
  ruleset: t.room.ruleset,
  moves: t.room.game.moves.map((m) => m.notation),
  result: t.room.game.result,
  seats: { light: 'present', dark: 'present' },
  drawOffer: t.room.drawOffer,
});

describe('moves', () => {
  it('goes to both seats', () => {
    const t = seated();
    const n = firstMove(t.room);
    const step = t.send('dark', move(n));
    expect(step.out).toEqual([
      { to: { seat: 'dark' }, message: { v: 1, type: 'move', move: n, side: 'dark' } },
      { to: { seat: 'light' }, message: { v: 1, type: 'move', move: n, side: 'dark' } },
    ]);
    expect(t.room.game.moves).toHaveLength(1);
  });

  it('refuses a move out of turn, an illegal move, and a move before the other seat is taken', () => {
    const t = seated();
    const before = t.room;
    expect(refusal(t.send('light', move(firstMove(t.room))))).toBe('not-your-turn');
    expect(refusal(t.send('dark', move('a1-a9')))).toBe('illegal-move');
    expect(t.room).toBe(before);

    const alone = table();
    alone.send(null, create(DRAFT, 'dark'));
    expect(refusal(alone.send('dark', move(firstMove(alone.room))))).toBe('waiting-for-opponent');
  });

  it('refuses a game message from a connection without a seat', () => {
    const t = seated();
    expect(refusal(t.send(null, move(firstMove(t.room))))).toBe('not-seated');
    expect(refusal(t.send('dragon', bare('resign')))).toBe('not-seated');
    expect(refusal(t.send('constructor', bare('resign')))).toBe('not-seated');
    expect(t.close('constructor').out).toEqual([]);
  });

  it('refuses every game message once the game is over', () => {
    const t = seated();
    const n = firstMove(t.room);
    t.send('light', bare('resign'));
    for (const msg of [move(n), bare('resign'), bare('offer-draw'), bare('accept-draw')]) {
      expect(refusal(t.send('dark', msg))).toBe('game-over');
    }
  });
});

describe('resign (D51)', () => {
  it('ends the game for either seat, on either turn; both are told', () => {
    for (const seat of ['light', 'dark']) {
      const t = seated();
      const step = t.send(seat, bare('resign'));
      const winner = seat === 'light' ? 'dark' : 'light';
      const result = { status: 'win', winner, loser: seat, reason: 'resignation' };
      expect(step.out).toEqual([
        { to: { seat: 'dark' }, message: { v: 1, type: 'game-over', result } },
        { to: { seat: 'light' }, message: { v: 1, type: 'game-over', result } },
      ]);
    }
  });
});

describe('draw by agreement (D51)', () => {
  it('is offered to both seats and ends the game when accepted', () => {
    const t = seated();
    const offer = t.send('light', bare('offer-draw'));
    expect(offer.out.map((o) => o.message)).toEqual([
      { v: 1, type: 'offer-draw', side: 'light' },
      { v: 1, type: 'offer-draw', side: 'light' },
    ]);
    expect(t.room.drawOffer).toBe('light');
    const accept = t.send('dark', bare('accept-draw'));
    expect(accept.out[0]!.message).toEqual({
      v: 1,
      type: 'game-over',
      result: { status: 'draw', reason: 'agreement' },
    });
    expect(t.room.drawOffer).toBeNull();
  });

  it('can be declined; the offering seat must move before offering again', () => {
    const t = seated();
    t.send('dark', bare('offer-draw'));
    const decline = t.send('light', bare('decline-draw'));
    expect(decline.out[0]!.message).toEqual({ v: 1, type: 'decline-draw', side: 'light' });
    expect(t.room.drawOffer).toBeNull();
    expect(refusal(t.send('dark', bare('offer-draw')))).toBe('offer-again-later');
    // Light may still offer.
    expect(t.send('light', bare('offer-draw')).out[0]!.message.type).toBe('offer-draw');
    t.send('dark', bare('decline-draw'));
    t.send('dark', move(firstMove(t.room)));
    expect(t.send('dark', bare('offer-draw')).out[0]!.message.type).toBe('offer-draw');
  });

  it('lapses when the seat it was offered to moves instead', () => {
    const t = seated();
    t.send('light', bare('offer-draw'));
    const n = firstMove(t.room);
    const step = t.send('dark', move(n));
    expect(step.out.map((o) => o.message.type)).toEqual([
      'move',
      'move',
      'decline-draw',
      'decline-draw',
    ]);
    expect(t.room.drawOffer).toBeNull();
  });

  it('stands while the offering seat moves', () => {
    const t = seated();
    t.send('dark', bare('offer-draw'));
    t.send('dark', move(firstMove(t.room)));
    expect(t.room.drawOffer).toBe('dark');
  });

  it('refuses a second offer, accepting one own offer, and answering no offer', () => {
    const t = seated();
    expect(refusal(t.send('light', bare('accept-draw')))).toBe('no-offer');
    expect(refusal(t.send('light', bare('decline-draw')))).toBe('no-offer');
    t.send('light', bare('offer-draw'));
    expect(refusal(t.send('light', bare('offer-draw')))).toBe('offer-pending');
    expect(refusal(t.send('dark', bare('offer-draw')))).toBe('offer-pending');
    expect(refusal(t.send('light', bare('accept-draw')))).toBe('no-offer');
  });
});

describe('malformed input', () => {
  it('is refused to the sender, never thrown, and changes nothing', () => {
    const t = seated();
    const before = t.room;
    expect(refusal(t.send('dark', '{not json'))).toBe('malformed');
    expect(refusal(t.send('dark', { v: 1, type: 'move', move: 'e2-e4', extra: true }))).toBe(
      'malformed',
    );
    expect(refusal(t.send('dark', { v: 2, type: 'resign' }))).toBe('version');
    expect(refusal(t.send('dark', { v: 1, type: 'takeback' }))).toBe('unknown-type');
    expect(refusal(t.send('dark', 'x'.repeat(30_000)))).toBe('too-large');
    expect(t.room).toBe(before);
  });
});

describe('room codes and seat tokens (D54)', () => {
  it('makes 6-character codes from the 31 characters without look-alikes', () => {
    const random = seeded(7);
    const codes = Array.from({ length: 500 }, () => newRoomCode(random));
    for (const code of codes) expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(CODE_ALPHABET).toHaveLength(31);
    expect(new Set(codes.join('')).size).toBe(31);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('picks indexes without bias by rejecting the bytes that would favor some', () => {
    const bytes = [250, 255, 248, 30];
    let i = 0;
    const random: RandomBytes = () => Uint8Array.of(bytes[i++]!);
    // 248 to 255 are rejected for 31 choices (256 - 256 % 31 = 248).
    expect(randomIndex(random, 31)).toBe(30);
    expect(i).toBe(4);
  });

  it('makes 43-character base64url tokens from 32 random bytes', () => {
    expect(newSeatToken(() => new Uint8Array(32))).toBe('A'.repeat(43));
    expect(newSeatToken(() => new Uint8Array(32).fill(255))).toBe('_'.repeat(42) + '8');
    const random = seeded(3);
    expect(newSeatToken(random)).not.toBe(newSeatToken(random));
  });

  it('compares tokens fully', () => {
    const a = newSeatToken(seeded(1));
    expect(sameToken(a, a)).toBe(true);
    expect(sameToken(a, a.slice(0, -1) + (a.endsWith('A') ? 'B' : 'A'))).toBe(false);
    expect(sameToken(a, a.slice(1))).toBe(false);
    expect(sameToken('', '')).toBe(true);
  });
});

// 3-seat rooms (S63, D61): the same state machine over a game with three seats.
const STANDARD_3P = { id: 'standard-3p', version: '0.1.0' };
const EASY_3P = { id: 'easy-3p', version: '0.1.0' };
const recorded = (ruleset: string, row: string) =>
  threeEnds.games.find((g) => g.ruleset === ruleset && g.rows.includes(row))!;
const dragonOf = (room: Room) => three(room.game.rules, room.game.order).dragon;

/** A standard-3p room with all three seats taken; dark (the creator) holds the first token. */
function seated3(ruleset: unknown = STANDARD_3P, seed = 1) {
  const t = table(rulesFiles, seed);
  const tokens: Record<string, string> = {};
  const first = snapshotOf(t.send(null, create(ruleset, 'dark')));
  tokens[first.seat] = first.token!;
  for (let i = 0; i < 2; i++) {
    const snap = snapshotOf(t.send(null, join()));
    tokens[snap.seat] = snap.token!;
  }
  return Object.assign(t, { tokens });
}
type Seated3 = ReturnType<typeof seated3>;

const playAll = (t: Seated3, notations: readonly string[]) => {
  for (const notation of notations) {
    const step = t.send(t.room.game.turn, move(notation));
    expect(step.out[0]?.message).toMatchObject({ type: 'move', move: notation });
  }
};

describe('a room with three seats (D61)', () => {
  it('opens with three seats named from the turn order, the creator in the one they chose', () => {
    const t = table();
    const snap = snapshotOf(t.send(null, create(STANDARD_3P, 'light')));
    expect(snap.seat).toBe('light');
    expect(Object.keys(snap.seats).sort()).toEqual([...t.room.game.order].sort());
    expect(Object.keys(snap.seats)).toHaveLength(3);
    expect(snap.seats).toMatchObject({ light: 'present' });
    expect(Object.values(snap.seats).filter((s) => s === 'open')).toHaveLength(2);
    expect(snap.computer).toBeUndefined();
    expect(snap.resignations).toBeUndefined();
  });

  it('lists the seats in turn order, which is the order joiners are seated in', () => {
    const t = table();
    const snap = snapshotOf(t.send(null, create(STANDARD_3P, 'dragon')));
    expect(Object.keys(snap.seats)).toEqual(t.room.game.order);
    const open = Object.keys(snap.seats).find((s) => snap.seats[s] === 'open');
    expect(snapshotOf(t.send(null, join())).seat).toBe(open);
  });

  it('picks one of the three seats at random when asked (D52)', () => {
    const picked = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      picked.add(
        snapshotOf(table(rulesFiles, seed).send(null, create(STANDARD_3P, 'random'))).seat,
      );
    }
    expect([...picked].sort()).toEqual(['dark', 'dragon', 'light']);
  });

  it('refuses a seat the game does not have, and a fourth player', () => {
    expect(refusal(table().send(null, create(STANDARD_3P, 'gold')))).toBe('unknown-seat');
    const t = seated3();
    expect(refusal(t.send(null, join()))).toBe('room-full');
  });

  it('seats joiners in turn order and waits for all three before any move', () => {
    const t = table();
    const mine = snapshotOf(t.send(null, create(STANDARD_3P, 'dark')));
    expect(refusal(t.send('dark', move('a1-a2')))).toBe('waiting-for-opponent');
    const second = snapshotOf(t.send(null, join()));
    expect(second.seat).toBe(t.room.game.order.find((s) => s !== 'dark'));
    // Both seats already taken are told when a third arrives.
    expect(t.sent.at(-1)!.message).toMatchObject({ type: 'opponent', status: 'present' });
    expect(refusal(t.send('dark', move('a1-a2')))).toBe('waiting-for-opponent');
    const third = snapshotOf(t.send(null, join()));
    expect(new Set([mine.seat, second.seat, third.seat]).size).toBe(3);
    expect(third.seats).toEqual({ dark: 'present', light: 'present', dragon: 'present' });
  });

  it('names the seat in a presence message, so three seats can be told apart', () => {
    const t = seated3();
    const sent = t.close('light').out;
    expect(sent).toHaveLength(2);
    expect(sent.map((o) => o.message)).toEqual([
      { v: 1, type: 'opponent', status: 'away', side: 'light' },
      { v: 1, type: 'opponent', status: 'away', side: 'light' },
    ]);
    expect(
      sent.map((o) => o.to).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ).toEqual([{ seat: 'dark' }, { seat: 'dragon' }]);
    const back = t.send(null, join(t.tokens.light));
    expect(back.out.filter((o) => o.message.type === 'opponent')).toHaveLength(2);
  });

  it('keeps 2-seat rooms as they were: presence messages carry no seat', () => {
    const t = seated();
    const sent = t.close('dark').out;
    expect(sent.map((o) => o.message)).toEqual([{ v: 1, type: 'opponent', status: 'away' }]);
  });

  it('plays a recorded game in turn order; every move and the end go to all three', () => {
    const game = recorded('standard-3p', 'kinged-checkmates-king');
    const t = seated3();
    playAll(t, game.moves);
    expect(t.room.game.result).toEqual(game.result);
    const over = t.sent.filter((o) => o.message.type === 'game-over');
    expect(
      over
        .map((o) => o.to)
        .map((to) => (to as { seat: string }).seat)
        .sort(),
    ).toEqual(['dark', 'dragon', 'light']);
    expect(over[0]!.message).toEqual({ v: 1, type: 'game-over', result: game.result });
    expect(t.sent.filter((o) => o.message.type === 'move')).toHaveLength(game.moves.length * 3);
  });

  it('refuses a move out of turn, and any message once the game is over', () => {
    const t = seated3();
    const turn = t.room.game.turn;
    const other = t.room.game.order.find((s) => s !== turn)!;
    expect(refusal(t.send(other, move(toNotation(t.room.game.legal[0]!))))).toBe('not-your-turn');
    playAll(t, recorded('standard-3p', 'kinged-checkmates-king').moves);
    expect(refusal(t.send('dark', bare('resign')))).toBe('game-over');
  });

  it('skips a seat that is out; it stays connected, sees the game and cannot move or resign', () => {
    const game = recorded('standard-3p', 'dragon-captures-king');
    const t = seated3();
    let checked = false;
    for (const [i, notation] of game.moves.entries()) {
      t.send(t.room.game.turn, move(notation));
      const out = Object.entries(t.room.game.seats).find(([, s]) => s === 'out')?.[0];
      if (!out || checked || t.room.game.result.status !== 'ongoing') continue;
      checked = true;
      // The turn passes over the seat, and a move from it is refused as out of turn.
      expect(t.room.game.turn).not.toBe(out);
      expect(refusal(t.send(out, move(toNotation(t.room.game.legal[0]!))))).toBe('not-your-turn');
      expect(refusal(t.send(out, bare('resign')))).toBe('seat-out');
      // Its socket is still its seat's: it is told of every later move.
      const rest = game.moves.slice(i + 1);
      const before = t.sent.length;
      playAll(t, rest);
      const toOut = t.sent
        .slice(before)
        .filter((o) => typeof o.to === 'object' && o.to.seat === out && o.message.type === 'move');
      expect(toOut).toHaveLength(rest.length);
      expect(rest.length).toBeGreaterThan(0);
      expect(t.room.game.moves.slice(i + 1).every((m) => m.side !== out)).toBe(true);
      break;
    }
    expect(checked).toBe(true);
    expect(t.room.game.result).toEqual(game.result);
    expect(t.sent.filter((o) => o.message.type === 'game-over')).toHaveLength(3);
  });

  it('ends a duel in the results of decision 0016, with the reasons the game gives', () => {
    for (const [ruleset, row] of [
      [STANDARD_3P, 'duel-dragon-wins'],
      [STANDARD_3P, 'dragon-captures-king'],
      [STANDARD_3P, 'draw-duel'],
      [EASY_3P, 'draw'],
      [EASY_3P, 'kinged-checkmates-tail'],
    ] as const) {
      const game = recorded(ruleset.id, row);
      const t = seated3(ruleset);
      playAll(t, game.moves);
      expect(t.room.game.result).toEqual(game.result);
      expect(t.sent.filter((o) => o.message.type === 'game-over')[0]!.message).toEqual({
        v: 1,
        type: 'game-over',
        result: game.result,
      });
    }
  });

  it('refuses draws by agreement: decision 0018 keeps them out of 3-player games', () => {
    const t = seated3();
    for (const type of ['offer-draw', 'accept-draw', 'decline-draw']) {
      expect(refusal(t.send(t.room.game.turn, bare(type)))).toBe('draw-unavailable');
    }
    expect(t.room.drawOffer).toBeNull();
  });

  describe('resignation', () => {
    it('puts the seat out and lets the others play on; all three are told', () => {
      const t = seated3();
      const dragon = dragonOf(t.room);
      const kinged = t.room.game.order.filter((s) => s !== dragon);
      const step = t.send(kinged[0]!, bare('resign'));
      expect(step.out.map((o) => o.message)).toEqual([
        { v: 1, type: 'resigned', side: kinged[0] },
        { v: 1, type: 'resigned', side: kinged[0] },
        { v: 1, type: 'resigned', side: kinged[0] },
      ]);
      expect(t.room.game.result.status).toBe('ongoing');
      expect(t.room.game.seats[kinged[0]!]).toBe('out');
      expect(t.room.game.turn).not.toBe(kinged[0]);
      expect(refusal(t.send(kinged[0]!, bare('resign')))).toBe('seat-out');
      // The game goes on between the other two.
      t.send(t.room.game.turn, move(toNotation(t.room.game.legal[0]!)));
      expect(t.room.game.moves.at(-1)!.side).not.toBe(kinged[0]);
    });

    it('ends the game when the last Kinged player resigns in the duel: the Dragon wins', () => {
      const t = seated3();
      const dragon = dragonOf(t.room);
      const [a, b] = t.room.game.order.filter((s) => s !== dragon) as [string, string];
      t.send(a, bare('resign'));
      const step = t.send(b, bare('resign'));
      expect(t.room.game.result).toEqual({
        status: 'win',
        winner: dragon,
        loser: b,
        reason: 'resignation',
      });
      const types = step.out.map((o) => o.message.type);
      expect(types.filter((x) => x === 'resigned')).toHaveLength(3);
      expect(types.filter((x) => x === 'game-over')).toHaveLength(3);
    });

    it('is in the snapshot, which replays to the same game, and survives a reconnect', () => {
      const t = seated3();
      const dragon = dragonOf(t.room);
      const kinged = t.room.game.order.filter((s) => s !== dragon);
      playAll(t, recorded('standard-3p', 'kinged-checkmates-king').moves.slice(0, 4));
      const resigner = kinged.find((s) => s !== t.room.game.turn)!;
      t.send(resigner, bare('resign'));
      t.send(t.room.game.turn, move(toNotation(t.room.game.legal[0]!)));
      t.close(resigner);
      const back = snapshotOf(t.send(null, join(t.tokens[resigner])));
      expect(back.resignations).toEqual([{ side: resigner, after: 4 }]);
      const replay = replaySnapshot(data, back);
      expect(replay.ok).toBe(true);
      if (replay.ok) expect(stateKey(replay.game)).toBe(stateKey(t.room.game));
      if (replay.ok) expect(replay.game.seats[resigner]).toBe('out');
    });

    it('refuses a replay whose resignations do not hold', () => {
      const t = seated3();
      const base = t.snapshot('dark');
      const dragon = dragonOf(t.room);
      const kinged = t.room.game.order.filter((s) => s !== dragon);
      const claims = (resignations: Snapshot['resignations']) =>
        replaySnapshot(data, { ...base, ...(resignations && { resignations }) }).ok;
      expect(claims([{ side: kinged[0]!, after: 0 }])).toBe(true);
      // After moves nobody has played.
      expect(claims([{ side: kinged[0]!, after: 5 }])).toBe(false);
      // A seat that is not in the game.
      expect(claims([{ side: 'gold', after: 0 }])).toBe(false);
      // The same seat twice.
      expect(
        claims([
          { side: kinged[0]!, after: 0 },
          { side: kinged[0]!, after: 0 },
        ]),
      ).toBe(false);
    });

    it('does not exist in a 2-seat room: a resignation there ends the game, with no message but game-over', () => {
      const t = seated();
      const step = t.send('light', bare('resign'));
      expect(step.out.map((o) => o.message.type)).toEqual(['game-over', 'game-over']);
      const snap = t.snapshot('light');
      expect(snap.resignations).toBeUndefined();
      expect(replaySnapshot(data, { ...snap, resignations: [{ side: 'dark', after: 0 }] }).ok).toBe(
        false,
      );
    });
  });

  describe('seats played by the computer', () => {
    const createWith = (computer: unknown, seat = 'dark', ruleset: unknown = STANDARD_3P) => ({
      ...create(ruleset, seat),
      computer,
    });

    it("are taken at once, away until the creator's browser connects, and handed to the creator alone", () => {
      const t = table();
      const snap = snapshotOf(t.send(null, createWith(['dragon'])));
      expect(snap.seat).toBe('dark');
      expect(snap.computer).toEqual(['dragon']);
      expect(snap.seats).toEqual({ dark: 'present', light: 'open', dragon: 'away' });
      expect(Object.keys(snap.computerTokens!)).toEqual(['dragon']);
      expect(isToken(snap.computerTokens!.dragon)).toBe(true);
      expect(snap.computerTokens!.dragon).not.toBe(snap.token);
      // A friend takes the one seat that is left, and is told which is the computer's.
      const friend = snapshotOf(t.send(null, join()));
      expect(friend.seat).toBe('light');
      expect(friend.computer).toEqual(['dragon']);
      expect(friend.computerTokens).toBeUndefined();
      expect(refusal(t.send(null, join()))).toBe('room-full');
      // The seat cannot be taken without its token.
      expect(refusal(t.send(null, join(newSeatToken(seeded(9)))))).toBe('bad-token');
    });

    it('play through the same checks as a person: the computer joins with its token and moves', () => {
      const t = table();
      const mine = snapshotOf(t.send(null, createWith(['dragon'])));
      expect(refusal(t.send('dark', move('a1-a2')))).toBe('waiting-for-opponent');
      const friend = snapshotOf(t.send(null, join()));
      const bot = snapshotOf(t.send(null, join(mine.computerTokens!.dragon)));
      expect(bot.seat).toBe('dragon');
      expect(bot.token).toBeUndefined();
      expect(bot.computerTokens).toBeUndefined();
      expect(bot.seats).toEqual({ dark: 'present', light: 'present', dragon: 'present' });
      const turn = t.room.game.turn;
      const wrong = t.room.game.order.find((s) => s !== turn)!;
      expect(refusal(t.send(wrong, move(toNotation(t.room.game.legal[0]!))))).toBe('not-your-turn');
      expect(refusal(t.send(turn, move('a1-a1')))).toBe('illegal-move');
      t.send(turn, move(toNotation(t.room.game.legal[0]!)));
      expect(t.room.game.moves).toHaveLength(1);
      expect(friend.seat).toBe('light');
    });

    it('may be two, leaving the creator alone with a seat', () => {
      const t = table();
      const snap = snapshotOf(t.send(null, createWith(['light', 'dragon'])));
      expect(snap.computer).toEqual(['light', 'dragon']);
      expect(Object.keys(snap.computerTokens!).sort()).toEqual(['dragon', 'light']);
      expect(refusal(t.send(null, join()))).toBe('room-full');
    });

    it('leave a random creator in a seat that is not theirs to give away', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const snap = snapshotOf(
          table(rulesFiles, seed).send(null, createWith(['dark', 'dragon'], 'random')),
        );
        expect(snap.seat).toBe('light');
      }
    });

    it("are refused in a 2-seat room, for the creator's own seat, and when none would be left for a person", () => {
      expect(refusal(table().send(null, createWith(['dark'], 'light', DRAFT)))).toBe(
        'computer-seats',
      );
      expect(refusal(table().send(null, createWith(['dark'], 'dark')))).toBe('computer-seats');
      expect(refusal(table().send(null, createWith(['dark', 'light', 'dragon'], 'random')))).toBe(
        'malformed',
      );
      expect(refusal(table().send(null, createWith(['gold'])))).toBe('unknown-seat');
    });

    it("send the computer's tokens only in the reply that makes the room", () => {
      const t = table();
      const mine = snapshotOf(t.send(null, createWith(['dragon'])));
      t.close('dark');
      const back = snapshotOf(t.send(null, join(mine.token)));
      expect(back.computer).toEqual(['dragon']);
      expect(back.computerTokens).toBeUndefined();
      expect(t.snapshot('dark', { token: true }).computerTokens).toBeUndefined();
    });
  });
});

describe('clocks (S66, decision 0017)', () => {
  const MIN = 60_000;
  const messages = (step: Step) => step.out.map((o) => o.message);
  const typesOf = (step: Step) => messages(step).map((m) => m.type);
  /** A draft-2p room with a time control: light made it at T0, dark joins at `joinAt`. */
  function clocked(time: unknown, joinAt = 0) {
    const t = table();
    const made = snapshotOf(t.send(null, create(DRAFT, 'light', time)));
    t.at(joinAt);
    const joined = snapshotOf(t.send(null, join()));
    return Object.assign(t, { made, joined, tokens: { light: made.token!, dark: joined.token! } });
  }
  const at = (t: ReturnType<typeof table>, ms: number) => t.at(ms);
  const moveOf = (room: Room) => move(firstMove(room));

  describe('making a room', () => {
    it('is untimed by default (D51): no clock in the snapshot', () => {
      const t = table();
      expect(snapshotOf(t.send(null, create())).time).toBeUndefined();
      expect(t.room.time).toBeNull();
      expect(roomDeadline(t.room)).toBeNull();
    });

    it('keeps the control chosen, and shows it before the clock starts', () => {
      const t = table();
      const snap = snapshotOf(t.send(null, create(DRAFT, 'light', { control: '3+2' })));
      expect(snap.time).toEqual({
        control: '3+2',
        left: { light: 3 * MIN, dark: 3 * MIN },
        lefts: [],
      });
    });

    it('offers every control in rules/timeControls.json, the online-only ones too', () => {
      for (const control of ['1+0', '30+20', 'move30s', 'move1m', 'move1d', 'move3d', 'away5m']) {
        const snap = snapshotOf(table().send(null, create(DRAFT, 'light', { control })));
        expect(snap.time?.control).toBe(control);
      }
      // Untimed by name is the same as none.
      const t = table();
      expect(snapshotOf(t.send(null, create(DRAFT, 'light', { control: 'untimed' }))).time).toBe(
        undefined,
      );
    });

    it('refuses a control it does not know, and Show only without a clock', () => {
      expect(refusal(table().send(null, create(DRAFT, 'light', { control: '4+4' })))).toBe(
        'unknown-time-control',
      );
      for (const control of ['untimed', 'away5m']) {
        const step = table().send(null, create(DRAFT, 'light', { control, showOnly: true }));
        expect(refusal(step)).toBe('unknown-time-control');
      }
    });
  });

  describe('a Fischer clock (3+2)', () => {
    it('does not run while a seat is open, and starts when every seat is taken', () => {
      const t = clocked({ control: '3+2' }, 40_000);
      // Forty seconds waiting for dark cost nobody anything; dark moves first in draft-2p.
      expect(t.joined.time?.left).toEqual({ light: 3 * MIN, dark: 3 * MIN });
      at(t, 50_000);
      expect(t.snapshot('light').time?.left).toEqual({ light: 3 * MIN, dark: 3 * MIN - 10_000 });
      expect(roomDeadline(t.room)).toBe(T0 + 40_000 + 3 * MIN);
    });

    it("charges the mover by the server's time and adds the increment; each move carries the times", () => {
      const t = clocked({ control: '3+2' });
      at(t, 10_000);
      const step = t.send('dark', moveOf(t.room));
      const left = { dark: 3 * MIN - 10_000 + 2000, light: 3 * MIN };
      expect(messages(step)[0]).toMatchObject({ type: 'move', side: 'dark', left });
      at(t, 15_000);
      expect(t.snapshot('dark').time).toEqual({
        control: '3+2',
        left: { ...left, light: 3 * MIN - 5000 },
        lefts: [left],
      });
    });

    it('shows a seat that reconnects the time left now', () => {
      const t = clocked({ control: '3+2' });
      at(t, 10_000);
      t.send('dark', moveOf(t.room));
      t.close('light');
      at(t, 70_000);
      const back = snapshotOf(t.send(null, join(t.tokens.light)));
      // Light's clock ran the whole minute it was away (decision 0017).
      expect(back.time?.left).toEqual({ dark: 3 * MIN - 8000, light: 2 * MIN });
    });

    it('lets the flag fall at the deadline with nobody connected (D66: the seat loses)', () => {
      const t = clocked({ control: '3+2' });
      t.close('light');
      t.close('dark');
      const due = roomDeadline(t.room)!;
      t.at(due - T0 - 1);
      expect(t.expire().out).toEqual([]);
      t.at(due - T0);
      const step = t.expire();
      expect(typesOf(step)).toEqual(['out-of-time', 'out-of-time', 'game-over', 'game-over']);
      expect(messages(step)[0]).toEqual({
        v: 1,
        type: 'out-of-time',
        side: 'dark',
        left: { dark: 0, light: 3 * MIN },
      });
      expect(t.room.game.result).toEqual({
        status: 'win',
        winner: 'light',
        loser: 'dark',
        reason: 'timeout',
      });
      expect(roomDeadline(t.room)).toBeNull();
      expect(t.expire().out).toEqual([]);
      // The game replays from what the snapshot says.
      expect(replaySnapshot(data, t.snapshot('light')).ok).toBe(true);
    });

    it('takes a move that arrives after the time ran out as the flag fall, not as a move', () => {
      const t = clocked({ control: '3+2' });
      t.at(3 * MIN + 1);
      const step = t.send('dark', moveOf(t.room));
      expect(typesOf(step)).toEqual([
        'out-of-time',
        'out-of-time',
        'game-over',
        'game-over',
        'refused',
      ]);
      expect(step.out.at(-1)).toMatchObject({
        to: 'sender',
        message: { reason: 'out-of-time' },
      });
      expect(t.room.game.moves).toHaveLength(0);
      expect(t.room.game.result).toMatchObject({ winner: 'light', reason: 'timeout' });
    });

    it('stops the clock when a seat resigns or a draw is agreed', () => {
      const t = clocked({ control: '3+2' });
      at(t, 5000);
      t.send('light', bare('resign'));
      expect(roomDeadline(t.room)).toBeNull();
      at(t, 60_000);
      expect(t.snapshot('light').time?.left).toEqual({ dark: 3 * MIN - 5000, light: 3 * MIN });

      const u = clocked({ control: '3+2' });
      u.send('dark', bare('offer-draw'));
      at(u, 5000);
      u.send('light', bare('accept-draw'));
      expect(roomDeadline(u.room)).toBeNull();
      expect(u.room.game.result).toMatchObject({ status: 'draw', reason: 'agreement' });
    });
  });

  describe('a per-move clock', () => {
    it('gives each move the full time and keeps none of what was unused', () => {
      const t = clocked({ control: 'move30s' });
      at(t, 10_000);
      const step = t.send('dark', moveOf(t.room));
      expect(messages(step)[0]).toMatchObject({ left: { dark: 20_000, light: 30_000 } });
      expect(roomDeadline(t.room)).toBe(T0 + 40_000);
      at(t, 40_000);
      expect(typesOf(t.expire())).toContain('game-over');
      expect(t.room.game.result).toMatchObject({ loser: 'light', reason: 'timeout' });
    });

    it('runs the online-only day-long control on the same clock', () => {
      const t = clocked({ control: 'move1d' });
      expect(roomDeadline(t.room)).toBe(T0 + 24 * 60 * MIN);
    });
  });

  describe('Show only', () => {
    it('shows the seat out of time and plays on: its moves gain no increment', () => {
      const t = clocked({ control: '1+0', showOnly: true });
      expect(t.made.time).toMatchObject({ control: '1+0', showOnly: true });
      at(t, MIN);
      const step = t.expire();
      expect(messages(step)).toEqual([
        { v: 1, type: 'out-of-time', side: 'dark', left: { dark: 0, light: MIN } },
        { v: 1, type: 'out-of-time', side: 'dark', left: { dark: 0, light: MIN } },
      ]);
      expect(t.room.game.result.status).toBe('ongoing');
      expect(t.snapshot('light').time?.flagged).toEqual(['dark']);
      at(t, 2 * MIN);
      const moved = t.send('dark', moveOf(t.room));
      expect(messages(moved)[0]).toMatchObject({ type: 'move', left: { dark: 0, light: MIN } });
      expect(roomDeadline(t.room)).toBe(T0 + 3 * MIN);
    });
  });

  describe('the abandonment control (away 5 minutes)', () => {
    const awayOf = (step: Step) => messages(step).filter((m) => m.type === 'away');

    it('has no clock, and counts a seat away while the others are connected', () => {
      const t = clocked({ control: 'away5m' });
      expect(t.joined.time).toEqual({ control: 'away5m', away: {} });
      expect(roomDeadline(t.room)).toBeNull();
      at(t, 1000);
      const gone = t.close('dark');
      // Every seat is told (a seat that is away gets it when a socket holds it again).
      expect(awayOf(gone)).toEqual([
        { v: 1, type: 'away', away: { dark: 5 * MIN } },
        { v: 1, type: 'away', away: { dark: 5 * MIN } },
      ]);
      expect(roomDeadline(t.room)).toBe(T0 + 1000 + 5 * MIN);
      at(t, 3 * MIN);
      expect(t.snapshot('light').time).toEqual({
        control: 'away5m',
        away: { dark: 5 * MIN + 1000 - 3 * MIN },
      });
      at(t, 1000 + 5 * MIN);
      const step = t.expire();
      expect(typesOf(step)).toEqual(['out-of-time', 'out-of-time', 'game-over', 'game-over']);
      expect(messages(step)[0]).toEqual({ v: 1, type: 'out-of-time', side: 'dark' });
      expect(t.room.game.result).toMatchObject({ winner: 'light', reason: 'timeout' });
      expect(roomDeadline(t.room)).toBeNull();
    });

    it('stops counting when the others go too, and starts again in full', () => {
      const t = clocked({ control: 'away5m' });
      t.close('dark');
      at(t, 4 * MIN);
      const both = t.close('light');
      expect(awayOf(both)).toEqual([
        { v: 1, type: 'away', away: {} },
        { v: 1, type: 'away', away: {} },
      ]);
      expect(roomDeadline(t.room)).toBeNull();
      at(t, 20 * MIN);
      t.send(null, join(t.tokens.light));
      expect(roomDeadline(t.room)).toBe(T0 + 25 * MIN);
      // Dark comes back in time: nothing counts.
      at(t, 24 * MIN);
      const back = t.send(null, join(t.tokens.dark));
      expect(awayOf(back)).toEqual([
        { v: 1, type: 'away', away: {} },
        { v: 1, type: 'away', away: {} },
      ]);
      expect(roomDeadline(t.room)).toBeNull();
    });

    it('does not count before every seat is taken', () => {
      const t = table();
      t.send(null, create(DRAFT, 'light', { control: 'away5m' }));
      t.close('light');
      expect(roomDeadline(t.room)).toBeNull();
    });
  });

  describe('three seats (S63) use the same clocks', () => {
    it('puts a seat out of time out of the game; the others play on', () => {
      const t = table();
      t.send(null, create(STANDARD_3P, 'dark', { control: '1+0' }));
      t.send(null, join());
      t.send(null, join());
      const first = t.room.game.turn;
      at(t, MIN);
      const step = t.expire();
      expect(messages(step).filter((m) => m.type === 'out-of-time')).toHaveLength(3);
      expect(messages(step)[0]).toMatchObject({ side: first });
      expect(t.room.game.result.status).toBe('ongoing');
      expect(t.room.game.seats[first]).toBe('out');
      const next = t.room.game.turn;
      expect(next).not.toBe(first);
      // The next seat's clock runs from the flag fall.
      expect(roomDeadline(t.room)).toBe(T0 + 2 * MIN);
      const snap = t.snapshot(next);
      expect(snap.resignations).toEqual([{ side: first, after: 0, timeout: true }]);
      expect(replaySnapshot(data, snap).ok).toBe(true);
      // A move from the seat that is out is refused.
      expect(refusal(t.send(first, move('a1-a2')))).toBe('not-your-turn');
    });

    it('sends the times with a resignation', () => {
      const t = table();
      t.send(null, create(STANDARD_3P, 'dark', { control: '3+2' }));
      t.send(null, join());
      t.send(null, join());
      at(t, 1000);
      const step = t.send('dark', bare('resign'));
      expect(messages(step)[0]).toMatchObject({
        type: 'resigned',
        side: 'dark',
        left: expect.any(Object),
      });
    });

    it('starts the clock at once when the computer has the other seats', () => {
      const t = table();
      t.send(null, {
        ...create(STANDARD_3P, 'dark', { control: '3+2' }),
        computer: ['light', 'dragon'],
      });
      expect(roomDeadline(t.room)).toBe(T0 + 3 * MIN);
    });
  });
});

describe('the refusals', () => {
  it('each have a test above', () => {
    expect([...seenRefusals].sort()).toEqual([...REFUSALS].sort());
  });
});
