export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    wait = 120
): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null;
    return function (this: unknown, ...args: Parameters<T>) {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn.apply(this, args), wait);
    };
}
