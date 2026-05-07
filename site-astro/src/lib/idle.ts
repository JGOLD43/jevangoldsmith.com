// Single shared requestIdleCallback shim. Falls back to setTimeout when
// requestIdleCallback is missing (Safari, iOS).

type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void;
};

export function scheduleIdleTask(callback: () => void, timeout = 2500): void {
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(callback, { timeout });
        return;
    }
    setTimeout(callback, Math.min(timeout, 1500));
}
