import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOSE_GONE,
  CLOSE_IDLE,
  CLOSE_REPLACED,
  PING,
  PONG,
  encode,
  type ClientMessage,
  type ServerMessage,
} from '@chess9s/online/protocol';
import { PING_EVERY_MS, RoomConnection, type SocketLike, type Status } from './connection';

const TOKEN = 'A'.repeat(42) + '_';
const CODE = 'K7RX2M';
const join = (token?: string): ClientMessage => ({
  v: 1,
  type: 'join',
  code: CODE,
  ...(token && { token }),
});

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed: number | undefined;
  send(text: string) {
    this.sent.push(text);
  }
  close(code?: number) {
    this.closed = code ?? 1000;
  }
  // The server's side.
  open() {
    this.onopen?.();
  }
  say(m: ServerMessage | string) {
    this.onmessage?.({ data: typeof m === 'string' ? m : encode(m) });
  }
  drop(code = 1006) {
    this.onclose?.({ code });
  }
}

const opponent: ServerMessage = { v: 1, type: 'opponent', status: 'present' };

function harness(extra: { probe?: () => Promise<'gone' | 'ok'> } = {}) {
  const sockets: FakeSocket[] = [];
  const messages: ServerMessage[] = [];
  const statuses: string[] = [];
  let token: string | undefined;
  const conn = new RoomConnection({
    open: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
    hello: () => encode(join(token)),
    onMessage: (m) => messages.push(m),
    onStatus: (s: Status, why) => statuses.push(why ? `${s}:${why}` : s),
    ...extra,
  });
  return {
    conn,
    sockets,
    messages,
    statuses,
    setToken: (t: string) => (token = t),
    get last() {
      return sockets.at(-1)!;
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the room connection', () => {
  it('connects, says who it is (a join) and passes on what the server says', () => {
    const h = harness();
    h.conn.start();
    expect(h.statuses).toEqual(['connecting']);
    h.last.open();
    expect(h.statuses).toEqual(['connecting', 'open']);
    expect(h.last.sent).toEqual([encode(join())]);
    h.last.say(opponent);
    expect(h.messages).toEqual([opponent]);
  });

  it('sends exactly PING now and then, and does not parse the PONG', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    vi.advanceTimersByTime(PING_EVERY_MS);
    expect(h.last.sent.at(-1)).toBe(PING);
    h.last.say(PONG);
    expect(h.messages).toEqual([]);
    vi.advanceTimersByTime(PING_EVERY_MS);
    expect(h.last.sent.filter((t) => t === PING)).toHaveLength(2);
  });

  it('sends a message only while the socket is open', () => {
    const h = harness();
    expect(h.conn.send({ v: 1, type: 'resign' })).toBe(false);
    h.conn.start();
    expect(h.conn.send({ v: 1, type: 'resign' })).toBe(false);
    h.last.open();
    expect(h.conn.send({ v: 1, type: 'resign' })).toBe(true);
    expect(h.last.sent.at(-1)).toBe(encode({ v: 1, type: 'resign' }));
    h.last.drop();
    expect(h.conn.send({ v: 1, type: 'resign' })).toBe(false);
  });

  it('reconnects after a drop with backoff, joining again with the seat token', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    h.setToken(TOKEN);
    h.last.drop(1006);
    expect(h.statuses.at(-1)).toBe('reconnecting');
    expect(h.sockets).toHaveLength(1);
    vi.advanceTimersByTime(1_000);
    expect(h.sockets).toHaveLength(2);
    h.last.open();
    expect(h.statuses.at(-1)).toBe('open');
    expect(h.last.sent).toEqual([encode(join(TOKEN))]);
  });

  it('waits longer after each failure, up to a limit, and starts over after a message', () => {
    const h = harness();
    h.conn.start();
    const waits: number[] = [];
    for (let i = 0; i < 9; i++) {
      h.last.drop();
      const before = h.sockets.length;
      let waited = 0;
      while (h.sockets.length === before) {
        vi.advanceTimersByTime(250);
        waited += 250;
      }
      waits.push(waited);
    }
    expect(waits[0]).toBeLessThanOrEqual(1_000);
    expect(waits.every((w, i) => i === 0 || w >= waits[i - 1]!)).toBe(true);
    expect(waits.at(-1)).toBeLessThanOrEqual(30_000);
    expect(waits.at(-1)).toBeGreaterThan(waits[0]!);
    h.last.open();
    h.last.say(opponent);
    h.last.drop();
    let again = 0;
    const n = h.sockets.length;
    while (h.sockets.length === n) {
      vi.advanceTimersByTime(250);
      again += 250;
    }
    expect(again).toBe(waits[0]);
  });

  it('comes straight back when the server closed the socket as idle', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    h.last.drop(CLOSE_IDLE);
    expect(h.statuses.at(-1)).toBe('reconnecting');
    vi.advanceTimersByTime(1_000);
    expect(h.sockets).toHaveLength(2);
  });

  it('does not reconnect when the seat was taken back elsewhere, and says so', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    h.last.drop(CLOSE_REPLACED);
    expect(h.statuses.at(-1)).toBe('closed:replaced');
    vi.advanceTimersByTime(60_000);
    expect(h.sockets).toHaveLength(1);
  });

  it('stops when the room is gone', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    h.last.drop(CLOSE_GONE);
    expect(h.statuses.at(-1)).toBe('closed:gone');
    vi.advanceTimersByTime(60_000);
    expect(h.sockets).toHaveLength(1);
  });

  it('asks the server whether the room is gone when a connection never opened', async () => {
    const probe = vi.fn(async () => 'gone' as const);
    const h = harness({ probe });
    h.conn.start();
    h.last.drop(1006); // the handshake failed: the browser cannot say why
    await vi.advanceTimersByTimeAsync(1_000);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(h.statuses.at(-1)).toBe('closed:gone');
    expect(h.sockets).toHaveLength(1);
  });

  it('keeps trying when the probe finds the room still there', async () => {
    const probe = vi.fn(async () => 'ok' as const);
    const h = harness({ probe });
    h.conn.start();
    h.last.drop(1006);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.sockets).toHaveLength(2);
  });

  it('asks to reload when the server speaks another protocol version or nonsense', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    h.last.say(JSON.stringify({ v: 2, type: 'snapshot' }));
    expect(h.statuses.at(-1)).toBe('closed:outdated');
    expect(h.last.closed).toBeDefined();
    expect(h.messages).toEqual([]);
    vi.advanceTimersByTime(60_000);
    expect(h.sockets).toHaveLength(1);
  });

  it('does not reconnect after stop, and a late close changes nothing', () => {
    const h = harness();
    h.conn.start();
    h.last.open();
    h.conn.stop();
    expect(h.last.closed).toBeDefined();
    h.last.drop(1000);
    vi.advanceTimersByTime(60_000);
    expect(h.sockets).toHaveLength(1);
    expect(h.statuses).toEqual(['connecting', 'open']);
  });

  it('nudge reconnects now instead of waiting out the backoff', () => {
    const h = harness();
    h.conn.start();
    h.last.drop();
    h.last.drop();
    h.conn.nudge();
    expect(h.sockets).toHaveLength(2);
    h.conn.nudge(); // already connecting: no second socket
    expect(h.sockets).toHaveLength(2);
  });
});
