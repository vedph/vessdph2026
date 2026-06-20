/* Venice Summer School 2026 — service worker (multi-page)
   Caches the app shell so the pages work offline. Leaflet is vendored locally and cached
   with the other static assets; only the map tiles are external. Maps load only on user
   request, so no tile request is made before the visitor opens a map. */

const CACHE = 'vsdph-2026-v51';

const CORE = [
  'index.html', 'programme.html', 'people.html', 'partners.html', 'colophon.html', 'session.html', 'contribute.html',
  'journal.html', 'contribute-journal.html',
  'assets/style.css', 'assets/app.js', 'assets/editor.js', 'assets/journal.js', 'assets/journal-contribute.js',
  'data/program.js', 'data/journal.js',
  'assets/leaflet/leaflet.css', 'assets/leaflet/leaflet.js',
  'assets/cover.jpg',
  'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png',
  'assets/logos/ca-foscari-mark.png', 'assets/logos/ca-foscari-humanities.png',
  'assets/logos/ca-foscari-dslcc.png', 'assets/logos/cisph.png',
  'assets/logos/archivio-di-stato.png', 'assets/logos/ilc-cnr.png',
  'assets/logos/eutopia.png', 'assets/logos/aiucd.png',
  'assets/logos/diptext-kc-clarin.png', 'assets/logos/museyoum.png',
  'assets/logos/digitalia.png', 'assets/logos/biennale.png',
  'assets/logos/site-lockup.png',
  'assets/avatars/berti.jpg', 'assets/avatars/boschetti.jpg', 'assets/avatars/buzzoni.jpg',
  'assets/avatars/calaon.jpg', 'assets/avatars/carbe_.jpg', 'assets/avatars/corro_.jpg',
  'assets/avatars/dall_aglio.jpg', 'assets/avatars/de_bastiani.jpg', 'assets/avatars/de_vincentis.jpg',
  'assets/avatars/dolcetti.jpg', 'assets/avatars/dziekan.jpg', 'assets/avatars/fernandez-castrillo.jpg',
  'assets/avatars/fusi.jpg', 'assets/avatars/giglio.jpg', 'assets/avatars/macchiarelli.jpg',
  'assets/avatars/madden.jpg', 'assets/avatars/mancinelli.jpg', 'assets/avatars/monella.jpg',
  'assets/avatars/nevola.jpg', 'assets/avatars/parry.jpg', 'assets/avatars/peratello.jpg',
  'assets/avatars/robinson.jpg', 'assets/avatars/russo.jpg', 'assets/avatars/solenne.jpg',
  'assets/avatars/tomasi.jpg',
  'assets/fonts/eb-garamond-latin-400-normal.woff2',
  'assets/fonts/eb-garamond-latin-400-italic.woff2',
  'assets/fonts/eb-garamond-latin-600-normal.woff2',
  'assets/fonts/eb-garamond-latin-600-italic.woff2',
  'assets/fonts/ibm-plex-mono-latin-400-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-500-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // map tiles / CDN → network

  // Page loads: network first, then the cached page, then the home shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }

  // Dynamic data — programme, journal and per-session content: network first, so edits
  // and newly added entries/content appear promptly and a 404 is never cached.
  if (url.pathname.endsWith('/data/program.js') || url.pathname.endsWith('/data/journal.js') || url.pathname.includes('/content/')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Stable static assets: cache first; only successful responses are cached.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => hit)
    )
  );
});
