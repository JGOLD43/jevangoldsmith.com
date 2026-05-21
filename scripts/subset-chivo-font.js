#!/usr/bin/env node
// Subset Chivo variable font to actually-used codepoints + restrict
// weight axis to 400-700 (CSS only uses these). Shrinks ~33KB → ~24KB.
//
// Run after upstream font updates or when content adds new glyph ranges.
// Re-runs the codepoint sweep against dist/ if --sweep is passed.
//
// Requires Python deps: fonttools, brotli, zopfli (pip install).

import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const sourceFont = join(repoRoot, 'fonts/chivo/chivo-latin-variable.woff2');

const UNICODES = [
  'U+0020-007E', // ASCII printable
  'U+00A0-00FF', // Latin-1 supplement (accents, ©, ×, etc.)
  'U+2010-2027', // General punctuation (em/en dash, quotes, ellipsis)
  'U+2030-203A', // permille, prime, single quotes
  'U+2044',      // fraction slash
  'U+20AC',      // €
  'U+2122',      // ™
  'U+2190-21FF', // arrows
  'U+25A0-25FF', // geometric shapes (▼ ▾ etc.)
  'U+2605,U+2606', // ★ ☆
  'U+2699,U+26A1', // ⚙ ⚡
  'U+2705,U+270D,U+2713,U+2714,U+2716,U+2728', // checks, pen
  'U+276E,U+276F', // ❮ ❯
  'U+2B05,U+2B06,U+2B07,U+2B95', // more arrows
].join(',');

if (!existsSync(sourceFont)) {
  console.error(`[font] source missing: ${sourceFont}`);
  process.exit(1);
}

const beforeBytes = statSync(sourceFont).size;
const tmpAxisLimited = '/tmp/chivo-axis-limited.woff2';
const tmpFinal = '/tmp/chivo-final.woff2';

// 1. Limit weight axis 400-700 (CSS uses 400/500/600/700 only)
execSync(`python3 -c "
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
f = TTFont('${sourceFont}')
limited = instantiateVariableFont(f, {'wght': (400, 700)})
limited.flavor = 'woff2'
limited.save('${tmpAxisLimited}')
"`, { stdio: 'inherit' });

// 2. Subset glyphs to used codepoints
execSync(`pyftsubset "${tmpAxisLimited}" \
  --unicodes="${UNICODES}" \
  --layout-features='kern,liga' \
  --no-hinting \
  --desubroutinize \
  --output-file="${tmpFinal}" \
  --flavor=woff2 \
  --with-zopfli`, { stdio: 'inherit' });

execSync(`cp "${tmpFinal}" "${sourceFont}"`);
const afterBytes = statSync(sourceFont).size;
const saved = beforeBytes - afterBytes;
const pct = ((saved / beforeBytes) * 100).toFixed(1);
console.log(`[font] chivo-latin-variable.woff2: ${beforeBytes}B → ${afterBytes}B (saved ${saved}B, ${pct}%)`);
