// Pure CLS session-windowing algorithm. Extracted from rum.ts so unit
// tests can drive it without importing the full RUM module (which
// references import.meta.env at top level). Spec:
//   - hadRecentInput: true entries are ignored
//   - session ends if gap to previous entry >1000ms, OR length >5000ms
//   - session value = sum of entry values
//   - reported CLS = max session value across all sessions
//
// Mirrors web-vitals' CLS attribution; lock-tested in
// tests/unit/cls-windowing.test.js.

export interface CLSEntry {
    startTime: number;
    value: number;
    hadRecentInput: boolean;
}

export function computeCLS(entries: CLSEntry[]): number {
    let cls = 0;
    let sessionValue = 0;
    let sessionEntries: CLSEntry[] = [];
    for (const e of entries) {
        if (e.hadRecentInput) continue;
        const first = sessionEntries[0];
        const last = sessionEntries[sessionEntries.length - 1];
        if (sessionEntries.length && (e.startTime - last.startTime > 1000 || e.startTime - first.startTime > 5000)) {
            if (sessionValue > cls) cls = sessionValue;
            sessionValue = 0;
            sessionEntries = [];
        }
        sessionValue += e.value;
        sessionEntries.push(e);
    }
    if (sessionValue > cls) cls = sessionValue;
    return cls;
}
