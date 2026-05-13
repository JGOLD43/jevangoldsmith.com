const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

const root = process.cwd();
const sourceDir = path.join(root, 'images', 'source');
const generatedDir = path.join(root, 'images', 'generated');

const logoWidths = [88, 176, 264, 352];
// Width sets cap at 1200 because the canonical source images
// (profile.png 713px, zen-nature.png 1191px, remote Unsplash sources up
// to 1200px) are not 4K-native. The 1200w variant is already served
// on 4K viewports via responsive srcset; adding 1600/1920 widths
// would force sharp to emit copies labeled at higher widths than the
// source resolution allows, which is misleading. To support true 4K,
// drop higher-resolution source files into images/source/.
const profileWidths = [360, 520, 720, 960, 1200];
const contentWidths = [320, 480, 720, 960, 1200];
const peopleWidths = [200, 400, 800];
const productWidths = [240, 400, 640, 800];
const remoteWidths = [320, 480, 800, 1200];
// 160w was historically generated for thumbnails but no rendered HTML
// references it (zero matches across all 81 dist pages). 240w covers the
// smallest displayed size; dropped 160 to skip the wasted variants.
const coverWidths = [240, 360, 480];
const videoWidths = [176, 352, 528];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sourcePath(file) {
  return path.join(sourceDir, file);
}

function generatedPath(...parts) {
  return path.join(generatedDir, ...parts);
}

async function image(input, output, width, format, options) {
  ensureDir(path.dirname(output));
  if (isFresh(output, input)) return;
  let pipeline = sharp(input, { animated: false }).resize({ width, withoutEnlargement: true });
  if (format === 'avif') pipeline = pipeline.avif(options);
  if (format === 'webp') pipeline = pipeline.webp(options);
  if (format === 'png') pipeline = pipeline.png(options);
  if (format === 'jpeg') pipeline = pipeline.jpeg(options);
  await pipeline.toFile(output);
}

function isFresh(output, input) {
  return fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs;
}

function removeIfExists(file) {
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}

function writeFileIfChanged(file, contents) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === contents) return false;
  fs.writeFileSync(file, contents);
  return true;
}

function pruneUnusedGeneratedWebp() {
  if (!fs.existsSync(generatedDir)) return;
  const stack = [generatedDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.webp')) continue;
      const rel = path.relative(generatedDir, full).split(path.sep).join('/');
      if (rel.startsWith('logo/')) continue;
      fs.rmSync(full, { force: true });
    }
  }
}

// Conservative instant-load asset strategy: AVIF first, JPG/PNG fallback.
// WebP is generated only for the logo because the nav video poster still
// references logo-nav-176.webp. Everything else is stale deploy weight.
async function generateRasterSet({ input, outDir, basename, widths, jpeg = false, webp = false }) {
  try {
    await sharp(input).metadata();
  } catch (err) {
    console.warn(`optimize-assets: skipping ${input} (not a valid image: ${err.message})`);
    return;
  }
  for (const width of widths) {
    await image(input, path.join(outDir, `${basename}-${width}.avif`), width, 'avif', {
      quality: jpeg ? 72 : 82,
      effort: 6
    });
    const webpOutput = path.join(outDir, `${basename}-${width}.webp`);
    if (webp) {
      await image(input, webpOutput, width, 'webp', {
        quality: jpeg ? 82 : 92,
        effort: 5
      });
    } else {
      removeIfExists(webpOutput);
    }
    await image(input, path.join(outDir, `${basename}-${width}.${jpeg ? 'jpg' : 'png'}`), width, jpeg ? 'jpeg' : 'png', {
      quality: 88,
      compressionLevel: 9,
      progressive: true,
      mozjpeg: true
    });
  }
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 14);
}

function collectUrls(value, urls = new Set()) {
  if (!value) return urls;
  if (typeof value === 'string') {
    if (/^https:\/\/images\.unsplash\.com\//i.test(value)) urls.add(value);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectUrls(item, urls));
  }
  return urls;
}

function collectRemoteMediaUrls() {
  const urls = new Set();
  for (const file of ['data/adventures.json', 'data/projects.json']) {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath)) collectUrls(JSON.parse(fs.readFileSync(fullPath, 'utf8')), urls);
  }

  for (const dir of [path.join(root, 'site-astro', 'src')]) {
    for (const file of walkFiles(dir, /\.(astro|ts|js|html)$/i)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(/https:\/\/images\.unsplash\.com\/[^"'\s)<>]+/gi)) {
        urls.add(match[0].replace(/&amp;/g, '&'));
      }
    }
  }

  for (const dir of [root, path.join(root, '_src', 'pages'), path.join(root, 'site-astro', 'src', 'legacy', 'pages')]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((entry) => entry.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const match of html.matchAll(/https:\/\/images\.unsplash\.com\/[^"'\s)<>]+/gi)) {
        urls.add(match[0].replace(/&amp;/g, '&'));
      }
    }
  }

  const booksPath = path.join(root, 'data', 'books.json');
  if (fs.existsSync(booksPath)) {
    const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    for (const book of books) {
      const isbn = String(book.isbn || '').replace(/[^0-9X]/gi, '');
      if (isbn) urls.add(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
    }
  }

  return Array.from(urls).sort();
}

function walkFiles(dir, pattern) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, pattern));
    else if (entry.isFile() && pattern.test(entry.name)) out.push(full);
  }
  return out;
}

async function download(url, target) {
  if (fs.existsSync(target) && fs.statSync(target).size > 1024) return;
  ensureDir(path.dirname(target));
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'JevanGoldsmithWebsiteAssetOptimizer/1.0'
    }
  });
  if (!response.ok) {
    console.warn(`Skipping remote asset (${response.status}): ${url}`);
    return false;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) {
    console.warn(`Skipping tiny remote asset: ${url}`);
    return false;
  }
  fs.writeFileSync(target, buffer);
  return true;
}

async function generateRemoteAssetSet() {
  const urls = collectRemoteMediaUrls();
  const manifest = {};
  const sourceRemoteDir = sourcePath('remote');
  const remoteGeneratedDir = generatedPath('remote');
  ensureDir(sourceRemoteDir);
  ensureDir(remoteGeneratedDir);

  for (const url of urls) {
    const id = hash(url);
    const isCover = /covers\.openlibrary\.org/i.test(url);
    const widths = isCover ? coverWidths : remoteWidths;
    const source = path.join(sourceRemoteDir, `${id}.source`);
    const downloaded = await download(url, source);
    if (!downloaded && (!fs.existsSync(source) || fs.statSync(source).size < 1024)) continue;

    const entry = {
      source: `images/source/remote/${id}.source`,
      widths,
      formats: {}
    };

    for (const width of widths) {
      const basename = `${id}-${width}`;
      await image(source, path.join(remoteGeneratedDir, `${basename}.avif`), width, 'avif', { quality: isCover ? 66 : 72, effort: 6 });
      removeIfExists(path.join(remoteGeneratedDir, `${basename}.webp`));
      await image(source, path.join(remoteGeneratedDir, `${basename}.jpg`), width, 'jpeg', { quality: isCover ? 80 : 84, progressive: true, mozjpeg: true });
      entry.formats[width] = {
        avif: `images/generated/remote/${basename}.avif`,
        jpg: `images/generated/remote/${basename}.jpg`
      };
    }

    manifest[url] = entry;
  }

  const manifestPath = path.join(root, 'data', 'remote-assets.generated.json');
  const changed = writeFileIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  if (!changed) console.log('optimize-assets: remote asset manifest unchanged');
}

function runFfmpeg(args) {
  const output = args[args.length - 1];
  const inputIndex = args.indexOf('-i');
  const input = inputIndex >= 0 ? args[inputIndex + 1] : null;
  if (input && isFresh(output, input)) return;
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: root,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with status ${result.status}`);
  }
}

function generateVideoSet() {
  const input = sourcePath('logo-animated.mp4');
  if (!fs.existsSync(input)) return;
  const outDir = generatedPath('video');
  ensureDir(outDir);

  for (const width of videoWidths) {
    const scale = `scale=${width}:-2:flags=lanczos`;
    runFfmpeg([
      '-i', input,
      '-vf', scale,
      '-an',
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', width >= 528 ? '23' : '28',
      '-row-mt', '1',
      '-deadline', 'good',
      '-cpu-used', '2',
      path.join(outDir, `logo-animated-${width}.webm`)
    ]);
    runFfmpeg([
      '-i', input,
      '-vf', scale,
      '-an',
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', width >= 528 ? '18' : '22',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      path.join(outDir, `logo-animated-${width}.mp4`)
    ]);
  }
}

async function main() {
  const logo = sourcePath('logo.png');
  const profile = sourcePath('profile.png');
  const zen = sourcePath('zen-nature.png');

  if (!fs.existsSync(logo)) throw new Error('Missing images/source/logo.png');
  await generateRasterSet({
    input: logo,
    outDir: generatedPath('logo'),
    basename: 'logo-nav',
    widths: logoWidths,
    // Keep WebP for the nav logo — it's the <video poster> for the
    // animated logo and the only WebP variant referenced in shipped HTML.
    webp: true
  });

  if (fs.existsSync(profile)) {
    await generateRasterSet({
      input: profile,
      outDir: generatedPath('profile'),
      basename: 'profile',
      widths: profileWidths,
      jpeg: true
    });
  }

  if (fs.existsSync(zen)) {
    await generateRasterSet({
      input: zen,
      outDir: generatedPath('content'),
      basename: 'zen-nature',
      widths: contentWidths,
      jpeg: true
    });
  }

  const peopleDir = path.join(root, 'images', 'people');
  if (fs.existsSync(peopleDir)) {
    for (const file of fs.readdirSync(peopleDir).filter((entry) => /\.(png|jpe?g)$/i.test(entry))) {
      const basename = path.parse(file).name;
      await generateRasterSet({
        input: path.join(peopleDir, file),
        outDir: generatedPath('people'),
        basename,
        widths: peopleWidths,
        jpeg: true
      });
    }
  }

  const productsDir = path.join(root, 'images', 'products');
  if (fs.existsSync(productsDir)) {
    for (const file of fs.readdirSync(productsDir).filter((entry) => /\.(png|jpe?g|webp)$/i.test(entry))) {
      const basename = path.parse(file).name;
      await generateRasterSet({
        input: path.join(productsDir, file),
        outDir: generatedPath('products'),
        basename,
        widths: productWidths,
        jpeg: /\.(jpe?g)$/i.test(file)
      });
    }
  }

  await generateRemoteAssetSet();
  generateVideoSet();
  pruneUnusedGeneratedWebp();
  console.log('Optimized responsive image and video assets.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
