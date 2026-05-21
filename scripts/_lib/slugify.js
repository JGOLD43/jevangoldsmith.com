// Shared slug helpers. Single source of truth so merge-people, validators,
// and any downstream tooling produce byte-identical slugs.

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Person-name normalization. Must match site-astro/src/lib/person-card.ts
// normalizePersonName so SSR'd data-person-id values line up with the
// runtime peopleById map. Changing this without changing both is a silent
// regression — covered by tests/unit/slugify.test.js.
function normalizePersonName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify, normalizePersonName };
