// Shared book cover URL resolver used by Astro components and runtime state.

import type { Book } from '../content.config';
import remoteAssets from '../../../data/remote-assets.generated.json';

// Card renderers accept a Partial<Book> shape — all fields optional so legacy
// records with missing fields still render gracefully.
type BookData = Partial<Book>;

type RemoteEntry = { formats: Record<string, { avif?: string; jpg?: string }> };
const REMOTE = remoteAssets as Record<string, RemoteEntry>;

// Localize an OpenLibrary cover URL to the locally-generated jpg
// (build-time download from optimize-assets.js → images/generated/remote/).
// Fall back to the remote URL when the manifest doesn't have it (first
// build before optimize-assets has run, or a non-OpenLibrary cover).
//
// Card covers display ~150px wide so 360 (2x DPR) is ideal; carousel
// thumbs display ~64px so 240 paints faster without visible quality
// loss. Caller picks via `size`. Phase 12 consolidated the duplicate
// localizer that lived in books.astro into this single source of truth.
const COVER_WIDTHS = { medium: ['240', '360', '480'], large: ['360', '480', '240'] } as const;
function localize(url: string, size: 'medium' | 'large' = 'large'): string {
  if (!url) return '';
  const lookupKey = url.replace(/-M\.jpg(\?.*)?$/, '-L.jpg');
  const entry = REMOTE[lookupKey] || REMOTE[url];
  if (!entry) return url;
  for (const width of COVER_WIDTHS[size]) {
    const jpg = entry.formats[width]?.jpg;
    if (jpg) return `/${jpg}`;
  }
  return url;
}

export function bookCoverUrl(book: BookData, size: 'medium' | 'large' = 'large'): string {
  if (book.coverImage) return localize(book.coverImage, size);
  const cleanIsbn = String(book.isbn ?? '').replace(/[^0-9X]/g, '');
  if (!cleanIsbn) return '';
  return localize(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`, size);
}
