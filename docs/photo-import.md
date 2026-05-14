# Photo Import Workflow

End-to-end guide to get adventure photos from a Google Drive folder onto the
live site — plotted on the map at their GPS coordinates and rendered in
per-adventure galleries.

## What's already wired

- **Backend extractor:** `scripts/sync-photos.js` reads a Drive folder via
  the service-account JSON, pulls each photo's EXIF (GPS, capture time,
  dimensions) from Drive's `imageMediaMetadata`, and writes
  `data/photos.generated.json`.
- **Frontend rendering:** `adventures-map.ts` already loads the manifest,
  groups markers with `leaflet.markercluster`, and wires marker clicks
  through `openPhotoLightbox`. The per-adventure detail pages render the
  `gallery` field as a grid.
- **Vendored deps:** `vendor/leaflet.markercluster/` (cluster plugin) and
  the `googleapis` + `dotenv` npm packages are already installed.
- **Skipped photos:** anything without GPS lands in
  `data/photos.skipped.json` so you can backfill manually.

What's *not* yet done is account setup + the one-time auth wiring. That's
on you, because it touches Google Cloud and your Drive permissions.

## One-time setup

### 1. Drive folder layout

Create one Drive folder, with one subfolder per adventure. The subfolder
name **must match the adventure `id`** in `data/adventures.json`.

```
Jevan Adventures/              ← parent folder
  japan-adventure/             ← matches `id: "japan-adventure"`
    IMG_0001.jpg
    IMG_0002.jpg
  vietnam-adventure/
    ...
```

Photos can be any image format Drive understands (JPEG, HEIC, PNG, RAW
thumbnails).

### 2. Google Cloud service account

1. Open https://console.cloud.google.com and create (or pick) a project.
2. Enable **Google Drive API** for that project.
3. Create a **Service Account**:
   - IAM & Admin → Service Accounts → Create
   - Name: `drive-photo-sync` (anything works)
   - Skip roles (none needed)
4. On the new service account → Keys → Add Key → JSON. Save the file as
   `.secrets/drive-sa.json` in this repo (already in `.gitignore`).
5. Copy the service account email (looks like
   `drive-photo-sync@your-project.iam.gserviceaccount.com`).

### 3. Share the Drive folder

In Drive, open the parent folder → Share:
- Add the service account email as **Viewer**
- Also set **Anyone with the link → Viewer** so the public site can load
  images via the Drive thumbnail URL

### 4. Environment

Get the folder ID from the Drive URL — it's the last path segment of
`https://drive.google.com/drive/folders/<this part>`.

Create `.env` in the repo root:

```
GOOGLE_DRIVE_FOLDER_ID=<parent folder id>
GOOGLE_APPLICATION_CREDENTIALS=.secrets/drive-sa.json
```

## Importing photos

```
npm run photos:sync
```

Output:
- `data/photos.generated.json` — every photo with GPS, sorted by capture time
- `data/photos.skipped.json` — photos missing GPS, kept for review

The script is **incremental**: photos whose `modifiedTime` hasn't changed
since the last run are reused from cache. Re-running after adding 5 new
photos to a folder of 500 only fetches metadata for those 5.

## Captions and manual GPS

For now, edit `data/photos.generated.json` directly to add a `caption`
field to any entry. Manual GPS for photos that EXIF didn't cover: edit the
matching entry in `data/photos.skipped.json`, add `lat`/`lng`, and
move it into `data/photos.generated.json`.

If this gets painful at scale, a `photos.overrides.json` merge step is a
~20-line addition.

## Deploying

```
npm run build:fast
```

Then push the updated `dist/` to the `gh-pages` branch (same worktree
pattern as the rest of the site). Live within ~1 minute after GH Pages
rebuilds.

## Known caveats

- **Old photos (pre-2010) often have no GPS.** They'll land in
  `photos.skipped.json` — add lat/lng manually and move them over.
- **Videos are not synced.** `sync-photos.js` filters to
  `mimeType.startsWith('image/')`. Adding video support means writing a
  separate manifest + a video lightbox path.
- **Privacy:** if any photo's EXIF GPS reveals a private location (your
  home, etc.), strip the entry from `photos.generated.json` before
  committing. A redact-near-home build step can be added later.
- **HEIC rendering:** Drive's thumbnail API serves all formats as
  JPEG/WebP at the requested width, so HEIC originals render fine in the
  browser without a local conversion step.
