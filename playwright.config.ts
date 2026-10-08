import { defineConfig, devices } from '@playwright/test';

const PORT = 6007;

/**
 * End-to-end checks that run against the built Storybook (`pnpm --filter @axon/docs build`):
 *  - tests/a11y: axe-core on every story, in light and dark mode (`pnpm test:a11y`)
 *  - tests/visual: screenshots of representative stories, light and dark (`pnpm test:visual`)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 4 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  // Baselines get the platform in their name, so Linux CI and a developer's laptop never compare.
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{arg}-{platform}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1000, height: 800 },
    reducedMotion: 'reduce',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  webServer: {
    command: `node tooling/serve-static.mjs apps/docs/storybook-static ${PORT}`,
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
