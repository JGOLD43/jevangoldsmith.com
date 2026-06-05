// Inlined icon sprite. Read once at build time from the generated
// public/sprite.svg and injected into every page (hidden) by Base.astro, so
// <use href="#icon-x"> references resolve same-document and icons paint with
// the initial HTML — no separate sprite.svg fetch that pops in after first
// paint (the old external `/sprite.svg#…` refs caused that on mobile).
//
// The sprite is generated before the Astro build: by the `dev` npm script for
// local, and the `sprite:public` step in scripts/build.js for prod.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const spritePath = fileURLToPath(new URL('../../public/sprite.svg', import.meta.url));

export const inlineSprite: string = readFileSync(spritePath, 'utf8');
