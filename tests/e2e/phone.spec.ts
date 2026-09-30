import { devices } from '@playwright/test';
import { test, expect } from './fixtures';
import { auditLayout, exerciseBurgerMenu, scrollToBottom, waitForI18n } from './helpers';

// What a visitor does on a phone: scroll for real to the very bottom (no forced classes), then open and close the burger menu.
// Regression guard for: horizontal scroll appearing at the bottom of the page, a broken mobile menu.
async function visitLikeAPhoneUser(page, lang: string) {
  await page.goto(`/?lang=${lang}`);
  await waitForI18n(page);
  expect(await scrollToBottom(page)).toEqual([]);
  expect(await auditLayout(page), 'layout at the bottom of the page').toEqual([]);
  expect(await exerciseBurgerMenu(page)).toEqual([]);
}

for (const lang of ['en', 'fr']) {
  for (const width of [320, 390]) {
    test.describe(`${lang} / ${width}px`, () => {
      test.use({ viewport: { width, height: 700 }, colorScheme: 'dark', hasTouch: true });
      test('scrolls to the bottom without horizontal scroll, and the burger menu works', async ({ page }) => visitLikeAPhoneUser(page, lang));
    });
  }
}

test.describe('Pixel 7 emulation, dark theme', () => {
  const { defaultBrowserType: _ignored, ...pixel7 } = devices['Pixel 7'];
  test.use({ ...pixel7, colorScheme: 'dark' });
  test('scrolls to the bottom without horizontal scroll, and the burger menu works', async ({ page }) => visitLikeAPhoneUser(page, 'fr'));
});
