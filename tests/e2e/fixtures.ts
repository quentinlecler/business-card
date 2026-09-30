import { test as base, expect } from '@playwright/test';

// Every e2e test uses this `test`: requests to third parties (Google reCAPTCHA…) are answered locally, so the tests
// never depend on the network and never fail because an external service is slow, blocked or offline.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route((url) => url.hostname !== 'localhost', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await use(page);
  },
});

export { expect };
