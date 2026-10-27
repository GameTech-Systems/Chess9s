// Test stand-ins for the Durable Object runtime (S52): a state with sync KV storage, an alarm and
// hibernatable sockets, kept apart from any Room instance so a test can "restart" the object by
// building a new Room on the same state, as Cloudflare does after hibernation or eviction.
import { parseServerMessage, type ServerMessage } from '@chess9s/online';
import { Room, type RoomState, type Socket, type Sockets } from './room';

export class FakeSocket implements Socket {
  sent: string[] = [];
  closed: { code: number | undefined; reason: string | undefined } | null = null;
  /** When the runtime last answered this socket's PING for it. */
  pinged: Date | null = null;
  private attachment: unknown = null;

  send(text: string): void {
    if (this.closed) throw new Error('The socket is closed.');
    this.sent.push(text);
  }
  close(code?: number, reason?: string): void {
    this.closed ??= { code, reason };
  }
  serializeAttachment(value: unknown): void {
    this.attachment = structuredClone(value);
  }
  deserializeAttachment(): unknown {
    return structuredClone(this.attachment);
  }
  /** Every message sent so far, each checked as a valid server message. */
  messages(): ServerMessage[] {
    return this.sent.map((text) => {
      const parsed = parseServerMessage(text);
      if (!parsed.ok) throw new Error(`Not a server message: ${text}`);
      return parsed.message;
    });
  }
  /** Messages sent since the last call. */
  take(): ServerMessage[] {
    const all = this.messages();
    this.sent = [];
    return all;
  }
}

export class FakeState implements RoomState {
  readonly data = new Map<string, unknown>();
  alarmAt: number | null = null;
  readonly sockets: FakeSocket[] = [];
  autoResponse: unknown = null;

  readonly storage = {
    kv: {
      get: <T>(key: string): T | undefined => structuredClone(this.data.get(key)) as T | undefined,
      put: <T>(key: string, value: T): void => void this.data.set(key, structuredClone(value)),
    },
    deleteAll: async (): Promise<void> => {
      this.data.clear();
      this.alarmAt = null;
    },
    getAlarm: async (): Promise<number | null> => this.alarmAt,
    setAlarm: async (time: number): Promise<void> => {
      this.alarmAt = time;
    },
    deleteAlarm: async (): Promise<void> => {
      this.alarmAt = null;
    },
  };

  acceptWebSocket(ws: FakeSocket): void {
    this.sockets.push(ws);
  }
  getWebSockets(): FakeSocket[] {
    return this.sockets.filter((s) => !s.closed);
  }
  getWebSocketAutoResponseTimestamp(ws: FakeSocket): Date | null {
    return ws.pinged;
  }
}

/** Sockets without the runtime: a FakeSocket for the server end and a plain 200 for the 101. */
export class FakeSockets implements Sockets {
  last: FakeSocket | null = null;
  open() {
    this.last = new FakeSocket();
    return { server: this.last, response: new Response(null, { status: 200 }) };
  }
  keepAlive(state: RoomState): void {
    (state as FakeState).autoResponse = 'ping/pong';
  }
}

/** A Durable Object namespace of Rooms on fake states, by room code. */
export class FakeRooms {
  readonly states = new Map<string, FakeState>();
  readonly sockets = new FakeSockets();
  /** Every code a stub was asked for. */
  readonly asked: string[] = [];

  idFromName(name: string): DurableObjectId {
    return name as unknown as DurableObjectId;
  }
  get(id: DurableObjectId) {
    const code = id as unknown as string;
    this.asked.push(code);
    if (!this.states.has(code)) this.states.set(code, new FakeState());
    const room = new Room(this.states.get(code)!, {}, this.sockets);
    return { fetch: (request: Request) => room.fetch(request) };
  }
}
