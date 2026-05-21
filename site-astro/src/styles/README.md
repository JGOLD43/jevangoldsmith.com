# CSS source

`legacy.src.css` is the readable, hand-edit-friendly source for the site's
global stylesheet. It is **not** consumed by the build directly.

## Authoritative output

`site-astro/public/css/legacy-style.css` is the file the build pipeline
reads (purged per-page, extracted-into-critical, hashed-into-chrome). It
is currently shipped as-is.

## Editing flow

1. Edit `legacy.src.css`
2. Run `node scripts/build-legacy-css.js` to regenerate the minified output
3. Run `npm run build` to verify chrome.css + per-page CSS still validate
4. Run visual diff (`UPDATE_SNAPSHOTS=1 npm run test:browser` only if
   intentional visual change)

## Future migration

The path away from a single global stylesheet is to:

1. Split `legacy.src.css` into semantic modules: `_vars.css`, `_reset.css`,
   `_typography.css`, `_nav.css`, `_layout.css`, `_cards.css`,
   `_modals.css`, `_forms.css`, `_utilities.css`, `_vendor.css`
2. Stub scoped Astro components (`Navigation.astro`, `Modal.astro`, ...)
   importing their relevant module via `<style>` blocks
3. Migrate pages one at a time, removing rules from `legacy.src.css` as
   each component takes over
4. Rewrite `scripts/extract-critical-css.js` to walk Astro's emitted CSS
   chunks instead of regex over `chrome.css`
5. Delete `legacy.src.css` once empty

Each step must pass the Playwright visual diff (now desktop + tablet +
mobile, see `site-astro/tests/playwright/visual.spec.ts`) before merging.

## Why this exists as foundation only

The previous reflexive migration attempt was blocked by lack of source CSS.
This file unblocks it. Wiring the minifier into the build pipeline is a
separate change that requires verifying chrome.css hash stability under
the lightningcss output (which is ~15KB smaller than the legacy
hand-minified file, so the hash will change once and then stay stable).
