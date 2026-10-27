// The Room Durable Object (S52, D18): one per room code, a thin adapter over S51's room logic.
// Sockets use the WebSocket Hibernation API, so an idle room costs nothing; the game is saved to
// the object's storage on every move and replayed by the engine when the object wakes, so a
// restart loses nothing. One alarm does two jobs: it closes idle sockets and deletes the room on
// D53's schedule. Nothing about a player is kept: no names, IP addresses or user agents, only the
// game and its two seat tokens, and nothing is logged.
import { loadRules, type GameResult } from '@chess9s/engine';
import {
  CLOSE_GONE,
  CLOSE_IDLE,
  CLOSE_REPLACED,
  PING,
  PONG,
  encode,
  leave,
  parseClientMessage,
  receive,
  refused,
  replayGame,
  rulesFiles,
  snapshotFor,
  type Outgoing,
  type Room as RoomData,
  type RoomContext,
  type RoomRuleset,
  type SeatStatus,
} from '@chess9s/online';

const data = loadRules(rulesFiles);
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

const HOUR = 3_600_000;
/** D53 (default): a room is deleted 24 hours after its game ends... */
export const KEEP_AFTER_END_MS = 24 * HOUR;
/** ...or after 7 days with no move (its creation counts as the first). */
export const KEEP_WITHOUT_MOVE_MS = 7 * 24 * HOUR;
// Idle sockets (S52 default, provisional): a socket must join within a minute; a seated socket
// that sends no message and no PING for 15 minutes is closed (its seat stays; it may come back).
export const JOIN_WITHIN_MS = 60_000;
export const IDLE_MS = 15 * 60_000;
/** Two seats (D52: no spectators), with room for each seat's reconnect before the old one closes. */
export const MAX_SOCKETS = 4;

/** What the runtime gives a Room; the real DurableObjectState fits it. */
export interface Socket {
  send(text: string): void;
  close(code?: number, reason?: string): void;
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}
export interface RoomState {
  storage: {
    kv: { get<T>(key: string): T | undefined; put<T>(key: string, value: T): void };
    deleteAll(): Promise<void>;
    getAlarm(): Promise<number | null>;
    setAlarm(time: number): Promise<void>;
    deleteAlarm(): Promise<void>;
  };
  acceptWebSocket(ws: Socket): void;
  getWebSockets(): Socket[];
  getWebSocketAutoResponseTimestamp(ws: Socket): Date | null;
}
/** Making sockets, the one part that needs the Workers runtime itself. */
export interface Sockets {
  /** A new pair: the server end to accept, and the 101 response that hands over the other end. */
  open(): { server: Socket; response: Response };
  /** Answer PING with PONG without waking the room. */
  keepAlive(state: RoomState): void;
}

const cloudflareSockets: Sockets = {
  open() {
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    return { server, response: new Response(null, { status: 101, webSocket: client }) };
  },
  keepAlive(state) {
    (state as unknown as DurableObjectState).setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(PING, PONG),
    );
  },
};

/** The one record a room keeps: enough to replay its game, and the dates D53 needs. */
interface Saved {
  v: 1;
  code: string;
  ruleset: RoomRuleset;
  /** By side; null while the seat is open. */
  tokens: Record<string, string | null>;
  moves: string[];
  result: GameResult;
  drawOffer: string | null;
  offerWait: string[];
  lastMove: number;
  endedAt: number | null;
}
const KEY = 'room';

/** What each socket carries through hibernation. */
interface Attachment {
  seat: string | null;
  /** When it last sent a message (or connected). */
  seen: number;
}

/** What `GET /api/rooms/<code>` shows: enough to decide to join (D54), never a token. */
export interface RoomInfo {
  v: 1;
  code: string;
  ruleset: RoomRuleset;
  seats: Record<string, SeatStatus>;
  result: GameResult;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
const problem = (status: number, error: string, message: string) =>
  json(status, { error, message });

const keepUntil = (s: Saved) =>
  s.endedAt !== null ? s.endedAt + KEEP_AFTER_END_MS : s.lastMove + KEEP_WITHOUT_MOVE_MS;

export class Room {
  /** The room in memory: undefined until read from storage, null when there is none. */
  private room: RoomData | null | undefined;
  private saved: Saved | null = null;

  constructor(
    private readonly state: RoomState,
    _env: unknown,
    private readonly sockets: Sockets = cloudflareSockets,
  ) {
    sockets.keepAlive(state);
  }

  private attachment(ws: Socket): Attachment {
    const a = ws.deserializeAttachment() as Attachment | null;
    return a ?? { seat: null, seen: Date.now() };
  }

  /** The room, replayed from storage on first use. Seats are present while a socket holds them. */
  private load(): RoomData | null {
    if (this.room !== undefined) return this.room;
    const saved = this.state.storage.kv.get<Saved>(KEY) ?? null;
    this.saved = saved;
    if (!saved) return (this.room = null);
    const replay = replayGame(data, saved.ruleset, saved.moves, saved.result);
    // A game that no longer replays is gone for play; D53's alarm still deletes its record.
    if (!replay.ok) return (this.room = null);
    const held = new Set(this.state.getWebSockets().map((ws) => this.attachment(ws).seat));
    this.room = {
      code: saved.code,
      ruleset: saved.ruleset,
      game: replay.game,
      seats: Object.fromEntries(
        Object.entries(saved.tokens).map(([side, token]) => [
          side,
          { token, present: token !== null && held.has(side) },
        ]),
      ),
      drawOffer: saved.drawOffer,
      offerWait: saved.offerWait,
    };
    return this.room;
  }

  /** Keep the room's record when anything but presence changed. */
  private save(room: RoomData, now: number): void {
    const before = this.saved;
    const moves = room.game.moves.map((m) => m.notation);
    const ended = room.game.result.status !== 'ongoing';
    const next: Saved = {
      v: 1,
      code: room.code,
      ruleset: room.ruleset,
      tokens: Object.fromEntries(Object.entries(room.seats).map(([side, s]) => [side, s.token])),
      moves,
      result: room.game.result,
      drawOffer: room.drawOffer,
      offerWait: room.offerWait,
      lastMove: before && moves.length === before.moves.length ? before.lastMove : now,
      endedAt: ended ? (before?.endedAt ?? now) : null,
    };
    if (before && JSON.stringify(before) === JSON.stringify(next)) return;
    this.state.storage.kv.put(KEY, next);
    this.saved = next;
  }

  /** The earliest time the alarm has work: a socket's idle limit, or the room's deletion. */
  private nextWake(): number | null {
    const times: number[] = this.saved ? [keepUntil(this.saved)] : [];
    for (const ws of this.state.getWebSockets()) times.push(this.idleAt(ws));
    return times.length ? Math.min(...times) : null;
  }

  private idleAt(ws: Socket): number {
    const a = this.attachment(ws);
    if (a.seat === null) return a.seen + JOIN_WITHIN_MS;
    const pinged = this.state.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0;
    return Math.max(a.seen, pinged) + IDLE_MS;
  }

  /** Bring the alarm forward when there is earlier work; an early alarm just sets the next. */
  private async schedule(): Promise<void> {
    const next = this.nextWake();
    if (next === null) return;
    const current = await this.state.storage.getAlarm();
    if (current === null || current > next) await this.state.storage.setAlarm(next);
  }

  private deliver(sender: Socket | null, out: Outgoing[]): void {
    for (const { to, message } of out) {
      const text = encode(message);
      const targets =
        to === 'sender'
          ? sender
            ? [sender]
            : []
          : this.state.getWebSockets().filter((ws) => this.attachment(ws).seat === to.seat);
      for (const ws of targets) {
        try {
          ws.send(text);
        } catch {
          // A socket that is closing; its close handler does the rest.
        }
      }
    }
  }

  /** Close a socket on the server's side: it holds no seat from now on. */
  private shut(ws: Socket, code: number, reason: string): void {
    ws.serializeAttachment({ seat: null, seen: Date.now() } satisfies Attachment);
    try {
      ws.close(code, reason);
    } catch {
      // Already closed.
    }
  }

  /** A seat's socket is gone: unless another socket holds the seat, the seat is away. */
  private vacate(gone: Socket, seat: string): void {
    const room = this.load();
    if (!room) return;
    const held = this.state
      .getWebSockets()
      .some((ws) => ws !== gone && this.attachment(ws).seat === seat);
    if (held) return;
    const step = leave(room, seat);
    this.room = step.room;
    this.deliver(null, step.out);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/create' && request.method === 'POST') {
      return this.create(url.searchParams.get('code') ?? '', await request.text());
    }
    if (url.pathname === '/info') return this.info();
    if (url.pathname === '/socket') return this.connect();
    return problem(404, 'not-found', 'There is nothing here.');
  }

  private async create(code: string, text: string): Promise<Response> {
    if (this.load() || this.saved) return problem(409, 'room-exists', 'This code is taken.');
    const parsed = parseClientMessage(text);
    if (!parsed.ok) return json(400, parsed.refused);
    if (parsed.message.type !== 'create') {
      return json(400, refused('malformed', 'Send a create message to open a room.'));
    }
    const ctx: RoomContext = { data, random, code };
    const step = receive(ctx, null, null, text);
    if (!step.room || step.seat === null) {
      return json(400, step.out[0]?.message ?? refused('malformed', 'No room was made.'));
    }
    // The creator holds the seat once it connects with its token.
    const room = leave(step.room, step.seat).room!;
    this.room = room;
    this.save(room, Date.now());
    await this.schedule();
    return json(201, snapshotFor(room, step.seat, true));
  }

  private info(): Response {
    const room = this.load();
    if (!room) return problem(404, 'no-room', 'There is no room with this code.');
    const snap = snapshotFor(room, room.game.order[0]!);
    const body: RoomInfo = {
      v: 1,
      code: room.code,
      ruleset: room.ruleset,
      seats: snap.seats,
      result: room.game.result,
    };
    return json(200, body);
  }

  private async connect(): Promise<Response> {
    if (!this.load()) return problem(404, 'no-room', 'There is no room with this code.');
    if (this.state.getWebSockets().length >= MAX_SOCKETS) {
      return problem(429, 'room-busy', 'This room has too many connections.');
    }
    const { server, response } = this.sockets.open();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ seat: null, seen: Date.now() } satisfies Attachment);
    await this.schedule();
    return response;
  }

  async webSocketMessage(ws: Socket, message: string | ArrayBuffer): Promise<void> {
    const before = this.load();
    if (!before) return this.shut(ws, CLOSE_GONE, 'This room is gone.');
    const now = Date.now();
    const a = this.attachment(ws);
    if (typeof message !== 'string') {
      ws.serializeAttachment({ ...a, seen: now } satisfies Attachment);
      return this.deliver(ws, [
        { to: 'sender', message: refused('malformed', 'Messages are JSON text.') },
      ]);
    }
    const step = receive({ data, random, code: before.code }, before, a.seat, message);
    ws.serializeAttachment({ seat: step.seat, seen: now } satisfies Attachment);
    if (a.seat === null && step.seat !== null) {
      // The seat was taken back here: an older socket on it closes, and its seat stays present.
      for (const other of this.state.getWebSockets()) {
        if (other !== ws && this.attachment(other).seat === step.seat) {
          this.shut(other, CLOSE_REPLACED, 'Your seat was taken back on another connection.');
        }
      }
    }
    const room = step.room!;
    this.room = room;
    this.save(room, now);
    this.deliver(ws, step.out);
    if (before.game.result.status === 'ongoing' && room.game.result.status !== 'ongoing') {
      await this.schedule();
    }
  }

  async webSocketClose(ws: Socket): Promise<void> {
    // Read the room while the closing socket still counts, so its seat turns away below.
    this.load();
    const { seat } = this.attachment(ws);
    this.shut(ws, 1000, 'Closed.');
    if (seat !== null) this.vacate(ws, seat);
  }

  async webSocketError(ws: Socket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    this.load();
    if (!this.saved || now >= keepUntil(this.saved)) return this.remove();
    for (const ws of this.state.getWebSockets()) {
      if (now < this.idleAt(ws)) continue;
      const { seat } = this.attachment(ws);
      this.shut(ws, CLOSE_IDLE, 'Idle.');
      if (seat !== null) this.vacate(ws, seat);
    }
    await this.schedule();
  }

  /** D53: the room, its moves and its tokens are deleted; the server keeps no other copy. */
  private async remove(): Promise<void> {
    for (const ws of this.state.getWebSockets()) this.shut(ws, CLOSE_GONE, 'This room is gone.');
    await this.state.storage.deleteAll();
    await this.state.storage.deleteAlarm();
    this.room = null;
    this.saved = null;
  }
}
