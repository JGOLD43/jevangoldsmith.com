import sharp from 'sharp';

export interface BookBinding {
  background: string;
  ink: string;
  accent: string;
  serif: boolean;
}

// Reconstructed bindings, matched to the displayed cover edition. These are
// deliberately not presented as scans or supplied with invented publisher marks.
const EDITIONS: Record<string, BookBinding> = {
  '9780735211292': { background: '#f6f3e7', ink: '#b58042', accent: '#25241e', serif: false },
  '9781455586691': { background: '#efb82d', ink: '#171918', accent: '#fff3d2', serif: false },
  '9781501124020': { background: '#eee9dd', ink: '#bd282c', accent: '#1c1b1a', serif: false },
  '9780939173457': { background: '#f6f5ed', ink: '#272626', accent: '#ae2829', serif: true },
};

export async function bookBinding(isbn: string, file?: string): Promise<BookBinding> {
  if (EDITIONS[isbn]) return EDITIONS[isbn];
  let background = '#e7decb';
  let ink = '#28241e';
  if (file) {
    // Sample the cover at build time. New arrivals get their own binding
    // automatically, without network requests or canvas work on the phone.
    const { dominant } = await sharp(file).stats();
    background = `rgb(${dominant.r} ${dominant.g} ${dominant.b})`;
    const luminance = .2126 * dominant.r + .7152 * dominant.g + .0722 * dominant.b;
    ink = luminance > 145 ? '#211e19' : '#faf3e3';
  }
  return { background, ink, accent: ink, serif: false };
}
