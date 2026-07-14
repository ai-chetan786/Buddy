// ============================================================
// BUDDY AI — Service Worker (PWA)
// Caches the app shell so it loads instantly even on slow
// connections. API calls (Supabase, AI chat, orders) always
// go to the network — only the static UI is cached.
// ============================================================

const CACHE_NAME = 'buddy-ai-v1';

// Files to cache immediately on install — the app "shell"
const SHELL_URLS = [
  '/',
  '/feed',
  '/login',
  '/register',
  '/manifest.json',
];

// ── INSTALL: cache the shell ────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_URLS).catch(() => {
        // If any shell URL fails, don't block install
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clear old caches ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: network-first for API, cache-first for static ────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for:
  // - Supabase API calls
  // - Buddy AI API (chat, order, payment)
  // - External resources (Google, Razorpay)
  const alwaysNetwork = [
    'supabase.co',
    '/api/chat',
    '/api/order',
    '/api/payment',
    '/api/enhance',
    'razorpay.com',
    'groq.com',
    'openrouter.ai',
    'huggingface.co',
    'googleapis.com',
  ];

  if (alwaysNetwork.some(n => url.href.includes(n))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Ultimate fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// ── PUSH NOTIFICATIONS (future) ────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Buddy AI', {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: data.url || '/feed' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/feed')
  );
});
