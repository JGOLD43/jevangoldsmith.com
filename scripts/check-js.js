const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const roots = ['js', 'admin/js'];
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}

roots.forEach(walk);

let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures += 1;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (failures > 0) {
  console.error(`JS syntax check failed for ${failures} file(s).`);
  process.exit(1);
}

console.log(`JS syntax OK (${files.length} files).`);
