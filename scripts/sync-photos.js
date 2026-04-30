#!/usr/bin/env node
/**
 * Sync photo metadata from Google Drive into data/photos.generated.json.
 *
 * Setup:
 *   1. In Google Cloud, create a service account, enable the Drive API,
 *      and download its JSON key to .secrets/drive-sa.json (gitignored).
 *   2. Create a Drive folder containing one subfolder per adventure id
 *      (e.g. MyAdventures/japan-adventure/IMG_0001.jpg).
 *   3. Share that root folder with the service account email as Viewer
 *      AND set "Anyone with the link → Viewer" so the public can load images.
 *   4. Set environment variables in .env:
 *        GOOGLE_DRIVE_FOLDER_ID=<root folder id>
 *        GOOGLE_APPLICATION_CREDENTIALS=.secrets/drive-sa.json
 *   5. Run:  npm run photos:sync
 *
 * The script lists all images in the folder, extracts EXIF GPS via Drive's
 * built-in imageMediaMetadata field (no download needed), and writes results
 * to data/photos.generated.json. Photos missing GPS are recorded in
 * data/photos.skipped.json so you can backfill manually if desired.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
let google;
try {
  ({ google } = require('googleapis'));
} catch {
  console.error('sync-photos: googleapis is not installed. Run `npm i googleapis` first.');
  process.exit(1);
}

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'data', 'photos.generated.json');
const SKIPPED_FILE = path.join(ROOT, 'data', 'photos.skipped.json');
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const CREDS = process.env.GOOGLE_APPLICATION_CREDENTIALS || '.secrets/drive-sa.json';

if (!FOLDER_ID) {
  console.error('GOOGLE_DRIVE_FOLDER_ID not set. Add it to .env. Exiting.');
  process.exit(1);
}
if (!fs.existsSync(CREDS)) {
  console.error(`Service account JSON not found at ${CREDS}. Set GOOGLE_APPLICATION_CREDENTIALS or place the file there.`);
  process.exit(1);
}

const FIELDS = 'id,name,mimeType,parents,modifiedTime,imageMediaMetadata(width,height,time,location)';
const PAGE_SIZE = 1000;

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  return google.drive({ version: 'v3', auth });
}

async function listChildren(drive, parentId) {
  const out = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: `nextPageToken, files(${FIELDS})`,
      pageSize: PAGE_SIZE,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    out.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

function readCache() {
  if (!fs.existsSync(OUT_FILE)) return { photos: [] };
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); }
  catch (_err) { return { photos: [] }; }
}

async function main() {
  const drive = await getDriveClient();
  console.log('Listing adventure subfolders…');
  const subfolders = (await listChildren(drive, FOLDER_ID))
    .filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
  console.log(`Found ${subfolders.length} adventure folder(s).`);

  const cache = readCache();
  const cacheById = new Map((cache.photos || []).map((p) => [p.driveId, p]));

  const photos = [];
  const skipped = [];
  let scanned = 0;
  let cachedHits = 0;

  for (const folder of subfolders) {
    const adventureId = folder.name;
    const items = await listChildren(drive, folder.id);
    for (const file of items) {
      if (!file.mimeType || !file.mimeType.startsWith('image/')) continue;
      scanned += 1;

      const cached = cacheById.get(file.id);
      if (cached && cached.modifiedTime === file.modifiedTime) {
        photos.push(cached);
        cachedHits += 1;
        continue;
      }

      const meta = file.imageMediaMetadata || {};
      const loc = meta.location || {};
      if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
        skipped.push({
          driveId: file.id,
          adventureId,
          name: file.name,
          reason: 'no-gps'
        });
        continue;
      }

      photos.push({
        id: `${adventureId}-${file.id.slice(0, 8)}`,
        driveId: file.id,
        adventureId,
        name: file.name,
        modifiedTime: file.modifiedTime,
        lat: loc.latitude,
        lng: loc.longitude,
        altitude: typeof loc.altitude === 'number' ? loc.altitude : null,
        takenAt: meta.time || null,
        width: meta.width || null,
        height: meta.height || null,
        thumb: `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
        full: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`,
        caption: ''
      });
    }
  }

  photos.sort((a, b) => (a.takenAt || a.modifiedTime || '').localeCompare(b.takenAt || b.modifiedTime || ''));

  fs.writeFileSync(OUT_FILE, `${JSON.stringify({ photos, generatedAt: new Date().toISOString() }, null, 2)}\n`);
  fs.writeFileSync(SKIPPED_FILE, `${JSON.stringify({ skipped }, null, 2)}\n`);

  console.log(`Scanned ${scanned} photo(s), ${cachedHits} reused from cache, ${photos.length - cachedHits} new.`);
  console.log(`Wrote ${photos.length} photos to ${path.relative(ROOT, OUT_FILE)}`);
  if (skipped.length) console.log(`Skipped ${skipped.length} photo(s) (no GPS) -> ${path.relative(ROOT, SKIPPED_FILE)}`);
}

main().catch((err) => {
  console.error('photos:sync failed:', err);
  process.exit(1);
});
