// Register the service worker. Done at idle time so registration
// doesn't compete with first-paint resources. Subsequent visits hit
// the SW immediately and get instant HTML from cache.
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
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.warn('SW registration failed', error);
    });
}
