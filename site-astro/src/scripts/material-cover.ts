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
  const illustration = document.createElement('span');
  illustration.className = 'material-illustration';
  for (let i = 0; i < 3; i++) illustration.append(document.createElement('i'));
  cover.append(illustration);
  text('material-heading', material.title);
  text('material-rule', '');
  text('material-footnote', `${material.collection} · ${material.duration || material.medium || 'Collected material'}`);
  return cover;
}
