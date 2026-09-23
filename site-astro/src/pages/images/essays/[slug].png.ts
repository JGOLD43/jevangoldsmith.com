import sharp from 'sharp';
import { publishedEssays, type Essay } from '../../../lib/essays';

export function getStaticPaths() {
  return publishedEssays.map((essay) => ({ params: { slug: essay.id }, props: { essay } }));
}
const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export async function GET({ props }: { props: { essay: Essay } }) {
  const { essay } = props;
  const lines: string[] = [];
  for (const word of essay.title.split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last] + ' ' + word).length <= 32) lines[last] += ' ' + word;
    else lines.push(word);
  }
  const size = lines.length > 4 ? 42 : 58;
  const lineHeight = size * 1.2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#151515"/><rect x="70" y="70" width="100" height="7" fill="#ffd700"/><g fill="#f5f3ed" font-family="sans-serif"><text x="70" y="131" font-size="24" letter-spacing="3">JEVAN GOLDSMITH</text>${lines.slice(0, 6).map((line, i) => `<text x="70" y="${235 + i * lineHeight}" font-size="${size}" font-weight="700">${escapeXml(line)}</text>`).join('')}<text x="70" y="560" font-size="23" fill="#b8b6ae">${escapeXml(essay.category || 'Essay')} · jevangoldsmith.com</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
