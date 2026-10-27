// The room page's logic (S53) against a fake server: a fetch that answers /api/rooms/<code> and a
// fake socket the test speaks for. Every state the page can be in is reached from the outside:
// an unknown room, a full one, a preview, joining, playing, a drop and a reconnect, a refused
// move, resigning, a draw offer, game over, an app that is out of date.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOSE_GONE,
  CLOSE_REPLACED,
  PING,
  encode,
  type ClientMessage,
  type RoomInfo,
  type ServerMessage,
  type Snapshot,
} from '@chess9s/online/protocol';
import { toNotation } from '@chess9s/engine';
import hotSeatMate from '../../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import type { SocketLike } from './connection';
import type { Store } from './guest';
import { ONLINE_KEY, loadSeat, saveSeat } from './onlineStore';
import { RoomController, type Phase } from './roomController';

const TOKEN = 'A'.repeat(42) + '_';
const CODE = 'K7RX2M';
const DRAFT = { id: 'draft-2p', version: '0.2.0', name: 'Good Practice' };
const MOVES: string[] = hotSeatMate.moves;

const info = (over: Partial<RoomInfo> = {}): RoomInfo => ({
  v: 1,
  code: CODE,
  ruleset: DRAFT,
  seats: { light: 'present', dark: 'open' },
  result: { status: 'ongoing' },
  ...over,
});
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'dark',
  ruleset: DRAFT,
  moves: [],
  result: { status: 'ongoing' },
  seats: { light: 'present', dark: 'present' },
  drawOffer: null,
  ...over,
});

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  send(t: string) {
    this.sent.push(t);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.();
  }
  say(m: ServerMessage) {
    this.onmessage?.({ data: encode(m) });
  }
  drop(code = 1006) {
    this.onclose?.({ code });
  }
  /** The messages the page sent, without keep-alives. */
  get messages(): ClientMessage[] {
    return this.sent.filter((t) => t !== PING).map((t) => JSON.parse(t));
  }
}

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

function harness(opts: { peek?: () => Promise<Response>; code?: string } = {}) {
  const store = memory();
  const sockets: FakeSocket[] = [];
  const peeks: string[] = [];
  const peek = opts.peek ?? (async () => new Response(JSON.stringify(info()), { status: 200 }));
  const phases: Phase[] = [];
  const controller = new RoomController({
    code: opts.code ?? CODE,
    store,
    fetch: async (url: string) => {
      peeks.push(url);
      return peek();
    },
    open: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
  });
  controller.subscribe(() => phases.push(controller.phase));
  const h = {
    store,
    sockets,
    peeks,
    phases,
    controller,
    get socket() {
      return sockets.at(-1)!;
    },
    get phase() {
      return controller.phase;
    },
    get online() {
      const p = controller.phase;
      if (p.kind !== 'playing') throw new Error(`not playing: ${p.kind}`);
      return p.online;
    },
    /** Get to a game in progress, seated as `seat`, with the connection open. */
    async play(seat: 'light' | 'dark', over: Partial<Snapshot> = {}) {
      saveSeat(store, CODE, { seat, token: TOKEN });
      await controller.start();
      h.socket.open();
      h.socket.say(snap({ seat, ...over }));
    },
  };
  return h;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('looking for the room', () => {
  it('starts by looking, and asks the server about this code only', async () => {
    const h = harness();
    expect(h.phase.kind).toBe('loading');
    await h.controller.start();
    expect(h.peeks).toEqual([`/api/rooms/${CODE}`]);
  });

  it('says plainly when the code is not a room code, without asking the server', async () => {
    const h = harness({ code: 'nope' });
    await h.controller.start();
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'gone' });
    expect(h.peeks).toEqual([]);
  });

  it('says an unknown or expired room is gone', async () => {
    const h = harness({ peek: async () => new Response('{"error":"no-room"}', { status: 404 }) });
    await h.controller.start();
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'gone' });
    expect((h.phase as { text: string }).text).toContain('no longer exists');
  });

  it('says a full room is full', async () => {
    const h = harness({
      peek: async () =>
        new Response(JSON.stringify(info({ seats: { light: 'present', dark: 'away' } })), {
          status: 200,
        }),
    });
    await h.controller.start();
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'full' });
  });

  it('offers a retry when the server cannot be reached, and finds the room on the second try', async () => {
    let up = false;
    const h = harness({
      peek: async () => {
        if (!up) throw new TypeError('network');
        return new Response(JSON.stringify(info()), { status: 200 });
      },
    });
    await h.controller.start();
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'offline' });
    up = true;
    await h.controller.start();
    expect(h.phase.kind).toBe('preview');
  });

  it('a room made on a ruleset this app does not have asks to reload, and offers no seat', async () => {
    const h = harness({
      peek: async () =>
        new Response(JSON.stringify(info({ ruleset: { ...DRAFT, version: '9.9.9' } })), {
          status: 200,
        }),
    });
    await h.controller.start();
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'outdated' });
    expect((h.phase as { text: string }).text).toContain('Reload to update');
  });
});

describe('before taking the seat', () => {
  it('previews the room: the ruleset, and which side the player gets', async () => {
    const h = harness();
    await h.controller.start();
    expect(h.phase).toMatchObject({ kind: 'preview', side: 'dark' });
    expect(h.sockets).toHaveLength(0);
  });

  it('opens the socket only when the player takes the seat, and joins with no token', async () => {
    const h = harness();
    await h.controller.start();
    h.controller.join();
    expect(h.phase.kind).toBe('joining');
    h.socket.open();
    expect(h.socket.messages).toEqual([{ v: 1, type: 'join', code: CODE }]);
  });

  it('keeps the seat token once the snapshot brings it, then plays', async () => {
    const h = harness();
    await h.controller.start();
    h.controller.join();
    h.socket.open();
    h.socket.say(snap({ token: TOKEN }));
    expect(h.phase.kind).toBe('playing');
    expect(loadSeat(h.store, CODE)).toEqual({ seat: 'dark', token: TOKEN });
    expect(h.online.seat).toBe('dark');
  });

  it('a room that filled up meanwhile says so', async () => {
    const h = harness();
    await h.controller.start();
    h.controller.join();
    h.socket.open();
    h.socket.say({ v: 1, type: 'refused', reason: 'room-full', message: 'Both seats are taken.' });
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'full' });
  });
});

describe('coming back to a room', () => {
  it('a saved seat goes straight to the room, joining with its token', async () => {
    const h = harness();
    saveSeat(h.store, CODE, { seat: 'dark', token: TOKEN });
    await h.controller.start();
    expect(h.peeks).toEqual([]);
    expect(h.phase.kind).toBe('joining');
    h.socket.open();
    expect(h.socket.messages).toEqual([{ v: 1, type: 'join', code: CODE, token: TOKEN }]);
    h.socket.say(snap({ moves: MOVES.slice(0, 5) }));
    expect(h.online.model.game.moves).toHaveLength(5);
    expect(h.online.connection).toBe('open');
  });

  it('a drop shows reconnecting, then replays the snapshot on the same position', async () => {
    const h = harness();
    await h.play('dark', { moves: MOVES.slice(0, 5) });
    h.socket.drop(1006);
    expect(h.online.connection).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.sockets).toHaveLength(2);
    h.socket.open();
    expect(h.socket.messages).toEqual([{ v: 1, type: 'join', code: CODE, token: TOKEN }]);
    h.socket.say(snap({ moves: MOVES.slice(0, 6) }));
    expect(h.online.connection).toBe('open');
    expect(h.online.model.game.moves).toHaveLength(6);
  });

  it('a seat the server no longer knows is dropped from the browser', async () => {
    const h = harness();
    saveSeat(h.store, CODE, { seat: 'dark', token: TOKEN });
    await h.controller.start();
    h.socket.open();
    h.socket.say({ v: 1, type: 'refused', reason: 'bad-token', message: 'No.' });
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'lost' });
    expect(h.store.data.has(ONLINE_KEY)).toBe(false);
  });

  it('a room that expired drops the seat and says it is gone', async () => {
    const h = harness();
    await h.play('dark');
    h.socket.drop(CLOSE_GONE);
    expect(h.store.data.has(ONLINE_KEY)).toBe(false);
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'gone' });
  });

  it('a room that is gone is found when the connection cannot even open', async () => {
    const h = harness({ peek: async () => new Response('', { status: 404 }) });
    saveSeat(h.store, CODE, { seat: 'dark', token: TOKEN });
    await h.controller.start();
    h.socket.drop(1006);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'gone' });
    expect(h.store.data.has(ONLINE_KEY)).toBe(false);
  });

  it('the seat taken back in another window is not taken back here', async () => {
    const h = harness();
    await h.play('dark');
    h.socket.drop(CLOSE_REPLACED);
    expect(h.online.closed).toBe('replaced');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.sockets).toHaveLength(1);
    // The seat is still this browser's: a later reload takes it back.
    expect(loadSeat(h.store, CODE)).not.toBeNull();
  });

  it('keeps a game over in the browser until the room expires, so a reload shows the result', async () => {
    const h = harness();
    await h.play('light', { moves: MOVES, result: hotSeatMate.result as Snapshot['result'] });
    expect(h.online.model.game.result.status).toBe('win');
    expect(loadSeat(h.store, CODE)).not.toBeNull();
  });
});

describe('playing', () => {
  it('sends the player’s move once, and the opponent’s reply is played', async () => {
    const h = harness();
    await h.play('dark');
    const m = h.online.model.game.legal.find((l) => !l.promotion && !l.castle)!;
    h.controller.press(m.from);
    h.controller.press(m.to);
    expect(h.socket.messages.slice(1)).toEqual([{ v: 1, type: 'move', move: toNotation(m) }]);
    h.socket.say({ v: 1, type: 'move', move: toNotation(m), side: 'dark' });
    expect(h.online.pending).toBeNull();
    const reply = h.online.model.game.legal.find((l) => !l.promotion && !l.castle)!;
    h.socket.say({ v: 1, type: 'move', move: toNotation(reply), side: 'light' });
    expect(h.online.model.game.moves).toHaveLength(2);
  });

  it('takes back a move the server refuses, with the reason', async () => {
    const h = harness();
    await h.play('dark');
    const m = h.online.model.game.legal.find((l) => !l.promotion && !l.castle)!;
    h.controller.press(m.from);
    h.controller.press(m.to);
    h.socket.say({ v: 1, type: 'refused', reason: 'illegal-move', message: 'Not legal.' });
    expect(h.online.model.game.moves).toHaveLength(0);
    expect(h.online.notice).toBe('Not legal.');
  });

  it('does not send a move while the connection is down', async () => {
    const h = harness();
    await h.play('dark');
    h.socket.drop();
    const m = h.online.model.game.legal.find((l) => !l.promotion && !l.castle)!;
    h.controller.press(m.from);
    h.controller.press(m.to);
    expect(h.socket.messages).toEqual([{ v: 1, type: 'join', code: CODE, token: TOKEN }]);
    expect(h.online.model.game.moves).toHaveLength(0);
  });

  it('resigns, offers a draw, and answers an offer', async () => {
    const h = harness();
    await h.play('dark');
    h.controller.offerDraw();
    h.controller.resign();
    h.socket.say({ v: 1, type: 'offer-draw', side: 'light' });
    h.controller.acceptDraw();
    h.controller.declineDraw();
    expect(h.socket.messages.slice(1).map((m) => m.type)).toEqual([
      'offer-draw',
      'resign',
      'accept-draw',
      'decline-draw',
    ]);
  });

  it('sends none of those once the game is over', async () => {
    const h = harness();
    await h.play('light', { moves: MOVES, result: hotSeatMate.result as Snapshot['result'] });
    h.controller.resign();
    h.controller.offerDraw();
    expect(h.socket.messages).toHaveLength(1);
  });

  it('ends on the server’s game over', async () => {
    const h = harness();
    await h.play('dark');
    h.socket.say({
      v: 1,
      type: 'game-over',
      result: { status: 'win', winner: 'dark', loser: 'light', reason: 'resignation' },
    });
    expect(h.online.model.game.result.status).toBe('win');
  });

  it('keeps the play aids local: they are never sent', async () => {
    const h = harness();
    await h.play('dark');
    h.controller.toggleMoves();
    h.controller.toggleDanger();
    expect(h.online.model.showMoves).toBe(false);
    expect(h.online.model.showDanger).toBe(true);
    expect(h.socket.messages).toHaveLength(1);
  });
});

describe('an app that is out of date', () => {
  it('a server speaking another protocol says to reload, and stops', async () => {
    const h = harness();
    await h.play('dark');
    h.socket.onmessage?.({ data: JSON.stringify({ v: 2, type: 'snapshot' }) });
    expect(h.online.closed).toBe('outdated');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.sockets).toHaveLength(1);
  });

  it('a first snapshot this app cannot replay says to reload', async () => {
    const h = harness();
    saveSeat(h.store, CODE, { seat: 'dark', token: TOKEN });
    await h.controller.start();
    h.socket.open();
    h.socket.say(snap({ moves: ['a1-a9'] }));
    expect(h.phase).toMatchObject({ kind: 'problem', problem: 'outdated' });
  });
});

describe('leaving', () => {
  it('stop closes the socket and says nothing more', async () => {
    const h = harness();
    await h.play('dark');
    const before = h.phases.length;
    h.controller.stop();
    expect(h.socket.closed).toBe(true);
    h.socket.drop();
    expect(h.phases).toHaveLength(before);
  });

  it('stop before the peek answers leaves nothing running', async () => {
    let answer!: (r: Response) => void;
    const h = harness({ peek: () => new Promise<Response>((r) => (answer = r)) });
    const started = h.controller.start();
    h.controller.stop();
    answer(new Response(JSON.stringify(info()), { status: 200 }));
    await started;
    expect(h.phase.kind).toBe('loading');
  });
});
