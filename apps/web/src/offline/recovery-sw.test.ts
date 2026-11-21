import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// The recovery worker (decision 0025, item 8) is kept ready, not deployed: if a released sw.js
// misbehaves, this file is copied to apps/web/public/sw.js and shipped in its place.
const code = readFileSync(new URL('./recovery-sw.js', import.meta.url), 'utf8');

function scope() {
  const caches = new Set(['chess9s-v1', 'chess9s-v2', 'someone-else']);
  const listeners: Record<string, (event: unknown) => void> = {};
  const navigated: string[] = [];
  const log = { skipped: false, unregistered: false };
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
    skipWaiting: async () => void (log.skipped = true),
    registration: { unregister: async () => ((log.unregistered = true), true) },
    clients: {
      matchAll: async (opts: { type: string }) => {
        expect(opts.type).toBe('window');
        return ['https://chess9s.com/', 'https://chess9s.com/rules/standard-2p'].map((url) => ({
          url,
          navigate: async (to: string) => void navigated.push(to),
        }));
      },
    },
  };
  const ctx = {
    self,
    caches: {
      keys: async () => [...caches],
      delete: async (name: string) => caches.delete(name),
    },
    Promise,
  };
  runInNewContext(code, ctx);
  const fire = async (type: string) => {
    let waited: Promise<unknown> | undefined;
    listeners[type]!({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
  };
  return { caches, listeners, navigated, log, fire };
}

describe('recovery sw.js (kept ready)', () => {
  it('takes over at once, deletes every Chess Nines cache, unregisters and reloads its pages', async () => {
    const s = scope();
    await s.fire('install');
    expect(s.log.skipped).toBe(true);
    await s.fire('activate');
    expect([...s.caches]).toEqual(['someone-else']);
    expect(s.log.unregistered).toBe(true);
    expect(s.navigated).toEqual(['https://chess9s.com/', 'https://chess9s.com/rules/standard-2p']);
  });

  it('answers no requests, so every page goes to the network', () => {
    expect(scope().listeners.fetch).toBeUndefined();
  });
});
