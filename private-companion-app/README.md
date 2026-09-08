# JGOLD

A private, phone-first JGOLD app for jevangoldsmith.com. The Site tab mirrors the live mobile website, Studio manages explicitly public content, and the encrypted vault remains phone-only.

## Delivered features

- Samsung fingerprint/device-authentication lock screen
- SQLCipher-encrypted SQLite database
- Android hardware-backed Keystore database key
- Private notes and journal-style records
- Local finance entries and totals
- Private camera capture and photo import encrypted with AES-GCM
- Native mobile homepage mirroring the live website's visual language
- Live public content from the website's JSON feeds
- Browse and edit essays, trips, projects, products, and quotes
- New public drafts for essays, adventures, projects, challenges, products, quotes, and Now
- Direct Studio publishing with GitHub device sign-in and automatically renewed credentials in Android SecureStore
- Automatic GitHub test and Pages deployment after a public commit
- Private-item to independent-public-draft workflow
- Frontier AI chat and public-draft context selection
- Local safe-response mode until an AI gateway is configured
- Publishing manifests contain only public draft fields
- Automatic relock when the app backgrounds
- Android backup disabled
- Screenshots, screen recording, and Samsung Recents previews blocked
- Version-compatible app code, styling, and bundled asset updates over the air

## Project boundary

This is a standalone Expo project. It lives beside the existing Astro website but has its own package, dependencies, routing, storage, and build configuration.

```text
src/app/                Site, Vault, Studio, AI, Settings
src/domain/             private/public models and boundary functions
src/storage/            SQLCipher, Keystore, encrypted attachments
src/services/           AI and publishing gateway clients
src/state/              application state and biometric locking
src/components/         shared interface and composer sheets
modules/                optional iOS portability module
tests/                  boundary tests
```

## Run on Samsung Galaxy S23 Ultra

SQLCipher requires a native Android development build; Expo Go is not sufficient.

```bash
npm install
npm run verify
npm run prebuild:android
npm run android
```

Connect the S23 Ultra over USB with Developer options and USB debugging enabled. Enrol a fingerprint before testing; the app asks Android for a Class 3 strong biometric. Samsung face unlock may not qualify as a strong biometric, so fingerprint is the expected unlock method.

### First local Android build on this Mac

The local JDK and Android command-line tools are installed. Google requires the phone owner/developer to accept the SDK license personally before its build packages can be downloaded:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
sdkmanager --licenses
sdkmanager 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools' 'ndk;27.1.12297006'
npm run android
```

Alternatively, use the included `eas.json` to create an installable APK through an Expo account:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

## Remote updates

The installed JGOLD app checks its Expo production channel when it launches. Compatible JavaScript, styling, and bundled asset updates download in the background and take effect on the next app restart. Updates are restricted by the native app version so an update cannot target an incompatible Android build.

Publish to preview first, verify it, and then promote the same release to production:

```bash
npx eas-cli@latest update --channel preview --message "Describe the update" --environment preview
npx eas-cli@latest update:republish --destination-channel production
```

Native Android changes, permissions, Expo SDK upgrades, and new native dependencies still require a new signed build through the private Google Play testing track. The updater downloads app code and bundled assets only; it has no import of, or API to, the encrypted vault database and attachment storage.

## Connect website publishing

Open **Settings → Publishing inbox → Sign in with GitHub**. Enter the displayed code on GitHub, sign in as `JGOLD43`, approve **JGOLD Studio Publishing**, and return to JGOLD. Approved queued changes retry automatically after connection.

The private GitHub App `jgold-studio-publishing` is installed only on `JGOLD43/jgold-publishing-inbox`, with Contents read/write and mandatory Metadata read access. The public client ID is configured in `src/services/github-oauth.ts`; no client secret or private key is bundled. Device-flow access and refresh credentials stay in Android SecureStore, rotate automatically, and are removed by Disconnect publishing. GitHub may require sign-in again after revocation or six months without renewal.

The app submits approved manifests and selected media to the private inbox. The website's `jgold-publish-sync` workflow validates them and applies allowlisted site data, then starts the test/deployment gate. Studio distinguishes a submitted change from a publication confirmed by a receipt served on the live website. GitHub scheduling and deployment can take several minutes.

Connection verification on 2026-09-08 covered real device authorization, automatic refresh, private inbox access, and a temporary write outside the submissions directory followed by cleanup. No test story was published.

## Connect frontier AI

Copy `.env.example` to `.env.local` and set the private app-gateway URL:

```bash
EXPO_PUBLIC_APP_GATEWAY_URL=https://your-private-gateway.example.com
```

The app calls:

- `POST /v1/ai/chat` with `{ context: { source, title?, content } }`
Provider credentials belong in the gateway, never in the mobile bundle. Until the AI gateway exists, AI remains in safe local-response mode. Website publishing does not use this AI gateway.

## Privacy architecture

Vault, public workspace, AI, and publishing are separate modules. Cloud AI can receive text typed in AI chat or an explicitly selected public draft. The GitHub publisher accepts only the narrow `PublishManifest` type. Neither service imports the vault repository.

Private photos are encrypted before being written to the vault directory. Importing from Samsung Gallery creates an encrypted private copy but does not remove an original that may already exist in Gallery, Google Photos, OneDrive, or another sync service.

Read [SECURITY.md](./SECURITY.md) before treating the app as production-ready for irreplaceable financial or personal records.

## Verification

```bash
npm run typecheck
npm test
npm run config:check
```

`npm run verify` runs all three.

### Immediate publication and fresh pages

The private inbox runs `publish-website.yml` on submission changes and immediately dispatches the public repository's publishing workflow. Its encrypted `JGOLD_WEBSITE_TRIGGER` secret is a server-only fine-grained credential restricted to Actions write on `JGOLD43/jevangoldsmith.com`; it has no content-write permission and never goes to the phone. The hourly sync is a recovery fallback.

Content-only commits qualify for focused validation only when their base revision already passed the main test workflow. Code changes retain the full checks. The test workflow calls deploy-pages directly after validation, avoiding another event handoff. Pages deploys the exact tested artifact and verifies its revision on the custom domain. Studio checks pending delivery automatically and opens a refreshed publication page once the deployed receipt is available.

### Home calendar and time intentions (1.5.4)

Home reads the calendars selected from Android’s calendar provider. Choose a Google-account calendar for new blocks; Android/Google account sync carries those events to Google Calendar. JGOLD does not claim cloud delivery from a successful local write. Calendar permission and an account with Calendar sync enabled are required. Calendar selection is explicit, including separate read and write choices.

Time blocks link to Goals, Fucket List, Learning, Interests or Trips using an opaque goal marker in the event notes. Titles and times follow the selected calendar’s sharing settings. Weekly targets, personal reasons, consequences and completion confirmations stay in the encrypted local vault. Refresh on Home focus, phone resume, manual refresh and once per minute reflects device calendar changes.

Existing calendar events can also be linked privately to list items, including repeated occurrences. Unscheduled past activity can be logged and removed on its selected day.

Weekly totals merge overlapping timed intervals and exclude all-day events. Scheduled minutes are distinct from confirmed activity; “I did this” confirms the full elapsed block. Each recurring occurrence has its own confirmation. Missing calendar entries are not evidence of inactivity. The optional Sunday 6 pm notification invites a review without exposing private reasons; personalised encouragement appears on Home using the user’s own notes.

The Calendar native module requires Android version 1.5.4 / versionCode 17. Install this signed native upgrade before sending compatible OTA updates. Never uninstall or clear the vault to replace the app. Use Android-only exports and the production release command for subsequent updates.

### Reading catch-up and flashcards (1.5.5 Update 2)

Open **Learning → Flashcards → Study my reading**. Saved book highlights and notes appear here, filterable by collection. Pick a passage, choose an exact phrase to hide, and preview the test. Definition and cause-and-effect passages also offer an extractive question-and-answer draft. Check or rewrite the draft before saving. **Paste reading or notes** supports other material without a network request. This is local, source-based drafting, not an AI book-summary service.

Put related books in the same learning group when saving. The group dashboard shows new, learning and due counts. Sessions prioritise due work, introduce at most ten new cards, and mix groups when no group is selected. Reveal the answer and original source only after trying recall, then choose **Again / Hard / Good / Easy**; each shows the next review interval. Missed-answer practice and shuffle do not change the saved schedule. The interval scheduler is a transparent local heuristic, not Anki FSRS or Math Academy’s algorithm.

Existing cards and review history are preserved. Duplicate source tests are blocked, including archived cards; edit or restore the existing card instead. Cards, excerpts and review history stay in the encrypted vault. Book and annotation deletion leaves the saved excerpt on its study card; deleting an archived card removes its review history too.
