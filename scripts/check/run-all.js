const { spawn } = require('child_process');

const CHECKS = ['check:lint', 'check:build', 'check:links', 'check:page-baselines', 'check:smoke'];

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

(async () => {
  const results = await Promise.all(CHECKS.map(run));
  for (const result of results) {
    process.stdout.write(`[${result.name}] ${result.stdout}`);
    if (result.stderr) process.stderr.write(`[${result.name}] ${result.stderr}`);
  }
  const failures = results.filter((r) => r.code !== 0);
  if (failures.length > 0) {
    console.error(`\nFailed checks: ${failures.map((r) => r.name).join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
