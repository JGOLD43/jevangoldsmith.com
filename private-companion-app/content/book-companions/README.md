# Offline book companions

The catalog contains 24 independent analytical essays for the library’s Who Am I? collection. Essays are original interpretations, not author text or the user’s personal opinions. Each essay names its source coverage and distinguishes an author’s claims from critical assessment. Some use local primary text; others are thematic companions based on excerpts and established frameworks, not exhaustive edition-level close readings.

Edit the Markdown source, then run `node private-companion-app/scripts/build-book-companions.mjs` from the repository root. The generated JSON is bundled into Android updates. Keep title and author aliases explicit in `catalog.json`; short-title fuzzy matching can attach an essay to the wrong work. The Gicu alias is limited to the observed incorrect metadata on Life Without a Centre by Jeff Foster.

Book details render a separate companion card. It does not mutate the public review, private annotations, read status or collection membership. Readers can open any of the 24 essays, change text size, jump to sections and follow source links. All prose works offline; source websites need a connection.

Verification: `npm run verify` in `private-companion-app`. Catalog coverage tests include the titles and author strings observed in the installed collection. UI verification used the real component in a React Native Web harness at a phone-sized viewport (opening, section jumps, larger text, collection navigation and another essay). This is not a replacement for Android device verification.

Release through the repository Android-only `npm run release:app -- "Release message"` command. These additions require no native modules. This release is based on the separately released 1.5.4 native calendar runtime; a phone still on 1.5.3 needs the existing 1.5.4 installer before receiving this OTA.
