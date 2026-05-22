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

// Person-name normalization. Must match PersonCard.astro so SSR'd
// data-person-id values line up with the runtime peopleById map. Changing
// this without changing both is a silent regression, covered by tests.
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
