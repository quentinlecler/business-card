import { defineConfig } from 'vitest/config';

// Unit tests only (no browser). End-to-end tests live in tests/e2e and run with Playwright (playwright.config.ts).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
