// Real User Monitoring. Reports Core Web Vitals (LCP, FCP, CLS, INP,
// TTFB) to a beacon endpoint. Loaded at idle so the measurement doesn't
// compete with first-paint resources.
//
// Beacon endpoint defaults to `/api/rum-beacon` — configure a Cloud
// Function or Cloudflare Worker to receive these. If no endpoint is
// configured at runtime, the values still log to console in dev for
// inspection but no network request goes out.
//
// Tradeoff: 1KB extra JS for visibility into actual user-experienced
// perf. Without it, optimization is blind.

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface RumPayload extends Pick<Metric, 'name' | 'value' | 'rating' | 'id' | 'navigationType'> {
    page: string;
    referrer: string;
    connection?: string;
}

const ENDPOINT: string | null = null; // set this when a beacon receiver is online
const SAMPLE_RATE = 1.0; // 100% — drop later if beacon volume is a concern

function shouldSample() {
    return Math.random() < SAMPLE_RATE;
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
    // Flush on visibility change (the moment Web Vitals is most likely
    // to fire its final values) and as a fallback on pagehide.
    addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
    addEventListener('pagehide', flush);
}

function record(metric: Metric) {
    if (!shouldSample()) return;
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    queue.push({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        page: location.pathname,
        referrer: document.referrer,
        connection: conn?.effectiveType
    });
    schedule();
}

export function startRum() {
    onCLS(record);
    onFCP(record);
    onINP(record);
    onLCP(record);
    onTTFB(record);
}
