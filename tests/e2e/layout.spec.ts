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

      test('every experience card shows its whole content once opened (nothing clipped by the accordion)', async ({ page }) => {
        await page.goto(`/?lang=${lang}`);
        await waitForI18n(page);
        await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('visible', 'in', 'revealed')));
        await page.addStyleTag({ content: '.exp-body{transition:none !important}' }); // measure the final height, not the animation
        const count = await page.locator('.exp-card').count();
        for (let i = 0; i < count; i++) {
          const card = page.locator('.exp-card').nth(i);
          if (!(await card.evaluate((c) => c.classList.contains('open')))) await card.locator('.exp-header').click();
          const clipped = await card.evaluate((c) => {
            const body = c.querySelector('.exp-body')!.getBoundingClientRect();
            const tags = c.querySelector('.exp-tags')!.getBoundingClientRect();
            return Math.round(tags.bottom - body.bottom);
          });
          expect(clipped, `card ${i} is clipped by ${clipped}px`).toBeLessThanOrEqual(0);
        }
      });
    });
  }
}
