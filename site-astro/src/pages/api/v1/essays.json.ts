import { publishedEssays, essayUrl, essayDescription } from '../../../lib/essays';
export function GET() {
  return new Response(JSON.stringify({ version: '1.0', collection: 'essays', canonicalUrl: 'https://jevangoldsmith.com/api/v1/essays.json', updatedAt: publishedEssays.map((essay) => essay.updatedAt || essay.date).sort().at(-1) || null, items: publishedEssays.map((essay) => ({ ...essay, collection: 'essays', canonicalUrl: `https://jevangoldsmith.com${essayUrl(essay.id)}`, shareable: true, tags: [essay.category].filter(Boolean), summary: essayDescription(essay) })) }), { headers: { 'Content-Type': 'application/json' } });
}
