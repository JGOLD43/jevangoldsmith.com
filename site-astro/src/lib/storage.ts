// localStorage helpers that swallow privacy-mode/quota errors.
// Replaces the duplicated try/catch blocks scattered across page scripts.

export function tryRead<T>(key: string, fallback: T): T {
    try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
        return fallback;
    }
}

export function tryReadString(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function tryWrite(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch {
        // privacy mode / quota — ignore.
    }
}
