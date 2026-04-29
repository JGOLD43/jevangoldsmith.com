const { spawn } = require('child_process');

const SEQUENTIAL_PHASES = [
  ['check:repo', 'check:source', 'check:structure'],
  ['check:build']
];

const PARALLEL_PHASE = [
  'check:seo',
  'check:js',
  'check:lint',
  'check:deadcode',
  'check:content',
  'check:links',
  'check:deploy',
  'check:api',
  'check:performance',
  'check:assets',
  'check:page-baselines',
  'check:docs',
  'check:smoke'
];

function run(name) {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', '--silent', name], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => resolve({ name, code, stdout, stderr }));
  });
}

async function runSequence(names) {
  const results = [];
  for (const name of names) {
    const result = await run(name);
    process.stdout.write(`[${name}] ${result.stdout}`);
    if (result.stderr) process.stderr.write(`[${name}] ${result.stderr}`);
    results.push(result);
    if (result.code !== 0) return results;
  }
  return results;
}

async function runParallel(names) {
  const results = await Promise.all(names.map(run));
  for (const result of results) {
    process.stdout.write(`[${result.name}] ${result.stdout}`);
    if (result.stderr) process.stderr.write(`[${result.name}] ${result.stderr}`);
  }
  return results;
}

(async () => {
  for (const phase of SEQUENTIAL_PHASES) {
    const results = await runSequence(phase);
    if (results.some((result) => result.code !== 0)) {
      const failed = results.filter((r) => r.code !== 0).map((r) => r.name);
      console.error(`\nCheck phase failed: ${failed.join(', ')}`);
      process.exit(1);
    }
  }

  const results = await runParallel(PARALLEL_PHASE);
  const failures = results.filter((result) => result.code !== 0);
  if (failures.length > 0) {
    console.error(`\nFailed checks: ${failures.map((r) => r.name).join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
