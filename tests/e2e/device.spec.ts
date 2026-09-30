import { test, expect } from './fixtures';
import { auditLayout, exerciseBurgerMenu, scrollToBottom, waitForI18n } from './helpers';

// Runs in the "pixel" project (Pixel 7 emulation: mobile viewport, touch, device pixel ratio, mobile user agent).
for (const lang of ['en', 'fr']) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`Pixel 7 / ${lang} / ${colorScheme}`, () => {
      test.use({ colorScheme });

      test('scrolls to the bottom without horizontal scroll, and the burger menu works', async ({ page }) => {
        await page.goto(`/?lang=${lang}`);
        await waitForI18n(page);
        expect(await scrollToBottom(page)).toEqual([]);
        expect(await auditLayout(page)).toEqual([]);
        expect(await exerciseBurgerMenu(page)).toEqual([]);
      });
    });
  }
}
