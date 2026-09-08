'use strict';

async function main() {
  const expected = process.env.EXPECTED_SHA;
  if (!/^[a-f0-9]{40}$/.test(expected || '')) throw new Error('Expected release SHA is required');
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`https://jevangoldsmith.com/api/v1/release.json?jg_build=${expected}&attempt=${Date.now()}`, {
        cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (response.ok && (await response.json()).sha === expected) {
        console.log(`Custom domain serves release ${expected}`);
        return;
      }
    } catch { /* Pages propagation can briefly return the preceding deployment. */ }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Custom domain did not serve expected release ${expected} within two minutes`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
