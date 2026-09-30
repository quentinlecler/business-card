import { test, expect } from '@playwright/test';
import { auditLayout, waitForI18n } from './helpers';

// UI regressions, checked with geometry (bounding boxes), not screenshots: nothing sticks out of its card,
// no horizontal scroll, nav controls neither overlap nor wrap. EN/FR × light/dark × phone → desktop widths.
// Not covered: aesthetics, contrast, spacing — look at the page for that.
for (const lang of ['en', 'fr']) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [320, 375, 414, 768, 1024, 1280]) {
      test.describe(`${lang} / ${colorScheme} / ${width}px`, () => {
        test.use({ viewport: { width, height: 800 }, colorScheme, reducedMotion: 'reduce' });

        test('nothing overflows, sticks out of its card or overlaps in the nav', async ({ page }) => {
          await page.goto(`/?lang=${lang}`);
          await waitForI18n(page);
          await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('visible', 'in', 'revealed')));
          for (const header of await page.$$('.exp-card:not(.open) .exp-header')) await header.click(); // measure the accordion content too
          await page.waitForTimeout(700);
          expect(await auditLayout(page)).toEqual([]);
        });
      });
    }
  }
}
