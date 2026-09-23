import { materialLabels, type MaterialKind, type ArtArtwork } from '../lib/library-materials';
import type { VideoArtwork } from '../lib/video-artwork';

// Printed material sleeves; video cases pair curated type with source thumbnails.
export function materialCover(material: { title: string; kind: MaterialKind; collection: string; medium?: string; duration?: string | null; videoArtwork?: VideoArtwork; artArtwork?: ArtArtwork }) {
  const cover = document.createElement('span');
  cover.className = 'material-design';
  const text = (className: string, value: string) => {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = value;
    cover.append(node);
  };
  if (material.kind === 'art' && material.artArtwork) {
    cover.classList.add('art-design');
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.remove();
      text('art-fallback', material.title);
    }, { once: true });
    image.src = material.artArtwork.image;
    cover.append(image);
    return cover;
  }
  if (material.kind === 'video' && material.videoArtwork) {
    const artwork = material.videoArtwork;
    cover.classList.add('video-design');
    cover.dataset.layout = artwork.layout;
    cover.dataset.font = artwork.font;
    cover.dataset.motif = artwork.motif || 'steps';
    cover.style.setProperty('--video-paper', artwork.background);
    cover.style.setProperty('--video-ink', artwork.ink);
    cover.style.setProperty('--video-accent', artwork.accent);
    if (artwork.image) {
      const frame = document.createElement('span');
      frame.className = 'video-frame';
      const image = document.createElement('img');
      image.className = 'video-still';
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      // Covers arrive in a small moving window, so start loading immediately.
      // A missing thumbnail keeps the title and its own colour treatment visible.
      image.addEventListener('error', () => {
        frame.remove();
        cover.dataset.layout = 'type';
      }, { once: true });
      image.src = artwork.image;
      frame.append(image);
      cover.append(frame);
    }
    text('video-kicker', artwork.kicker);
    text('video-heading', artwork.headline);
    text('video-footer', [material.collection, material.duration].filter(Boolean).join(' · '));
    return cover;
  }
  text('material-edition', materialLabels[material.kind]);
  if (material.kind === 'article') {
    const space = document.createElement('span');
    space.className = 'article-headline-space';
    const heading = document.createElement('span');
    heading.className = 'material-heading';
    heading.textContent = material.title;
    space.append(heading);
    cover.append(space);
    text('material-footnote', [material.collection, material.duration || material.medium].filter(Boolean).join(' · '));
    return cover;
  }
  const illustration = document.createElement('span');
  illustration.className = 'material-illustration';
  for (let i = 0; i < 3; i++) illustration.append(document.createElement('i'));
  cover.append(illustration);
  text('material-heading', material.title);
  text('material-rule', '');
  text('material-footnote', `${material.collection} · ${material.duration || material.medium || 'Collected material'}`);
  return cover;
}

// Fit the actual rendered lines, including long words, instead of truncating
// after a fixed line count. Cache dimensions so shelf animation does no layout reads.
const articleSizes = new WeakMap<HTMLElement, string>();
export function fitArticleHeadline(volume: HTMLElement, width: number, height: number) {
  const size = `${width}:${height}`;
  if (articleSizes.get(volume) === size) return;
  const space = volume.querySelector<HTMLElement>('.article-headline-space');
  const heading = space?.querySelector<HTMLElement>('.material-heading');
  if (!space || !heading || !space.clientHeight) return;
  const fits = () => heading.scrollHeight <= space.clientHeight && heading.scrollWidth <= space.clientWidth;
  let low = 1;
  let high = width * .14;
  heading.style.fontSize = `${high}px`;
  if (!fits()) {
    // The text stays at the largest size that fits its available print area.
    for (let i = 0; i < 9; i++) {
      const mid = (low + high) / 2;
      heading.style.fontSize = `${mid}px`;
      if (fits()) low = mid;
      else high = mid;
    }
    heading.style.fontSize = `${Math.floor(low * 10) / 10}px`;
  }
  articleSizes.set(volume, size);
}
