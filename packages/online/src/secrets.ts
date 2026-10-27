// Room codes and seat tokens (S51, D54). Randomness is passed in (crypto.getRandomValues on the
// server, a seeded source in tests), so the room logic stays deterministic.
import { CODE_ALPHABET, CODE_LENGTH } from './protocol';

/** `n` random bytes. */
export type RandomBytes = (n: number) => Uint8Array;

export const TOKEN_BYTES = 32;

/** A uniform index below `n` (at most 256), by rejection, so no value is favored. */
export function randomIndex(random: RandomBytes, n: number): number {
  const limit = 256 - (256 % n);
  for (;;) {
    const byte = random(1)[0]!;
    if (byte < limit) return byte % n;
  }
}

/** A new room code: 6 characters from the 31 without look-alikes. */
export const newRoomCode = (random: RandomBytes): string =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomIndex(random, CODE_ALPHABET.length)],
  ).join('');

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let c = 0; c < chars; c++) out += BASE64URL[(n >> (18 - 6 * c)) & 63];
  }
  return out;
}

/** A new seat token: 32 random bytes as base64url (43 characters). */
export const newSeatToken = (random: RandomBytes): string => base64url(random(TOKEN_BYTES));

/**
 * Whether two tokens are equal, in time that depends on their length only, never on where they
 * first differ. Tokens all have the same length, so a length mismatch gives nothing away.
 */
export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
