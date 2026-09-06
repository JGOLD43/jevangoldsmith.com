'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { writeDocument } = require('../../private-companion-app/src/domain/studio-document.cjs');

function buildStudioApi(root) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const collections = {};
  const targets = { essay: ['essays', 'essays'], adventure: ['adventures', 'adventures'], project: ['projects', 'projects'], challenge: ['challenges', 'challenges'], product: ['products', 'products'], quote: ['quotes', 'fullQuotes'] };
  for (const [type, [file, key]] of Object.entries(targets)) {
    collections[type] = (read(`data/${file}.json`)[key] || []).filter((item) => item.visibility !== 'private' && item.status !== 'draft' && item.status !== 'archived' && (type !== 'essay' || item.status === 'published')).map((item) => ({
      id: String(item.id || item.slug || ''),
      title: type === 'quote' ? item.text : item.title,
      summary: type === 'quote' ? item.author : item.subtitle || item.shortDescription || item.summary || '',
      content: item.studioDocument ? writeDocument(item.studioDocument) : item.studioBody || item.content || item.description || (type === 'quote' ? item.text : '') || '',
      featuredImage: item.featuredImage || item.heroImage || item.image || null,
      category: item.category || '', status: item.status || 'published',
      date: item.date || item.startDate || '', updatedAt: item.updatedAt || '',
    }));
  }
  const now = read('data/now.json');
  collections.now = [{ id: 'now', title: now.sections?.[0]?.title || 'Now', summary: '', content: now.studioDocument ? writeDocument(now.studioDocument) : (now.sections || []).map((section, index) => `${index ? `<h2>${section.title}</h2>` : ''}${section.body}`).join('\n\n'), nowLocation: now.location, status: 'published', date: now.lastUpdated }];
  const state = read('.jgold-publication-state.json');
  // Receipts contain no draft body, device paths, credentials or private records.
  const receipts = Object.fromEntries(Object.entries(state.receipts).filter(([id]) => !id.includes(':')).map(([id, receipt]) => [id, { status: receipt.status, publicId: receipt.publicId || null, reason: receipt.status === 'rejected' ? receipt.reason : '', processedAt: receipt.processedAt }]));
  return { version: 1, generatedAt: new Date().toISOString(), collections, receipts };
}
module.exports = { buildStudioApi };
