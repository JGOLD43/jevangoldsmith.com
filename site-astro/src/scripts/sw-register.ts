// Register the service worker at idle time so it doesn't compete with
// first-paint resources. Bypass the HTTP cache when checking for a new
// worker: a release must not keep an old navigation strategy alive.
export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const isLocalPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocalPreview) {
        navigator.serviceWorker.getRegistrations?.().then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
        }).catch(() => {});
        return;
    }
    if (location.protocol !== 'https:') return;
    navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
    }).catch((error) => {
        console.warn('SW registration failed', error);
    });
}
