// Shared slug helper. Keep in sync between card renderers and
// detail-page getStaticPaths so generated hrefs match emitted routes.
export function slugify(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
