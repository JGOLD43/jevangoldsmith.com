// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
// Phase 1 slice 1.1: DOMPurify-backed HTML sanitizer split out from
// sanitize.js so it only ships to pages that actually render
// rich-text content (essays + adventure detail). Non-essays
// collection pages save ~22KB of unused JS.

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
    'img', 'figure', 'figcaption', 'div', 'span', 'hr', 'table', 'thead',
    'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'mark'
];

const ALLOWED_ATTR = [
    'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
    'width', 'height', 'loading', 'decoding'
];

export function sanitizeHTML(html) {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
        ADD_ATTR: ['target']
    });
}

if (typeof window !== 'undefined') {
    // essays.js bare-references sanitizeHTML; expose on window so the
    // module-local destructured const inside essays.js resolves.
    window.sanitizeHTML = sanitizeHTML;
}
