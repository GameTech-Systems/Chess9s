import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { precacheList, writeServiceWorker } from './build-sw.mjs';

/** A built app as `vite build` writes it, with the public files copied in. */
function fakeDist(css = 'body{}') {
  const dir = mkdtempSync(join(tmpdir(), 'c9-dist-'));
  const files: Record<string, string> = {
    'index.html': '<!doctype html><script src="/assets/index-abc.js"></script>',
    'assets/index-abc.js': 'console.log(1)',
    'assets/index-def.css': css,
    'assets/bot.worker-ghi.js': 'onmessage=()=>{}',
    'assets/emblem-jkl.svg': '<svg/>',
    'favicon.ico': 'ico',
    'apple-touch-icon.png': 'png',
    'icon-192.png': 'png',
    'icon-512.png': 'png',
    'site.webmanifest': '{}',
    'third-party-licenses.txt': 'MIT',
    'share.png': 'png',
    'robots.txt': 'User-agent: *',
    'sitemap.xml': '<urlset/>',
    _headers: '/*',
    '.well-known/security.txt': 'Contact: x',
  };
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

/** A fake service worker global: its caches, its listeners and the network. */
function fakeWorkerScope(network: Record<string, string>) {
  const store = new Map<string, Map<string, string>>();
  const listeners: Record<string, (event: unknown) => void> = {};
  const fetched: string[] = [];
  let skipped = false;
  let claimed = false;
  const respond = (body: string) => ({ ok: true, body });
  const fetchFn = async (req: string | { url: string }) => {
    const url = typeof req === 'string' ? req : req.url;
    const path = new URL(url, 'https://chess9s.com').pathname;
    fetched.push(path);
    if (!(path in network)) throw new TypeError('offline');
    return respond(network[path]!);
  };
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const c = store.get(name)!;
      return {
        addAll: async (reqs: { url: string; cache?: string }[]) => {
          for (const r of reqs) {
            expect(r.cache, r.url).toBe('reload');
            const res = await fetchFn(r);
            c.set(new URL(r.url, 'https://chess9s.com').pathname, res.body);
          }
        },
        match: async (key: string) => (c.has(key) ? respond(c.get(key)!) : undefined),
      };
    },
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
  };
  class FakeRequest {
    url: string;
    cache: string | undefined;
    constructor(url: string, init?: { cache?: string }) {
      this.url = new URL(url, 'https://chess9s.com').href;
      this.cache = init?.cache;
    }
  }
  const self = {
    location: { origin: 'https://chess9s.com' },
    addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
    skipWaiting: async () => void (skipped = true),
    clients: { claim: async () => void (claimed = true) },
  };
  const scope = { self, caches, fetch: fetchFn, Request: FakeRequest, URL, Promise, Set };
  /** Fires an event that may call waitUntil or respondWith, and waits for what it was given. */
  const fire = async (type: string, extra: object = {}) => {
    let waited: Promise<unknown> | undefined;
    let answer: Promise<{ body: string } | undefined> | undefined;
    listeners[type]!({
      ...extra,
      waitUntil: (p: Promise<unknown>) => (waited = p),
      respondWith: (p: Promise<{ body: string } | undefined>) => (answer = p),
    });
    await waited;
    return answer ? ((await answer)?.body ?? 'no answer') : 'not handled';
  };
  return {
    scope,
    store,
    fetched,
    fire,
    state: () => ({ skipped, claimed }),
  };
}

const networkOf = (dir: string, files: string[]) =>
  Object.fromEntries(
    files.map((f) => [f, readFileSync(join(dir, f === '/' ? 'index.html' : f.slice(1)), 'utf8')]),
  );

describe('precache list (D89)', () => {
  it('covers the shell, every file in assets/, the icons, the manifest and the licenses', () => {
    const dir = fakeDist();
    const { files } = writeServiceWorker(dir);
    expect(files).toEqual([
      '/',
      '/apple-touch-icon.png',
      '/assets/bot.worker-ghi.js',
      '/assets/emblem-jkl.svg',
      '/assets/index-abc.js',
      '/assets/index-def.css',
      '/favicon.ico',
      '/icon-192.png',
      '/icon-512.png',
      '/site.webmanifest',
      '/third-party-licenses.txt',
    ]);
  });

  it('leaves out the files that are not part of the app', () => {
    const list = precacheList([
      'index.html',
      'assets/a.js',
      '_headers',
      'robots.txt',
      'sitemap.xml',
      'share.png',
      '.well-known/security.txt',
      'sw.js',
    ]);
    expect(list).toEqual(['/', '/assets/a.js']);
  });

  it('fails the build when the shell or the assets are missing', () => {
    expect(() => precacheList(['assets/a.js'])).toThrow(/index\.html/);
    expect(() => precacheList(['index.html'])).toThrow(/assets/);
  });
});

describe('the built sw.js', () => {
  it('is a plain script with its version and list, written to dist/sw.js', () => {
    const dir = fakeDist();
    const { version } = writeServiceWorker(dir);
    const code = readFileSync(join(dir, 'sw.js'), 'utf8');
    expect(code).not.toMatch(/^\s*(import|export)\s/m);
    expect(code).toContain(JSON.stringify(version));
    expect(code).toContain('"/assets/bot.worker-ghi.js"');
  });

  it('changes its version when any precached file changes, and only then', () => {
    const a = writeServiceWorker(fakeDist('body{}')).version;
    const b = writeServiceWorker(fakeDist('body{}')).version;
    const c = writeServiceWorker(fakeDist('body{color:red}')).version;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('installs the precache, serves it offline, and leaves the rooms to the network', async () => {
    const dir = fakeDist();
    const { files, version } = writeServiceWorker(dir);
    const sw = fakeWorkerScope(networkOf(dir, files));
    runInNewContext(readFileSync(join(dir, 'sw.js'), 'utf8'), sw.scope);

    await sw.fire('install');
    expect([...sw.store.keys()]).toEqual([`chess9s-${version}`]);
    expect([...sw.store.get(`chess9s-${version}`)!.keys()].sort()).toEqual([...files].sort());
    // A new version waits until the page asks it to take over (D90).
    expect(sw.state().skipped).toBe(false);

    // Offline from here: every answer comes from the cache.
    sw.fetched.length = 0;
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const nav = (path: string) => ({
      request: { method: 'GET', url: `https://chess9s.com${path}`, mode: 'navigate' },
    });
    expect(await sw.fire('fetch', nav('/'))).toBe(html);
    expect(await sw.fire('fetch', nav('/rules/standard-3p'))).toBe(html);
    expect(await sw.fire('fetch', nav('/room/K7RX2M'))).toBe(html);
    expect(
      await sw.fire('fetch', {
        request: {
          method: 'GET',
          url: 'https://chess9s.com/assets/bot.worker-ghi.js',
          mode: 'same-origin',
        },
      }),
    ).toBe('onmessage=()=>{}');
    expect(sw.fetched).toEqual([]);
    expect(
      await sw.fire('fetch', {
        request: { method: 'POST', url: 'https://chess9s.com/api/rooms', mode: 'cors' },
      }),
    ).toBe('not handled');
    expect(
      await sw.fire('fetch', {
        request: { method: 'GET', url: 'https://chess9s.com/api/rooms/K7RX2M', mode: 'cors' },
      }),
    ).toBe('not handled');
  });

  it('takes over only when asked, deletes the old version, and claims its pages', async () => {
    const dir = fakeDist();
    const { files, version } = writeServiceWorker(dir);
    const sw = fakeWorkerScope(networkOf(dir, files));
    runInNewContext(readFileSync(join(dir, 'sw.js'), 'utf8'), sw.scope);
    await (await sw.scope.caches.open('chess9s-older')).addAll([]);
    await (await sw.scope.caches.open('someone-else')).addAll([]);
    await sw.fire('install');

    await sw.fire('message', { data: { type: 'other' } });
    expect(sw.state().skipped).toBe(false);
    await sw.fire('message', { data: { type: 'skip-waiting' } });
    expect(sw.state().skipped).toBe(true);

    await sw.fire('activate');
    expect([...sw.store.keys()].sort()).toEqual([`chess9s-${version}`, 'someone-else']);
    expect(sw.state().claimed).toBe(true);
  });
});
