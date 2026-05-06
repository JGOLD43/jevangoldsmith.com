import { escapeAttr } from '../lib/html-escape';

// Shared sanitization utilities for XSS prevention.
// DOMPurify split out into a separate `sanitize-html.js`
// module so non-essays pages don't ship the ~22KB DOMPurify payload.

function sanitizeUrl(url: unknown, fallback = '#'): string {
    const raw = String(url || '').trim();
    if (!raw) return fallback;

    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
        return escapeAttr(raw);
    }

    try {
        const parsed = new URL(raw, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
            return escapeAttr(raw);
        }
    } catch {
        return fallback;
    }

    return fallback;
}

if (typeof window !== 'undefined') {
    window.sanitizeUrl = sanitizeUrl;
}

export {};
