// Phase E — repeat-visit service worker.
//
// Strategy is keyed off URL shape so we never have to version the SW itself
// when content changes:
//
//   * HTML pages: network-first with a short timeout. The user always sees
//     the freshest copy when online; offline / flaky network falls back to
//     the last good cached copy.
//   * Hashed static assets (CSS/JS with /\.[a-f0-9]{8,}\./): cache-first
//     and immutable — the file name itself is the version, so a new build
//     means a new URL and the old cache entry just sits unused.
//   * Images: cache-first with no expiration (rarely change; 1yr cache is
//     fine).
//   * Fonts (woff2): cache-first.
//
// Everything else: pass through to the network.

const CACHE_HTML = 'jg-html-v1';
const CACHE_ASSETS = 'jg-assets-v1';
const CACHE_IMG = 'jg-img-v1';
const HTML_NETWORK_TIMEOUT_MS = 2500;

function isHtmlRequest(req) {
  if (req.mode === 'navigate') return true;
  const url = new URL(req.url);
  return url.pathname.endsWith('.html') || url.pathname === '/';
}

function isHashedAsset(url) {
  return /\/.+\.[a-f0-9]{8,}\.(?:js|mjs|css)(?:$|\?)/.test(url.pathname);
}

function isImage(req) {
  if (req.destination === 'image') return true;
  const url = new URL(req.url);
  return /\.(?:avif|webp|jpe?g|png|gif|svg|ico)$/i.test(url.pathname);
}

function isFont(req) {
  if (req.destination === 'font') return true;
  const url = new URL(req.url);
  return /\.(?:woff2?|ttf|otf|eot)$/i.test(url.pathname);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function networkFirst(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  let networkResolved = false;
  const networkPromise = fetch(req).then((res) => {
    networkResolved = true;
    if (res && res.ok && req.method === 'GET') {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  });
  const timeoutPromise = new Promise((resolve) => setTimeout(() => {
    if (!networkResolved) resolve(null);
  }, timeoutMs));
  try {
    const winner = await Promise.race([networkPromise, timeoutPromise]);
    if (winner) return winner;
    const cached = await cache.match(req);
    if (cached) return cached;
    return networkPromise;
  } catch (_) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw _;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok && req.method === 'GET') {
    cache.put(req, res.clone()).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isHtmlRequest(req)) {
    event.respondWith(networkFirst(req, CACHE_HTML, HTML_NETWORK_TIMEOUT_MS));
    return;
  }
  if (isHashedAsset(url) || isFont(req)) {
    event.respondWith(cacheFirst(req, CACHE_ASSETS));
    return;
  }
  if (isImage(req)) {
    event.respondWith(cacheFirst(req, CACHE_IMG));
    return;
  }
});
