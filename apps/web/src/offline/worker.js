// The service worker's events (decision 0025). build-sw.mjs puts this after VERSION, PRECACHE
// and the functions of routes.js to make dist/sw.js, a plain script.
/* global VERSION, PRECACHE, SHELL, cacheNameOf, staleCaches, routeOf */

const CACHE = cacheNameOf(VERSION);
const PRECACHED = new Set(PRECACHE);

// Install: fetch the whole app past the HTTP cache. If one file fails, this version is not
// installed and the browser tries again on a later visit.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE.map((path) => new Request(path, { cache: 'reload' }))),
      ),
  );
});

// A new version waits (D90) until the page, with no game in progress, asks it to take over.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();
});

// Taking over: delete the older versions' caches, and serve every open page of the app.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(staleCaches(names, CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const route = routeOf(event.request, self.location.origin, PRECACHED);
  if (route === 'pass') return;
  const key = route === 'shell' ? SHELL : new URL(event.request.url).pathname;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(key))
      .then((hit) => hit || fetch(event.request)),
  );
});
