// Inlined icon sprite. Read once at build time from the generated
// public/sprite.svg and injected into every page (hidden) by Base.astro, so
// <use href="#icon-x"> references resolve same-document and icons paint with
// the initial HTML — no separate sprite.svg fetch that pops in after first
// paint (the old external `#…` refs caused that on mobile).
//
// The sprite is generated before the Astro build: by the `dev` npm script for
// local, and the `sprite:public` step in scripts/build.js for prod. Astro runs
// with cwd = site-astro/ in both dev and build, so resolve from process.cwd()
// (import.meta.url points at the bundled module location under Vite, not here).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const spritePath = join(process.cwd(), 'public', 'sprite.svg');

export const inlineSprite: string = readFileSync(spritePath, 'utf8');
