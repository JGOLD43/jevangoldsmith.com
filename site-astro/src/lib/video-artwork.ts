export interface VideoArtwork {
  headline: string;
  kicker: string;
  layout: 'cinema' | 'portrait' | 'split' | 'editorial' | 'type';
  background: string;
  ink: string;
  accent: string;
  font: 'sans' | 'serif' | 'mono';
  image?: string;
  motif?: 'steps' | 'smoke';
}

// New videos still receive a stable individual sleeve before artwork is curated.
export function videoArtwork(item: { id: string; title: string; topic: string }, curated?: VideoArtwork): VideoArtwork {
  if (curated) return curated;
  const seed = Array.from(item.id).reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 0);
  const colours = ['#8e3c32', '#285767', '#665070', '#315b49', '#665036'];
  return {
    headline: item.title, kicker: item.topic, layout: 'type',
    background: colours[seed % colours.length], ink: '#fff1d8', accent: '#e7bd78',
    font: seed % 2 ? 'serif' : 'sans', motif: 'steps',
  };
}
