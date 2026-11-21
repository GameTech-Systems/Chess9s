import { describe, expect, it } from 'vitest';
import { CACHE_PREFIX, SHELL, cacheNameOf, routeOf, staleCaches } from './routes.js';

const ORIGIN = 'https://chess9s.com';
const PRECACHED = new Set([
  SHELL,
  '/assets/index-abc.js',
  '/assets/bot.worker-def.js',
  '/favicon.ico',
  '/site.webmanifest',
  '/third-party-licenses.txt',
]);
const get = (path: string, mode = 'cors', method = 'GET', origin = ORIGIN) =>
  routeOf({ method, url: `${origin}${path}`, mode }, ORIGIN, PRECACHED);

describe('service worker routes (decision 0025)', () => {
  it('answers page navigations with the cached app shell', () => {
    for (const path of ['/', '/privacy', '/how-to-play', '/rules/standard-2p', '/build', '/x/y/'])
      expect(get(path, 'navigate'), path).toBe('shell');
    expect(get('/?from=share#abc', 'navigate')).toBe('shell');
    // A room page opens from the cache too; the room itself needs the network.
    expect(get('/room/K7RX2M', 'navigate')).toBe('shell');
  });

  it('answers precached files from the cache first, navigation or not', () => {
    expect(get('/assets/index-abc.js')).toBe('cached');
    expect(get('/assets/bot.worker-def.js', 'same-origin')).toBe('cached');
    expect(get('/favicon.ico', 'no-cors')).toBe('cached');
    expect(get('/third-party-licenses.txt', 'navigate')).toBe('cached');
  });

  it('never handles the rooms, other sites, other methods or the worker itself', () => {
    expect(get('/api/rooms', 'cors', 'POST')).toBe('pass');
    expect(get('/api/rooms/K7RX2M')).toBe('pass');
    expect(get('/api/rooms/K7RX2M/socket', 'navigate')).toBe('pass');
    expect(get('/api', 'navigate')).toBe('pass');
    expect(get('/sw.js')).toBe('pass');
    expect(get('/assets/index-abc.js', 'cors', 'GET', 'https://example.com')).toBe('pass');
    expect(get('/', 'navigate', 'GET', 'https://example.com')).toBe('pass');
    expect(get('/', 'navigate', 'HEAD')).toBe('pass');
  });

  it('leaves files that are not in the precache to the network', () => {
    expect(get('/robots.txt', 'navigate')).toBe('pass');
    expect(get('/.well-known/security.txt', 'navigate')).toBe('pass');
    expect(get('/share.png')).toBe('pass');
    // A hashed file of another version (an older tab after an update) is fetched as usual.
    expect(get('/assets/index-zzz.js')).toBe('pass');
  });

  it('names caches by version and finds the stale ones', () => {
    expect(cacheNameOf('v1')).toBe(`${CACHE_PREFIX}v1`);
    expect(
      staleCaches(['chess9s-v0', 'chess9s-v1', 'other-app', 'chess9s-old'], 'chess9s-v1'),
    ).toEqual(['chess9s-v0', 'chess9s-old']);
  });
});
