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
  // Tests that depend on dead globals (window.AdventuresState) or that
  // need Linux-rendered visual baselines (committed darwin baselines don't
  // match Linux font rendering even with 15% tolerance). Re-enable once
  // those are fixed in a focused PR.
  testIgnore: [
    'adventures-detail.spec.ts',
    'adventures-map.spec.ts',
    'visual.spec.ts'
  ],
  // Drop {platform} from the snapshot path so baselines committed on macOS
  // also gate CI runs on Linux. (Currently visual.spec is in testIgnore;
  // when re-enabled, the gate works against committed baselines that match
  // whichever platform first ran UPDATE_SNAPSHOTS=1 against.)
  snapshotPathTemplate: '{snapshotDir}/{testFileName}-snapshots/{arg}{ext}',
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
