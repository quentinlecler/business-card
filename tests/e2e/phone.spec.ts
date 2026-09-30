import { test, expect } from './fixtures';
import { auditLayout, exerciseBurgerMenu, scrollToBottom, waitForI18n } from './helpers';

// What a visitor does on a phone: scroll for real to the very bottom (no forced classes), then open and close the burger menu.
// Regression guard for: horizontal scroll appearing at the bottom of the page, a broken mobile menu.
for (const lang of ['en', 'fr']) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [320, 375, 414]) {
      test.describe(`${lang} / ${colorScheme} / ${width}px`, () => {
        test.use({ viewport: { width, height: 700 }, colorScheme, hasTouch: true });

        test('scrolls to the bottom without horizontal scroll, and the burger menu works', async ({ page }) => {
          await page.goto(`/?lang=${lang}`);
          await waitForI18n(page);
          expect(await scrollToBottom(page)).toEqual([]);
          expect(await auditLayout(page), 'layout at the bottom of the page').toEqual([]);
          expect(await exerciseBurgerMenu(page)).toEqual([]);
        });
      });
    }
  }
}
