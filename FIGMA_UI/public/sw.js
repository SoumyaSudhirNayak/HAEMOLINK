const CACHE_NAME = 'haemolink-cache-v1';
const TILE_HOST = 'tile.openstreetmap.org';
const OSRM_HOST = 'router.project-osrm.org';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const msg = event && event.data ? event.data : null;
  if (!msg || msg.type !== 'haemolink:notify') return;
  const title = typeof msg.title === 'string' ? msg.title : '';
  const options = msg.options && typeof msg.options === 'object' ? msg.options : {};
  if (!title) return;
  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, options);
      } catch {}
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const data = event && event.notification ? event.notification.data : null;
  try {
    if (event.notification) event.notification.close();
  } catch {}

  event.waitUntil(
    (async () => {
      const msg = data && typeof data === 'object' ? data : null;
      const type = msg && msg.type === 'haemolink:navigate' ? 'haemolink:navigate' : null;
      const role = msg && typeof msg.role === 'string' ? msg.role : null;
      const view = msg && (typeof msg.view === 'string' || msg.view === null) ? msg.view : null;
      const payload = type ? { type, role, view } : null;

      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of list) {
        try {
          if (client && 'focus' in client) await client.focus();
        } catch {}
        try {
          if (payload) client.postMessage(payload);
        } catch {}
        return;
      }

      const opened = await self.clients.openWindow('/');
      if (opened) {
        try {
          if (payload) opened.postMessage(payload);
        } catch {}
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    if (url.host.includes(TILE_HOST)) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const resp = await fetch(event.request);
          cache.put(event.request, resp.clone());
          return resp;
        })
      );
      return;
    }
    if (url.host.includes(OSRM_HOST)) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          try {
            const resp = await fetch(event.request);
            cache.put(event.request, resp.clone());
            return resp;
          } catch (e) {
            const cached = await cache.match(event.request);
            if (cached) return cached;
            throw e;
          }
        })
      );
      return;
    }
  } catch {}
});
