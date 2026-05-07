// Service Worker for jevangoldsmith.com.
//
// Strategy:
//   - HTML pages: stale-while-revalidate. Serve from cache instantly,
//     refresh in background. Repeat-visit FCP collapses to ~0ms — the
//     browser hands cached HTML to the parser before the network even
//     starts. Combined with prerender (Speculation Rules) on hover this
//     makes navigation feel native-app-instant.
//   - /_astro, /css/chrome.*, /css/per-page, /fonts, /images/generated:
//     cache-first (these files are immutable; URL changes on every
//     deploy via build hash).
//   - /api/v1/people-modal.json, /data/books.generated.json,
//     /data/popular-routes/*: stale-while-revalidate. Update on next
//     navigation rather than blocking on network.
//   - Everything else: network-first.
//
// Cache versioning ties to the chrome CSS hash so deploys roll caches
// forward atomically. The build replaces __CACHE_VERSION__ during the
// post-build pass (scripts/finalize-sw.js).

const CACHE_VERSION = '__CACHE_VERSION__';
const HTML_CACHE = `html-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;

// Top-traffic pages that benefit from being warm in cache before the
// user visits them. Best-effort prefetch — failures are swallowed.
const PRECACHE_HTML = ['/', '/books.html', '/movies.html', '/people.html', '/adventures.html'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(HTML_CACHE);
      await Promise.allSettled(PRECACHE_HTML.map(async (url) => {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (response.ok) await cache.put(url, response);
      }));
    } catch {
      // Precache is opportunistic; never block install.
    }
    // Activate immediately — site is small, SW takes over within a few hundred ms.
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.endsWith(`-${CACHE_VERSION}`))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isImmutableAsset(pathname) {
  return pathname.startsWith('/_astro/')
    || /^\/css\/chrome\.[a-f0-9]+\.css$/.test(pathname)
    || pathname.startsWith('/css/per-page/')
    || pathname.startsWith('/fonts/')
    || pathname.startsWith('/images/generated/')
    || pathname === '/sprite.svg';
}

function isHtml(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function isData(pathname) {
  return pathname.startsWith('/api/v1/')
    || pathname.startsWith('/data/');
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only handle same-origin.
  if (url.origin !== self.location.origin) return;

  if (isHtml(request)) {
    event.respondWith(staleWhileRevalidate(request, HTML_CACHE));
    return;
  }
  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
  if (isData(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }
  // Default: pass through (network-first behavior — let the browser
  // handle caching).
});
