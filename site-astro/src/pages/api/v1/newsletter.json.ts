import newsletter from '../../../../../data/newsletter.json';

export function GET() {
  return new Response(JSON.stringify({
    version: '1.0',
    updatedAt: '2026-09-17',
    collection: 'newsletter',
    canonicalUrl: 'https://jevangoldsmith.com/api/v1/newsletter.json',
    items: [{
      id: 'field-notes',
      title: newsletter.name,
      name: newsletter.name,
      tagline: newsletter.headline,
      frequency: newsletter.cadence,
      promise: newsletter.description,
      formAction: newsletter.delivery.action,
      ajaxEndpoint: newsletter.delivery.endpoint,
      topics: ['projects', 'business', 'books', 'tools', 'personal systems'],
      examples: [
        { title: 'Something I’m building', description: 'Progress, decisions and the next step.' },
        { title: 'A lesson worth sharing', description: 'An experiment or idea that changed how I think.' },
        { title: 'Something you can use', description: 'A useful book, tool or practical template.' }
      ],
      collection: 'newsletter',
      canonicalUrl: 'https://jevangoldsmith.com/newsletter.html',
      sampleUrl: `https://jevangoldsmith.com${newsletter.sampleUrl}`,
      shareable: true,
      tags: ['projects', 'learning', 'monthly-newsletter'],
      summary: newsletter.description
    }]
  }), { headers: { 'Content-Type': 'application/json' } });
}
