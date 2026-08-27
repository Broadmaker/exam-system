const CACHE = 'exam-portal-v5';
const SHELL = ['/', '/index.html', '/splash-screen-logo.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls — exam data must stay fresh.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first with background update.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ── Web Push (Real Push) ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      // Try JSON first, fallback to text
      try { data = event.data.json(); } catch { data = { body: event.data.text() }; }
    }
  } catch {}
  // If push was a tickle (empty), fetch latest notification title via API is not possible without student_id,
  // so show generic. When payload is present (future), use it.
  const title = data.title || 'WMSU Exam System';
  const body = data.body || data.message || 'You have a new notification — open the app to view it.';
  const url = data.url || '/notifications';
  const options = {
    body,
    icon: '/splash-screen-logo.png',
    badge: '/splash-screen-logo.png',
    data: { url },
    tag: data.tag || 'wmsu-notif',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});