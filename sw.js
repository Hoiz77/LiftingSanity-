/* Lifting Sanity offline helper: keeps the app on the device so it opens at the gym without signal.
   Your workouts live in the app's own storage, not in this cache. */
const CACHE = 'liftingsanity-v37';
// exercise illustrations and fonts live in their own caches so app updates don't throw them away
const ART = 'liftingsanity-art';
const FONTS = 'liftingsanity-fonts';
const SHELL = ['./', 'index.html', 'i18n.js', 'ar.js', 'ar-names.js', 'app.js', 'exercises.js', 'library-extra.js', 'visuals.js', 'science.js', 'y2k.css', 'steps.json', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  // straight from the server, not the browser's own cache: a new version must never be saved with old files mixed in
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== ART && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.includes('/art/')) {
    // the app's own drawings: kept with the other illustrations, so an update doesn't throw them away
    e.respondWith(caches.open(ART).then(c => c.match(req).then(m => m || fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }))));
  } else if (url.origin === self.location.origin) {
    // the app itself: the saved copy opens at once (no waiting on gym signal), and a fresh copy is saved behind it for next time
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      // offline and never saved: pages fall back to the app, anything else just fails (a picture shows its stand-in)
      return net.catch(() => req.mode === 'navigate' ? c.match('index.html') : Response.error());
    }));
  } else if (url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/RepDB/')) {
    // illustrations never change at a pinned version: saved copy first. Fetched so the answer can be checked
    // (the host allows it), and only a real picture is kept: a Wi-Fi login page or an error never gets stuck in the cache
    e.respondWith(caches.open(ART).then(async c => {
      const fresh = () => fetch(req.url, { mode: 'cors', credentials: 'omit' }).then(res => {
        if (res && res.ok && /^image\//.test(res.headers.get('content-type') || '')) c.put(req, res.clone());
        return res;
      });
      const m = await c.match(req);
      // copies saved by older versions couldn't be checked: keep showing them, and swap in a checked one when there's signal
      if (m && m.type === 'opaque') { e.waitUntil(fresh().catch(() => {})); return m; }
      return m || fresh().catch(() => fetch(req));
    }));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // fonts rarely change: saved copy first. The stylesheets are requested with CORS, so a failed answer is never kept
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(m => m || fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }))));
  }
});
