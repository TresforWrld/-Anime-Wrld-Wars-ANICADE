const CACHE_NAME = 'anicade-v2';
const STATIC_ASSETS = [
  './app.html',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap'
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Always go network for API calls
  if(url.includes('graphql.anilist.co') || url.includes('api.mangadex') || url.includes('api.comick') || url.includes('api.jikan')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})));
    return;
  }
  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        if(response && response.status === 200 && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', {status: 503}));
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {title:'ANICADE', body:'New anime update!'};
  e.waitUntil(
    self.registration.showNotification(data.title || 'ANICADE', {
      body: data.body || 'Check out the latest anime news',
      icon: 'https://i.imgur.com/qgZhkhV.jpeg',
      badge: 'https://i.imgur.com/qgZhkhV.jpeg',
      vibrate: [100, 50, 100],
      data: { url: data.url || './app.html' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || './app.html'));
});
