import { defineConfig, devices } from '@playwright/test';

// The project-local Chromium lives in node_modules (see CLAUDE.md > Browser Automation); CI installs it there too.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // a failing test is a failure: no retry to hide flakiness
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /device\.spec\.ts/ },
    { name: 'pixel', use: { ...devices['Pixel 7'] }, testMatch: /device\.spec\.ts/ },
  ],
  webServer: {
    command: `node tests/e2e/server.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
