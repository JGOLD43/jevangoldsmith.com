// Tiny note formatter. Splits on blank lines into paragraphs and converts
// single line breaks to <br>. Escapes HTML. Not a full markdown parser —
// keeps the dependency surface small and predictable for short personal notes.

import { escapeHtml } from './html-escape';

export function renderNotes(text: string | null | undefined): string {
  if (!text) return '';
  const paragraphs = String(text)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export interface CommentaryEntry {
  date?: string | null;
  title?: string | null;
  body?: string | null;
}

export function renderCommentary(entries: CommentaryEntry[] | null | undefined): string {
  if (!entries || entries.length === 0) return '';
  const items = entries.map((e) => {
    const date = e.date ? `<time class="commentary-date">${escapeHtml(String(e.date))}</time>` : '';
    const title = e.title ? `<h4 class="commentary-title">${escapeHtml(String(e.title))}</h4>` : '';
    const body = e.body ? renderNotes(String(e.body)) : '';
    return `<li class="commentary-item">${date}${title}<div class="commentary-body">${body}</div></li>`;
  });
  return `<ol class="commentary-list">${items.join('')}</ol>`;
}
