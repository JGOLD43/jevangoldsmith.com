// Recursive directory walker — replaces the per-script copy that used to
// live in 9 build scripts. Returns absolute file paths.
const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

module.exports = { walk };
