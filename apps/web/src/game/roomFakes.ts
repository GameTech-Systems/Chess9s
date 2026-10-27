// Fakes for the room page's tests (S53): a server's answers by hand, a socket the test speaks
// for, and a store in memory. Used by tests only; nothing in the app imports this.
import {
  PING,
  encode,
  type ClientMessage,
  type RoomInfo,
  type ServerMessage,
  type Snapshot,
} from '@chess9s/online/protocol';
import hotSeatMate from '../../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import type { SocketLike } from './connection';
import type { Store } from './guest';

export const TOKEN = 'A'.repeat(42) + '_';
export const CODE = 'K7RX2M';
export const DRAFT = { id: 'draft-2p', version: '0.2.0', name: 'Good Practice' };
export const MOVES: string[] = hotSeatMate.moves;

export const info = (over: Partial<RoomInfo> = {}): RoomInfo => ({
  v: 1,
  code: CODE,
  ruleset: DRAFT,
  seats: { light: 'present', dark: 'open' },
  result: { status: 'ongoing' },
  ...over,
});
export const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
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

export class FakeSocket implements SocketLike {
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

export const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};
