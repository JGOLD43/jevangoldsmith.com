const { spawnSync } = require('child_process');
const { walk, createReporter } = require('./check/harness');

const reporter = createReporter('check-js');
const files = [
  ...walk('js', { predicate: (f) => f.endsWith('.js') }),
  ...walk('admin/js', { predicate: (f) => f.endsWith('.js') })
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) reporter.fail(result.stderr || result.stdout);
}

reporter.ok(`JS syntax OK (${files.length} files).`);
