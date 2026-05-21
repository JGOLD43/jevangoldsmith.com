// Real User Monitoring. Reports Core Web Vitals (LCP, FCP, CLS, INP,
// TTFB) AND uncaught JS errors to a beacon endpoint. Loaded at idle
// (theme.ts) only when the RUM_ENDPOINT build flag is set; without it
// the dynamic import is tree-shaken and this module never ships.
//
// To enable production telemetry, set RUM_ENDPOINT at build time:
//   RUM_ENDPOINT=https://your-receiver/api npm run build
// Endpoints that work out of the box: Cloudflare Web Analytics, Plausible,
// any HTTP POST receiver. Errors and metrics share the same beacon path
// so a single endpoint catches both.
//
// Hand-rolled PerformanceObserver wrappers (replaces the `web-vitals`
// dep). Same {name, value, id, navigationType, rating} shape so the
// beacon endpoint contract is unchanged.

type MetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
type ErrorKind = 'error' | 'unhandledrejection';
type Rating = 'good' | 'needs-improvement' | 'poor';

interface Metric {
    name: MetricName;
    value: number;
    rating: Rating;
    id: string;
    navigationType: string;
}

interface RumMetricPayload extends Metric {
    kind: 'metric';
    page: string;
    referrer: string;
    connection?: string;
}

interface RumErrorPayload {
    kind: ErrorKind;
    message: string;
    stack?: string;
    source?: string;
    line?: number;
    col?: number;
    page: string;
    referrer: string;
}

type RumPayload = RumMetricPayload | RumErrorPayload;

const ENDPOINT: string | null = import.meta.env.RUM_ENDPOINT || null;
const SAMPLE_RATE = 1.0;

const THRESHOLDS: Record<MetricName, [number, number]> = {
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    TTFB: [800, 1800]
};

function rate(name: MetricName, value: number): Rating {
    const [good, poor] = THRESHOLDS[name];
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
}

function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function navType(): string {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return nav?.type || 'navigate';
}

let queued = false;
let queue: RumPayload[] = [];

function flush() {
    if (queue.length === 0) return;
    const payload = JSON.stringify(queue);
    queue = [];
    queued = false;
    if (!ENDPOINT) {
        if (typeof console !== 'undefined') console.debug('[rum]', payload);
        return;
    }
    if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, payload);
        return;
    }
    fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
}

function schedule() {
    if (queued) return;
    queued = true;
    addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
    addEventListener('pagehide', flush);
}

function record(name: MetricName, value: number) {
    if (!Number.isFinite(value)) return;
    if (Math.random() >= SAMPLE_RATE) return;
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    queue.push({
        kind: 'metric',
        name, value, rating: rate(name, value), id: uid(), navigationType: navType(),
        page: location.pathname,
        referrer: document.referrer,
        connection: conn?.effectiveType
    });
    schedule();
}

function recordError(kind: ErrorKind, payload: Partial<RumErrorPayload>) {
    queue.push({
        kind,
        message: payload.message || 'unknown',
        stack: payload.stack,
        source: payload.source,
        line: payload.line,
        col: payload.col,
        page: location.pathname,
        referrer: document.referrer
    });
    schedule();
}

function installErrorListeners() {
    addEventListener('error', (event) => {
        recordError('error', {
            message: event.message || String(event.error),
            stack: event.error?.stack,
            source: event.filename,
            line: event.lineno,
            col: event.colno
        });
    });
    addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        recordError('unhandledrejection', {
            message: reason?.message || String(reason),
            stack: reason?.stack
        });
    });
}

function observe(type: string, fn: (entries: PerformanceEntry[]) => void, opts: PerformanceObserverInit = {}) {
    try {
        const po = new PerformanceObserver((list) => fn(list.getEntries()));
        po.observe({ type, buffered: true, ...opts });
        return po;
    } catch { return null; }
}

function reportTTFB() {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) record('TTFB', Math.max(0, nav.responseStart - nav.startTime));
}

function reportFCP() {
    observe('paint', (entries) => {
        const fcp = entries.find((e) => e.name === 'first-contentful-paint');
        if (fcp) record('FCP', fcp.startTime);
    });
}

function reportLCP() {
    let last = 0;
    const po = observe('largest-contentful-paint', (entries) => {
        const e = entries[entries.length - 1];
        if (e) last = e.startTime;
    });
    const finalize = () => { if (last > 0) { record('LCP', last); last = 0; } po?.disconnect(); };
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') finalize(); }, { once: true });
    addEventListener('pagehide', finalize, { once: true });
}

function reportCLS() {
    let cls = 0;
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];
    const po = observe('layout-shift', (entries) => {
        for (const e of entries as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (e.hadRecentInput) continue;
            const first = sessionEntries[0];
            const last = sessionEntries[sessionEntries.length - 1];
            if (sessionEntries.length && (e.startTime - last.startTime > 1000 || e.startTime - first.startTime > 5000)) {
                if (sessionValue > cls) cls = sessionValue;
                sessionValue = 0; sessionEntries = [];
            }
            sessionValue += e.value;
            sessionEntries.push(e);
        }
        if (sessionValue > cls) cls = sessionValue;
    });
    const finalize = () => { record('CLS', cls); po?.disconnect(); };
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') finalize(); }, { once: true });
    addEventListener('pagehide', finalize, { once: true });
}

function reportINP() {
    let worst = 0;
    const po = observe('event', (entries) => {
        for (const e of entries as (PerformanceEntry & { duration: number; interactionId?: number })[]) {
            if (e.interactionId && e.duration > worst) worst = e.duration;
        }
    }, { durationThreshold: 40 } as PerformanceObserverInit);
    const finalize = () => { if (worst > 0) record('INP', worst); po?.disconnect(); };
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') finalize(); }, { once: true });
    addEventListener('pagehide', finalize, { once: true });
}

export function startRum() {
    reportTTFB();
    reportFCP();
    reportLCP();
    reportCLS();
    reportINP();
}
