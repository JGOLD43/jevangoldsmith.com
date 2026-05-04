// Phase 4 slice 4.1: Playwright behavioral smoke harness.
//
// Drives a real Chromium against the dist served by `npx http-server dist`
// on port 8765 and asserts hydrated state — not just structural anchors.
// Catches the kind of regression where a page loads bytes but client JS
// throws before reaching its render path.

import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE || 'http://localhost:8765';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // fullyParallel + retries=1 absorbs occasional flake from concurrent
  // workers hitting the same http-server (rare race on adventures' lazy
  // map import).
  fullyParallel: true,
  // Cap parallelism to reduce concurrent-load races against the static
  // http-server fixture (adventures lazy-import + multiple workers
  // hitting the same chunk has shown flake at >2 workers).
  workers: 2,
  retries: 2,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
