// The browser's three calls to the Worker (S52): make a room, look at a room, open its socket.
// Everything that comes back is checked whole before it is used. No names or accounts are sent:
// a create message holds the ruleset and the seat choice; the rest is the room code.
import {
  PROTOCOL_VERSION,
  parseRoomInfo,
  parseServerMessage,
  type ClientMessage,
  type RoomInfo,
  type SeatChoice,
  type Snapshot,
} from '@chess9s/online/protocol';
import type { RulesetInfo } from './rules';

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export type CreateMessage = Extract<ClientMessage, { type: 'create' }>;

/** The message that makes a room for a ruleset: a bundled one by id and version, a custom one by its overrides. */
export function createMessage(
  ruleset: RulesetInfo,
  seat: SeatChoice,
  computer: readonly string[] = [],
): CreateMessage {
  return {
    v: PROTOCOL_VERSION,
    type: 'create',
    ruleset: ruleset.overrides
      ? { name: ruleset.name, overrides: ruleset.overrides }
      : { id: ruleset.id, version: ruleset.version },
    seat,
    ...(computer.length > 0 && { computer: [...computer] }),
  };
}

const OFFLINE = 'Could not connect. Check your connection and try again.';

export type Created =
  { ok: true; snapshot: Snapshot & { token: string } } | { ok: false; problem: string };

/** `POST /api/rooms`: the creator's snapshot (with the seat token), or why no room was made. */
export async function createRoom(fetcher: Fetch, message: CreateMessage): Promise<Created> {
  let res: Response;
  let text: string;
  try {
    res = await fetcher('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    text = await res.text();
  } catch {
    return { ok: false, problem: OFFLINE };
  }
  const parsed = parseServerMessage(text);
  if (res.ok && parsed.ok && parsed.message.type === 'snapshot' && parsed.message.token) {
    return { ok: true, snapshot: parsed.message as Snapshot & { token: string } };
  }
  if (parsed.ok && parsed.message.type === 'refused') {
    return { ok: false, problem: parsed.message.message };
  }
  if (res.status === 429)
    return {
      ok: false,
      problem: 'Too many rooms were made just now. Wait a moment and try again.',
    };
  return { ok: false, problem: 'The room could not be made. Try again in a moment.' };
}

export type Peek = { ok: true; info: RoomInfo } | { ok: false; gone: boolean };

/** `GET /api/rooms/<code>`: the room's peek. `gone` means the server says there is no such room. */
export async function fetchRoom(fetcher: Fetch, code: string): Promise<Peek> {
  try {
    const res = await fetcher(`/api/rooms/${code}`);
    if (res.status === 404) return { ok: false, gone: true };
    const parsed = res.ok ? parseRoomInfo(await res.text()) : { ok: false as const };
    return parsed.ok ? { ok: true, info: parsed.info } : { ok: false, gone: false };
  } catch {
    return { ok: false, gone: false };
  }
}

/** The WebSocket address of a room, on the page's own host. */
export const socketUrl = (page: { protocol: string; host: string }, code: string): string =>
  `${page.protocol === 'https:' ? 'wss' : 'ws'}://${page.host}/api/rooms/${code}/socket`;
