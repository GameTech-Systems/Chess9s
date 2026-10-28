// Online play keeps one thing in the browser: for each room the player sits in, the seat and its
// secret token, so a reload or a drop can take the seat back (S53). Nothing else: no name, no
// address. An entry is removed when the room ends or expires (the server says so), and any entry
// older than a room can live is dropped on the next read. A load checks every entry's shape.
import { MAX_COMPUTER_SEATS, isRoomCode, isSeatToken } from '@chess9s/online/protocol';
import type { Store } from './guest';

export const ONLINE_KEY = 'chess9s.online';
/** D53: a room is deleted after 7 days with no move at the latest; keep an entry a day longer. */
const KEEP_MS = 8 * 86_400_000;
const SIDE = /^[a-z][a-z0-9-]{0,31}$/;

export interface SavedSeat {
  seat: string;
  token: string;
  /** 3-seat rooms the player made with computer seats: those seats' tokens, by side (S63). */
  computer?: Record<string, string>;
}
interface Entry extends SavedSeat {
  /** When the seat was taken or last saved (ms since the epoch). */
  at: number;
}

/** The computer seats' tokens of an entry: a few sides with tokens, none of them the player's own. */
function computerTokens(value: unknown, own: string): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  const fine =
    entries.length >= 1 &&
    entries.length <= MAX_COMPUTER_SEATS &&
    entries.every(([side, token]) => SIDE.test(side) && side !== own && isSeatToken(token));
  return fine ? (value as Record<string, string>) : undefined;
}

/** Every well-formed, unexpired entry, by room code. Anything else in the key is dropped. */
function read(store: Store | null, now: number): Record<string, Entry> {
  if (!store) return {};
  try {
    const text = store.getItem(ONLINE_KEY);
    if (text === null) return {};
    const saved: unknown = JSON.parse(text);
    if (typeof saved !== 'object' || saved === null) return {};
    const { v, rooms } = saved as { v?: unknown; rooms?: unknown };
    if (v !== 1 || typeof rooms !== 'object' || rooms === null) return {};
    const out: Record<string, Entry> = {};
    for (const [code, e] of Object.entries(rooms)) {
      const { seat, token, at, computer } = (e ?? {}) as Partial<Entry> & { computer?: unknown };
      if (
        isRoomCode(code) &&
        typeof seat === 'string' &&
        SIDE.test(seat) &&
        isSeatToken(token) &&
        typeof at === 'number' &&
        now - at < KEEP_MS
      ) {
        const kept = computerTokens(computer, seat);
        out[code] = { seat, token, at, ...(kept && { computer: kept }) };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(store: Store | null, rooms: Record<string, Entry>): void {
  if (!store) return;
  try {
    if (Object.keys(rooms).length === 0) store.removeItem(ONLINE_KEY);
    else store.setItem(ONLINE_KEY, JSON.stringify({ v: 1, rooms }));
  } catch {
    // Storage blocked or full: the game goes on, just not kept across a reload.
  }
}

/** The seat this browser holds in a room, or null. */
export function loadSeat(store: Store | null, code: string, now = Date.now()): SavedSeat | null {
  const e = read(store, now)[code];
  return e ? { seat: e.seat, token: e.token, ...(e.computer && { computer: e.computer }) } : null;
}

export function saveSeat(
  store: Store | null,
  code: string,
  seat: SavedSeat,
  now = Date.now(),
): void {
  write(store, {
    ...read(store, now),
    [code]: {
      seat: seat.seat,
      token: seat.token,
      ...(seat.computer && { computer: seat.computer }),
      at: now,
    },
  });
}

/** The room ended or expired: its entry goes. */
export function forgetSeat(store: Store | null, code: string, now = Date.now()): void {
  const rooms = read(store, now);
  delete rooms[code];
  write(store, rooms);
}
