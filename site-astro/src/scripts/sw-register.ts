// Register the service worker. Done at idle time so registration
// doesn't compete with first-paint resources. Subsequent visits hit
// the SW immediately and get instant HTML from cache.
export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.warn('SW registration failed', error);
    });
}
