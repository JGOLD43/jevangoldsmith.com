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
- Direct GitHub publishing from anywhere using a repository-limited token in Android SecureStore
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

Open **Settings → Website connection → Create restricted token**. In GitHub, create a fine-grained personal access token with:

- Repository access: only `JGOLD43/jevangoldsmith.com`
- Repository permissions: Contents, read and write

Copy the token into the app and tap **Connect and verify**. The token is stored in Android SecureStore on this phone. Publishing reads the targeted `data/*.json` file, applies the public draft, commits it to `main`, and lets the existing GitHub test/deployment workflow validate and publish the site.

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
