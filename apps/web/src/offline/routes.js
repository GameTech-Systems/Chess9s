// How the service worker answers a request (decision 0025). Plain functions with no imports:
// build-sw.mjs copies this file into dist/sw.js (without the `export` words), and the tests import
// it as it is.

/** Every cache this app makes starts with this; the recovery worker deletes each one that does. */
export const CACHE_PREFIX = 'chess9s-';

/** The app shell: the cache key of index.html, which every page of the app is drawn from. */
export const SHELL = '/';

/** The cache of one version of the app. */
export function cacheNameOf(version) {
  return CACHE_PREFIX + version;
}

/** This app's caches other than the current one: deleted when a new version takes over. */
export function staleCaches(names, current) {
  return names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== current);
}

/**
 * How to answer `request` ({ method, url, mode }) at `origin`, given the precached paths:
 * - 'shell': a page of the app (a navigation to a path with no file extension): the cached
 *   index.html of this version, the network only if the cache has lost it. The page and its worker
 *   stay on one version, so an update never changes the files under a game (D90).
 * - 'cached': a precached file: from the cache, the network only if the cache has lost it.
 * - 'pass': not handled; the browser fetches it as if there were no worker. That is the rooms
 *   (/api/*, their sockets), other sites, anything but GET, sw.js itself, and files that are not
 *   part of the app (robots.txt, security.txt, a hashed file of another version).
 */
export function routeOf(request, origin, precached) {
  if (request.method !== 'GET') return 'pass';
  const url = new URL(request.url);
  if (url.origin !== origin) return 'pass';
  const path = url.pathname;
  if (path === '/api' || path.startsWith('/api/') || path === '/sw.js') return 'pass';
  if (path !== SHELL && precached.has(path)) return 'cached';
  const last = path.slice(path.lastIndexOf('/') + 1);
  if (request.mode === 'navigate' && !/\.[A-Za-z0-9]+$/.test(last)) return 'shell';
  return 'pass';
}
