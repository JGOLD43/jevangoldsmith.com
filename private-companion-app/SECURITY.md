# Security and privacy status

## Implemented

- SQLCipher is enabled through the Expo SQLite config plugin.
- The 256-bit database key is generated randomly and stored using Android SecureStore, backed by the Android Keystore.
- Vault attachments are encrypted with AES-GCM before being stored.
- The Android application manifest disables app backup.
- The app requests a Class 3 strong biometric—normally the S23 Ultra fingerprint sensor—before loading local records.
- Private, public, AI, and publishing data types and modules are separated.
- AI requests are constructed only from chat input and an optional public draft.
- Publishing requests contain a narrowly shaped public manifest.
- The GitHub publishing token is entered at runtime, restricted to the website repository, and stored through Android SecureStore. It is not compiled into the APK.
- Live Site and Studio feeds are fetched from public `jevangoldsmith.com/api/v1` endpoints.
- Vault state is cleared from React state when the app backgrounds.
- Android application backup is disabled.
- Android `FLAG_SECURE` protection blocks screenshots, screen recordings, and Recents previews while the app is mounted.
- No analytics, advertising, session replay, or remote crash SDK is installed.
- Over-the-air updates are version-scoped application bundles; the updater has no vault repository, database, attachment, finance, or photo access path.
- The local “Developer Access” switch can skip biometric prompts when the phone owner explicitly enables it. This trades theft resistance for convenience and is stored only on the device.
- Android explicitly removes microphone, overlay, and broad external-storage permissions. Contacts permission remains narrowly enabled for the user-initiated address-book sync.
- Phone contact sync stores the opt-in in Android SecureStore. Ordinary address-book fields can sync in both directions, while private notes, groups, cadence, and conversation history never leave JGOLD's encrypted database.
- Contact-map placement is calculated offline from coarse city centres; addresses are not sent to a geocoding or map provider.
- The in-app website admits only the first-party HTTPS hosts. External navigation is restricted to HTTP(S), email, and telephone protocols.

## Required before storing irreplaceable data

This delivered project is a working MVP, not a completed independent security audit.

1. Verify on the physical S23 Ultra that Samsung Smart Switch, Google backup, and device-to-device transfer do not include the app’s private data when `allowBackup=false`.
2. Capture network traffic while exercising every vault feature.
3. Decide and implement the recovery posture: no backup, or an explicit encrypted manual export.
4. Use a fine-grained GitHub token limited to `JGOLD43/jevangoldsmith.com` with Contents read/write only; revoke it immediately if the phone is lost.
5. Complete an external review of SQLCipher key handling, screenshots/app-switcher behaviour, logs, temporary image files, and database migrations.
6. Add authenticated AI gateway deployment before enabling frontier-model requests.

## AI boundary

The mobile AI service cannot query the vault repository. General AI chat sends what is typed in the chat. Draft-assisted chat adds only the selected `PublicDraft`.

A frontier cloud provider still receives whatever is sent to it. Therefore the current design uses frontier models for general or public work, and reserves future private-data intelligence for on-device models.

## Threat-model limits

The app does not claim to protect against a rooted/compromised operating system, a second camera photographing the display, or an attacker using an already unlocked phone. It is designed for a normally secured, current Galaxy S23 Ultra.
