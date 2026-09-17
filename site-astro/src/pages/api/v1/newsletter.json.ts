import newsletter from '../../../../../data/newsletter.json';

export function GET() {
  return new Response(JSON.stringify({
    version: '1.0',
    collection: 'newsletter',
    canonicalUrl: 'https://jevangoldsmith.com/api/v1/newsletter.json',
    items: [{
      id: 'field-notes',
      title: newsletter.name,
      name: newsletter.name,
      tagline: newsletter.headline,
      frequency: newsletter.cadence,
      promise: newsletter.description,
      collection: 'newsletter',
      canonicalUrl: 'https://jevangoldsmith.com/newsletter.html',
      sampleUrl: `https://jevangoldsmith.com${newsletter.sampleUrl}`,
      shareable: true,
      tags: ['projects', 'learning', 'monthly-newsletter'],
      summary: newsletter.description
    }]
  }), { headers: { 'Content-Type': 'application/json' } });
}
