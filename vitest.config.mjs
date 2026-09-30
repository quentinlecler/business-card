import { defineConfig } from 'vitest/config';

// Static checks (*.test.mjs) and browser checks (*.e2e.mjs, headless Chromium + throw-away static server).
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,e2e}.mjs'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
