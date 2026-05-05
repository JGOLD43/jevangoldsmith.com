// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
// Shared sanitization utilities for XSS prevention.
// Phase 1 slice 1.1: DOMPurify split out into a separate `sanitize-html.js`
// module so non-essays pages don't ship the ~22KB DOMPurify payload.

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function sanitizeUrl(url, fallback = '#') {
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
    window.escapeHTML = escapeHTML;
    window.escapeAttr = escapeAttr;
    window.sanitizeUrl = sanitizeUrl;
}

export {};
