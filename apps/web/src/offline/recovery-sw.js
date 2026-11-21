// The recovery service worker (decision 0025, item 8). Kept ready, never deployed as it is.
// If a released sw.js misbehaves, ship this file as the service worker instead: in
// apps/web/vite.config.ts, make the offline plugin copy this file to dist/sw.js in place of
// writeServiceWorker, and in the same release remove the registration from main.tsx (otherwise
// each reload installs this worker again and it reloads the page again, without end). Since sw.js
// is served with `Cache-Control: no-cache`, every browser fetches it on its next visit.
// It takes over at once, deletes every Chess Nines cache, unregisters itself and reloads the open
// pages, which then load from the network with no worker.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name.startsWith('chess9s-')).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((pages) => Promise.all(pages.map((page) => page.navigate(page.url)))),
  );
});
