// Centralized HTML escape helpers. Consolidates the six near-identical
// implementations that previously lived inline in chrome.ts, seo.ts,
// collection-chrome.ts, book-card.ts, podcast-card.ts, and
// free-resources-render.ts.

// Escape for HTML text content: & < > only (text nodes can't contain raw
// markup, so quotes don't need escaping).
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape for HTML attribute values: also escapes quotes + apostrophes so
// the attribute parser can't be tricked into closing early.
export function escapeAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
