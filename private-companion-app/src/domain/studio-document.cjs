'use strict';

const PREFIX = 'JGOLD-DOCUMENT-1\n';
const fonts = { sans: 'Arial, sans-serif', serif: 'Georgia, serif', mono: 'monospace' };
function escape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function readDocument(body) {
  return body.startsWith(PREFIX) ? JSON.parse(body.slice(PREFIX.length)) : null;
}
function writeDocument(document) { return PREFIX + JSON.stringify(document); }
function bodyText(body) { const document = readDocument(body); return document ? documentText(document) : body; }
function documentText(document) {
  return document.blocks.map((block) => block.type === 'text' ? block.text : block.caption).filter(Boolean).join('\n\n');
}
function publicMediaUrl(value) {
  if (typeof value !== 'string' || /[<>"'\\\s]/.test(value) || value.includes('..')) return false;
  if (/^\/media\/studio\//.test(value)) return /^\/media\/studio\/[a-f0-9]{64}\.(jpg|png|webp|mp4|webm)$/.test(value);
  if (/^\/(images|media)\/[A-Za-z0-9/_.%,-]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
function decode(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] || match;
    const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
  });
}
// Existing website HTML becomes editable blocks; it is never executed in the app.
function legacyDocument(html) {
  const blocks = [];
  let text = '';
  let style = 'paragraph';
  const flush = () => { if (text.trim()) blocks.push({ type: 'text', text: decode(text.trim()), font: 'sans', style }); text = ''; };
  const source = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const token of source.match(/<[^>]*>|[^<]+/g) || []) {
    if (!token.startsWith('<')) { text += token; continue; }
    if (/^<\/?(p|h[1-6]|blockquote|div|ul|ol)\b/i.test(token)) { flush(); style = /^<h[1-6]\b/i.test(token) ? 'heading' : /^<blockquote\b/i.test(token) ? 'quote' : 'paragraph'; }
    else if (/^<br\b/i.test(token)) text += '\n';
    else if (/^<li\b/i.test(token)) text += '\n• ';
    else if (/^<(img|video|source)\b/i.test(token)) {
      flush();
      const attr = (name) => decode(token.match(new RegExp('\\b' + name + '\\s*=\\s*["\\\']([^"\\\']*)["\\\']', 'i'))?.[1] || '');
      let src = attr('src');
      if (/^(images|media)\//.test(src)) src = '/' + src;
      if (publicMediaUrl(src)) blocks.push({ type: /^<img/i.test(token) ? 'image' : 'video', src, caption: attr('alt') });
    }
  }
  flush();
  return { version: 1, blocks };
}
function validateDocument(document) {
  if (!document || document.version !== 1 || Object.keys(document).sort().join() !== 'blocks,version' || !Array.isArray(document.blocks) || document.blocks.length > 100) throw new Error('Invalid Studio document.');
  for (const block of document.blocks) {
    if (!block || typeof block !== 'object') throw new Error('Invalid content block.');
    if (block.type === 'text') {
      if (Object.keys(block).sort().join() !== 'font,style,text,type' || !Object.hasOwn(fonts, block.font) || !['paragraph', 'heading', 'quote'].includes(block.style) || typeof block.text !== 'string' || block.text.length > 200000) throw new Error('Invalid text block.');
    } else if (['image', 'video'].includes(block.type)) {
      if (Object.keys(block).sort().join() !== 'caption,src,type' || typeof block.caption !== 'string' || block.caption.length > 2000 || typeof block.src !== 'string') throw new Error('Invalid media block.');
      // Media is copied from the private inbox by the trusted publisher only.
      if (!publicMediaUrl(block.src)) throw new Error('Media must be uploaded before publishing.');
      if (block.src.startsWith('/media/studio/') && !(block.type === 'image' ? /\.(jpg|png|webp)$/ : /\.(mp4|webm)$/).test(block.src)) throw new Error('Media type does not match the file.');
    } else throw new Error('Unsupported content block.');
  }
  return document;
}
function renderDocument(document) {
  validateDocument(document);
  return document.blocks.map((block) => {
    if (block.type === 'text') {
      const tag = { paragraph: 'p', heading: 'h2', quote: 'blockquote' }[block.style];
      return `<${tag} style="font-family:${fonts[block.font]};white-space:pre-wrap">${escape(block.text)}</${tag}>`;
    }
    const media = block.type === 'image'
      ? `<img src="${escape(block.src)}" alt="${escape(block.caption)}" loading="lazy" style="max-width:100%;height:auto">`
      : `<video src="${escape(block.src)}" controls playsinline preload="metadata" style="max-width:100%"></video>`;
    return `<figure>${media}${block.caption ? `<figcaption>${escape(block.caption)}</figcaption>` : ''}</figure>`;
  }).join('');
}
module.exports = { PREFIX, readDocument, writeDocument, documentText, validateDocument, renderDocument, legacyDocument, bodyText };
