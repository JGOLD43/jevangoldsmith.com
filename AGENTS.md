# JGOLD release invariants

These rules apply to every agent working in this repository, including a fresh chat.

## Production targets

- The public website is hosted only by GitHub Pages at `https://jevangoldsmith.com`.
- Never deploy with Firebase, run Firebase CLI commands, or recreate Firebase/Firestore configuration.
- Website releases go through `.github/workflows/deploy-pages.yml` after a normal push to `main`.
- A website change is not complete until the `deploy-pages` workflow succeeds and the custom domain itself serves the expected change.

## JGOLD app updates

- The installed JGOLD app receives JavaScript and styling updates through Expo EAS Update.
- Its production channel is `production`, runtime version is the app version, and the installed target is Android.
- Always export OTA releases with `--platform android`. Do not use Expo's default `all` platform export; `react-native-pdf` is native-only and makes the unrelated web export fail.
- Run `npm run verify` in `private-companion-app` before release.
- Prefer the repository command `npm run release:app -- "Release message"`, which publishes Android to preview, promotes the exact update group to production, and verifies the production assignment.
- Every remote release must increment `private-companion-app/src/constants/release.json`, show its version and release date in Settings, and record the production group in `private-companion-app/release-history.json`. Use `npm run release:app` to do this automatically. Commit the generated release metadata after publishing.
- Keep the installed native app version/runtime unchanged for compatible OTA updates; use the incrementing Update number for these releases. Increment `expo.version`, package version and Android versionCode together only when distributing a new native build.
- An app release is not complete until Expo lists the new group on the production branch. The installed app downloads it on launch and applies it automatically.

## Website publishing from the app

- Studio publication manifests travel through the private GitHub inbox and `.github/workflows/jgold-publish-sync.yml`.
- Changes to the manifest contract must update the app type, inbox validator, site data application, and regression tests together.
- For Now updates, location label, latitude, longitude, and zoom are required public fields; publishing must update `data/now.json`, regenerate the latest map, and preserve the previous update in `data/now-history.json`.
