// A room's WebSocket, kept alive for as long as the page wants it (S53): it joins on every
// connection, sends the keep-alive PING, and after a drop comes back with growing waits. The
// server's close codes say whether to come back (protocol.ts): idle, yes, with the token; seat
// taken elsewhere, no; room gone, no. A server message this version cannot read means the app is
// out of date after a deploy ("Reload to update"). The socket is injected, so tests need none.
import {
  CLOSE_GONE,
  CLOSE_REPLACED,
  PING,
  PONG,
  encode,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@chess9s/online/protocol';

/** The part of `WebSocket` used here. */
export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: ((e: { code: number }) => void) | null;
  onerror: (() => void) | null;
  send(text: string): void;
  close(code?: number): void;
}

export type Status = 'connecting' | 'open' | 'reconnecting' | 'closed';
/** Why a connection ended for good: the seat is held elsewhere, the room is gone, or the app is out of date. */
export type ClosedWhy = 'replaced' | 'gone' | 'outdated';

/** The server drops a seated socket after 15 minutes of silence (S52); a ping well inside that. */
export const PING_EVERY_MS = 30_000;
/** Waits before each try after a drop; the last one repeats. */
const BACKOFF_MS = [500, 1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

export interface ConnectionOptions {
  open: () => SocketLike;
  /** The join message for each connection, read afresh so it carries the seat token as saved now. */
  hello: () => string;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: Status, why?: ClosedWhy) => void;
  /** Asked after a connection that never opened (the browser cannot say why): is the room still there? */
  probe?: () => Promise<'gone' | 'ok'>;
}

export class RoomConnection {
  private socket: SocketLike | null = null;
  private wait: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private failures = 0;
  private stopped = true;
  private opened = false;
  private ready = false;

  constructor(private readonly options: ConnectionOptions) {}

  start(): void {
    this.stopped = false;
    this.failures = 0;
    this.options.onStatus('connecting');
    this.connect();
  }

  /** Close for good (the page left the room): nothing more is said to the listeners. */
  stop(): void {
    this.stopped = true;
    this.clear();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close(1000);
    }
  }

  /** The network came back or the page was shown again: try now rather than after the wait. */
  nudge(): void {
    if (this.stopped || this.socket || this.wait === null) return;
    clearTimeout(this.wait);
    this.wait = null;
    this.connect();
  }

  /** Send a message; false (and nothing sent) unless the socket is open. */
  send(message: ClientMessage): boolean {
    if (!this.socket || !this.ready) return false;
    this.socket.send(encode(message));
    return true;
  }

  private clear(): void {
    if (this.wait !== null) clearTimeout(this.wait);
    if (this.ping !== null) clearInterval(this.ping);
    this.wait = this.ping = null;
    this.ready = false;
  }

  private connect(): void {
    this.opened = false;
    const socket = this.options.open();
    this.socket = socket;
    socket.onopen = () => {
      this.opened = true;
      this.ready = true;
      socket.send(this.options.hello());
      this.ping = setInterval(() => socket.send(PING), PING_EVERY_MS);
      this.options.onStatus('open');
    };
    socket.onmessage = (e) => {
      if (typeof e.data !== 'string' || e.data === PONG) return;
      const parsed = parseServerMessage(e.data);
      if (!parsed.ok) return this.end('outdated');
      this.failures = 0;
      this.options.onMessage(parsed.message);
    };
    socket.onclose = (e) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clear();
      if (e.code === CLOSE_REPLACED) return this.end('replaced');
      if (e.code === CLOSE_GONE) return this.end('gone');
      this.options.onStatus('reconnecting');
      const delay = BACKOFF_MS[Math.min(this.failures, BACKOFF_MS.length - 1)]!;
      this.failures += 1;
      const neverOpened = !this.opened;
      this.wait = setTimeout(() => {
        this.wait = null;
        if (neverOpened && this.options.probe) {
          void this.options.probe().then((state) => {
            if (this.stopped) return;
            if (state === 'gone') this.end('gone');
            else this.connect();
          });
        } else this.connect();
      }, delay);
    };
  }

  /** Ended for good; the listener says why. */
  private end(why: ClosedWhy): void {
    const socket = this.socket;
    this.socket = null;
    this.clear();
    this.stopped = true;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close(1000);
    }
    this.options.onStatus('closed', why);
  }
}
