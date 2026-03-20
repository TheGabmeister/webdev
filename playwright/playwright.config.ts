import { defineConfig } from '@playwright/test';
import path from 'path';

const testsDir = path.resolve(__dirname, 'tests');

export default defineConfig({
  testDir: './tests',
  // Run tests in parallel
  fullyParallel: true,
  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,
  // Reporter: list in terminal, HTML report for detailed review
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Base URL — points to the local HTML file
    baseURL: `file:///${testsDir.replace(/\\/g, '/')}/`,
    // Capture screenshot on failure for debugging
    screenshot: 'only-on-failure',
    // Record trace on first retry for debugging
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
