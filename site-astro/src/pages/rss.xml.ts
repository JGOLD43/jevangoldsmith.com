import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

// RSS 2.0 feed for the essays collection. Mirrors what the legacy site is
// missing — there's no equivalent feed in dist/. New surface introduced by
// the Astro migration so subscribers can pull updates via reader apps.
export async function GET(context: APIContext) {
  const essays = (await getCollection('essays', ({ data }: any) => data.status !== 'draft')).sort((a: any, b: any) =>
    String(b.data.date ?? '').localeCompare(String(a.data.date ?? ''))
  );

  return rss({
    title: 'Jevan Goldsmith — Essays',
    description: 'Essays on philosophy, management, technology, and modern life.',
    site: context.site ?? 'https://jevangoldsmith.com',
    items: essays.map((entry: any) => ({
      title: entry.data.title,
      description: entry.data.subtitle ?? '',
      link: `/essays.html#${entry.id}`,
      pubDate: entry.data.date ? new Date(entry.data.date) : undefined,
      content: entry.data.content
    })),
    customData: '<language>en-us</language>'
  });
}
