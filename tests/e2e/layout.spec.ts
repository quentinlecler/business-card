import { test, expect } from './fixtures';
import { auditLayout, waitForI18n } from './helpers';

// UI regressions, checked with geometry (bounding boxes), not screenshots: nothing sticks out of its card,
// no horizontal scroll, nav controls neither overlap nor wrap. EN/FR × phone → desktop widths.
// One colour scheme only: colours do not change the geometry (the phone tests cover light and dark).
// Not covered: aesthetics, contrast, spacing — look at the page for that.
for (const lang of ['en', 'fr']) {
  for (const width of [320, 375, 768, 1024, 1280]) {
    test.describe(`${lang} / ${width}px`, () => {
      test.use({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });

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
