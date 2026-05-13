// Shared card-frame helper. The book/movie/person/podcast SSR renderers
// each compose their body and pass it here. This factors out the
// top-level wrapper/class/data-attr composition that was duplicated four
// ways with slightly different escapes.

import { escapeAttr } from './html-escape';

type DataAttrs = Record<string, string | number | boolean | null | undefined>;

export function dataAttrString(attrs: DataAttrs): string {
  let out = '';
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (v === true) { out += ` data-${k}`; continue; }
    out += ` data-${k}="${escapeAttr(String(v))}"`;
  }
  return out;
}

export interface CardFrameSpec {
  tag?: 'div' | 'article';
  classes: string[];
  data?: DataAttrs;
  role?: string;
  tabindex?: number;
  style?: string;
  body: string;
}

export function cardFrame({ tag = 'div', classes, data, role, tabindex, style, body }: CardFrameSpec): string {
  const cls = classes.filter(Boolean).join(' ');
  const dataStr = data ? dataAttrString(data) : '';
  const roleStr = role ? ` role="${escapeAttr(role)}"` : '';
  const tabStr = tabindex != null ? ` tabindex="${tabindex}"` : '';
  const styleStr = style ? ` style="${escapeAttr(style)}"` : '';
  return `<${tag} class="${cls}"${dataStr}${roleStr}${tabStr}${styleStr}>${body}</${tag}>`;
}

// Top badge convention: book/movie/podcast all have an optional "times" badge
// in the same DOM slot. People cards never have one.
export function topBadge(text: string | null, extraClass = ''): string {
  if (!text) return '';
  const cls = ['times-read-badge', extraClass].filter(Boolean).join(' ');
  return `<div class="${cls}">${text}</div>`;
}
