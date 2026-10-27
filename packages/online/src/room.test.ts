// A room (S51): two seats playing one game through the protocol. The S17 80-move game, the
// reconnect snapshot, custom and archived rulesets, resign and draws, and every refusal.
import {
  loadRules,
  newGame,
  playMove,
  stateKey,
  toNotation,
  type Lock,
  type Ruleset,
  type RulesFiles,
} from '@chess9s/engine';
import { describe, expect, it } from 'vitest';
import hotSeatMate from '../../engine/test/fixtures/games/hot-seat-mate.json';
import {
  CODE_ALPHABET,
  REFUSALS,
  encode,
  parseServerMessage,
  type Refusal,
  type ServerMessage,
  type Snapshot,
} from './protocol';
import { leave, receive, replaySnapshot, type Outgoing, type Room, type Step } from './room';
import { rulesFiles } from './rules-index';
import { newRoomCode, newSeatToken, randomIndex, sameToken, type RandomBytes } from './secrets';

const CODE = 'K7RX2M';
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
  const ctx = { data: loadRules(files), random: seeded(seed), code: CODE };
  let room: Room | null = null;
  const sent: Outgoing[] = [];
  const send = (seat: string | null, msg: unknown): Step => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    const step = receive(ctx, room, seat, text);
    for (const o of step.out) {
      // Everything the room sends is a valid server message.
      expect(parseServerMessage(encode(o.message))).toEqual({ ok: true, message: o.message });
      if (o.message.type === 'refused') seenRefusals.add(o.message.reason);
    }
    sent.push(...step.out);
    room = step.room;
    return step;
  };
  return {
    send,
    sent,
    get room(): Room {
      return room!;
    },
    close(seat: string) {
      const step = leave(room!, seat);
      sent.push(...step.out);
      room = step.room;
      return step;
    },
  };
}

const create = (ruleset: unknown = DRAFT, seat = 'light') => ({
  v: 1,
  type: 'create',
  ruleset,
  seat,
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

  it('refuses a ruleset the engine cannot play online (3 players)', () => {
    const step = table().send(null, create({ id: 'draft-3p', version: '0.2.0' }));
    expect(refusal(step)).toBe('invalid-ruleset');
    expect(step.room).toBeNull();
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

describe('the refusals', () => {
  it('each have a test above', () => {
    expect([...seenRefusals].sort()).toEqual([...REFUSALS].sort());
  });
});
