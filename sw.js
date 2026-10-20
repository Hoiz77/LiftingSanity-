/* Lifting Sanity offline helper: keeps the app on the device so it opens at the gym without signal.
   Your workouts live in the app's own storage, not in this cache. */
const CACHE = 'liftingsanity-v6';
// exercise illustrations live in their own cache so app updates don't throw them away
const ART = 'liftingsanity-art';
const SHELL = ['./', 'index.html', 'app.js', 'exercises.js', 'library-extra.js', 'visuals.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== ART).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const keep = res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (url.origin === self.location.origin) {
    // the app itself: fresh when online, saved copy when offline
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
  } else if (url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/RepDB/')) {
    // illustrations never change at a pinned version: saved copy first
    e.respondWith(caches.open(ART).then(c => c.match(req).then(m => m || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    }))));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // fonts rarely change: saved copy first
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(keep)));
  }
});
