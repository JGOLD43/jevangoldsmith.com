import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedEssays, essayUrl, essayDescription } from '../lib/essays';
export function GET(context: APIContext) {
  return rss({ title: 'Jevan Goldsmith — Essays', description: 'Essays on attention, work and life.', site: context.site ?? 'https://jevangoldsmith.com', items: publishedEssays.map((essay) => ({ title: essay.title, description: essayDescription(essay), link: essayUrl(essay.id), pubDate: new Date(essay.date), content: essay.content })), customData: '<language>en-au</language>' });
}
