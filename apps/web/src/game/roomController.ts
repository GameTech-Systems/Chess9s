// The room page's logic (S53), apart from React: find the room, preview it, take or take back a
// seat, and play. It owns the connection (connection.ts), keeps the seat token in the browser
// (onlineStore.ts) and holds the page's state (`phase`) for React to draw. Every input is a
// method; the server is reached only through the injected `fetch` and `open`, so a test drives it
// with a fake server.
import {
  isRoomCode,
  type ClientMessage,
  type RoomInfo,
  type ServerMessage,
} from '@chess9s/online/protocol';
import { fetchRoom, type Fetch } from './api';
import { RoomConnection, type ClosedWhy, type SocketLike, type Status } from './connection';
import type { Store } from './guest';
import {
  GONE_TEXT,
  RELOAD_TEXT,
  REPLACED_TEXT,
  applyServer,
  canAct,
  cancelPromotion,
  choosePromotion,
  joinProblem,
  pressSquare,
  setConnection,
  startOnline,
  takeBack,
  type JoinProblemKind,
  type Online,
} from './online';
import { forgetSeat, loadSeat, saveSeat } from './onlineStore';
import { findRuleset } from './rules';
import { toggleDanger, toggleMoves } from './session';

export type ProblemKind = JoinProblemKind | 'offline';

export type Phase =
  | { kind: 'loading' }
  | { kind: 'problem'; problem: ProblemKind; text: string }
  /** A room with an open seat, shown before the player takes it. */
  | { kind: 'preview'; info: RoomInfo; side: string }
  /** The socket is opening; the first snapshot has not come. */
  | { kind: 'joining' }
  | { kind: 'playing'; online: Online };

export interface ControllerDeps {
  code: string;
  /** Where the seat token is kept; null when the browser blocks storage. */
  store: Store | null;
  fetch: Fetch;
  open: () => SocketLike;
}

const OFFLINE_TEXT = 'Could not reach the room. Check your connection and try again.';

export class RoomController {
  phase: Phase = { kind: 'loading' };
  private listeners = new Set<() => void>();
  private conn: RoomConnection | null = null;
  private stopped = false;
  /** The seat token, held in memory too, in case the browser will not keep it. */
  private token: string | undefined;

  constructor(private readonly deps: ControllerDeps) {}

  /** For `useSyncExternalStore`. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };
  getSnapshot = (): Phase => this.phase;

  private set(phase: Phase): void {
    this.phase = phase;
    for (const l of [...this.listeners]) l();
  }
  private problem(problem: ProblemKind, text: string): void {
    this.set({ kind: 'problem', problem, text });
  }

  /** Look at the room: a seat kept in this browser goes straight back in, otherwise it is previewed. */
  async start(): Promise<void> {
    this.stopped = false;
    const { code, store } = this.deps;
    if (!isRoomCode(code)) return this.problem('gone', GONE_TEXT);
    this.set({ kind: 'loading' });
    const saved = loadSeat(store, code);
    if (saved) {
      this.token = saved.token;
      return this.connect();
    }
    const peek = await fetchRoom(this.deps.fetch, code);
    if (this.stopped) return;
    if (!peek.ok) {
      return peek.gone ? this.problem('gone', GONE_TEXT) : this.problem('offline', OFFLINE_TEXT);
    }
    const { info } = peek;
    // A room made by a newer app on a ruleset this one does not have cannot be shown or played.
    if (!info.ruleset.overrides && !findRuleset(info.ruleset.id, info.ruleset.version)) {
      return this.problem('outdated', RELOAD_TEXT);
    }
    const side = Object.keys(info.seats).find((s) => info.seats[s] === 'open');
    if (side === undefined) return this.problem('full', joinProblem('room-full', '').text);
    this.set({ kind: 'preview', info, side });
  }

  /** Take the open seat of a previewed room. */
  join(): void {
    if (this.phase.kind === 'preview') this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.conn?.stop();
    this.conn = null;
  }

  private connect(): void {
    const { code, store } = this.deps;
    this.set({ kind: 'joining' });
    this.conn?.stop();
    const conn = new RoomConnection({
      open: this.deps.open,
      hello: () => {
        const token = this.token ?? loadSeat(store, code)?.token;
        const join: ClientMessage = { v: 1, type: 'join', code, ...(token && { token }) };
        return JSON.stringify(join);
      },
      onMessage: (m) => this.onMessage(m),
      onStatus: (s, why) => this.onStatus(s, why),
      probe: async () => {
        const peek = await fetchRoom(this.deps.fetch, code);
        return !peek.ok && peek.gone ? 'gone' : 'ok';
      },
    });
    this.conn = conn;
    conn.start();
  }

  private forget(): void {
    this.token = undefined;
    forgetSeat(this.deps.store, this.deps.code);
  }

  private onStatus(status: Status, why?: ClosedWhy): void {
    const { phase } = this;
    if (status === 'closed') {
      if (why === 'gone') {
        this.forget();
        return this.problem('gone', GONE_TEXT);
      }
      if (phase.kind === 'playing') {
        return this.set({ kind: 'playing', online: setConnection(phase.online, 'closed', why) });
      }
      return why === 'outdated'
        ? this.problem('outdated', RELOAD_TEXT)
        : this.problem('other', REPLACED_TEXT);
    }
    if (phase.kind === 'playing') {
      this.set({ kind: 'playing', online: setConnection(phase.online, status) });
    }
  }

  private onMessage(message: ServerMessage): void {
    const { phase } = this;
    if (phase.kind === 'joining') {
      if (message.type === 'refused') {
        const p = joinProblem(message.reason, message.message);
        if (p.kind === 'lost' || p.kind === 'gone') this.forget();
        this.conn?.stop();
        return this.problem(p.kind, p.text);
      }
      if (message.type !== 'snapshot') return;
      const online = startOnline(message, undefined, 'open');
      if (!online) {
        this.conn?.stop();
        return this.problem('outdated', RELOAD_TEXT);
      }
      if (message.token) {
        this.token = message.token;
        saveSeat(this.deps.store, this.deps.code, { seat: message.seat, token: message.token });
      }
      return this.set({ kind: 'playing', online });
    }
    if (phase.kind !== 'playing') return;
    const online = applyServer(phase.online, message);
    if (online.closed === 'gone' || online.closed === 'lost') {
      this.forget();
      this.conn?.stop();
      return online.closed === 'gone'
        ? this.problem('gone', GONE_TEXT)
        : this.problem('lost', joinProblem('bad-token', '').text);
    }
    if (online.closed !== null) this.conn?.stop();
    this.set({ kind: 'playing', online });
  }

  // The player's moves on the page.

  private update(change: (o: Online) => Online): void {
    if (this.phase.kind === 'playing')
      this.set({ kind: 'playing', online: change(this.phase.online) });
  }

  private sendMove(r: { online: Online; send?: ClientMessage }): void {
    if (r.send && !this.conn?.send(r.send)) {
      return this.update(() => takeBack(r.online, 'Not connected. Try that move again.'));
    }
    this.update(() => r.online);
  }

  press(at: string): void {
    if (this.phase.kind === 'playing') this.sendMove(pressSquare(this.phase.online, at));
  }
  promote(piece: string): void {
    if (this.phase.kind === 'playing') this.sendMove(choosePromotion(this.phase.online, piece));
  }
  cancelPromotion(): void {
    this.update(cancelPromotion);
  }

  private act(message: ClientMessage): void {
    if (this.phase.kind === 'playing' && canAct(this.phase.online)) this.conn?.send(message);
  }
  resign(): void {
    this.act({ v: 1, type: 'resign' });
  }
  offerDraw(): void {
    this.act({ v: 1, type: 'offer-draw' });
  }
  acceptDraw(): void {
    this.act({ v: 1, type: 'accept-draw' });
  }
  declineDraw(): void {
    this.act({ v: 1, type: 'decline-draw' });
  }

  toggleMoves(): void {
    this.update((o) => ({ ...o, model: toggleMoves(o.model) }));
  }
  toggleDanger(): void {
    this.update((o) => ({ ...o, model: toggleDanger(o.model) }));
  }
  /** The network is back or the page is visible again: reconnect now. */
  nudge(): void {
    this.conn?.nudge();
  }
}
