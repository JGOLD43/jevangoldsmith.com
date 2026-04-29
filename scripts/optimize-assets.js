const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

const root = process.cwd();
const sourceDir = path.join(root, 'images', 'source');
const generatedDir = path.join(root, 'images', 'generated');

const logoWidths = [88, 176, 264, 352];
const profileWidths = [360, 520, 720, 960, 1200];
const contentWidths = [320, 480, 720, 960, 1200];
const peopleWidths = [200, 400, 800];
const productWidths = [240, 400, 640, 800];
const remoteWidths = [320, 480, 800, 1200];
const coverWidths = [160, 240, 360, 480];
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

async function generateRasterSet({ input, outDir, basename, widths, jpeg = false }) {
  for (const width of widths) {
    await image(input, path.join(outDir, `${basename}-${width}.avif`), width, 'avif', {
      quality: jpeg ? 72 : 82,
      effort: 6
    });
    await image(input, path.join(outDir, `${basename}-${width}.webp`), width, 'webp', {
      quality: jpeg ? 82 : 92,
      effort: 5
    });
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

  for (const dir of [root, path.join(root, '_src', 'pages')]) {
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
      await image(source, path.join(remoteGeneratedDir, `${basename}.webp`), width, 'webp', { quality: isCover ? 78 : 82, effort: 5 });
      await image(source, path.join(remoteGeneratedDir, `${basename}.jpg`), width, 'jpeg', { quality: isCover ? 80 : 84, progressive: true, mozjpeg: true });
      entry.formats[width] = {
        avif: `images/generated/remote/${basename}.avif`,
        webp: `images/generated/remote/${basename}.webp`,
        jpg: `images/generated/remote/${basename}.jpg`
      };
    }

    manifest[url] = entry;
  }

  const manifestPath = path.join(root, 'data', 'remote-assets.generated.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
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
    widths: logoWidths
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
  console.log('Optimized responsive image and video assets.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
