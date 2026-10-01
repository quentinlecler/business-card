import { test, expect } from './fixtures';
import { waitForI18n } from './helpers';

// Every link of the "public work" section must point to a public page and open safely in a new tab.
const LINKS = [
  'https://doctipro.lu',
  'https://logiciel-ophtalmologie.lu',
  'https://lunch.brunswick-marine.com/',
  'https://simsy.lu',
  'https://anysoft.lu',
  'https://www.leemanskredieten.be/lenen/tariefplannen/reno-plan-leemans/',
  'https://clicredit.be/',
  'https://wallfin.be/',
  'https://www.euro-finances.be/fr/',
  'https://github.com/quentinlecler/business-card',
];

for (const lang of ['en', 'fr']) {
  test.describe(`public work section (${lang})`, () => {
    test('is in the nav, shows the six cards and only the expected links', async ({ page }) => {
      await page.goto(`/?lang=${lang}`);
      await waitForI18n(page);
      await expect(page.locator('#navLinks a[href="#projects"]')).toHaveCount(1);
      await expect(page.locator('#projects .work-card')).toHaveCount(6);
      const hrefs = await page.$$eval('#projects a', (links) => links.map((a) => a.getAttribute('href')));
      expect(new Set(hrefs)).toEqual(new Set(LINKS));
    });

    test('opens every external link in a new tab with rel=noopener', async ({ page }) => {
      await page.goto(`/?lang=${lang}`);
      await waitForI18n(page);
      const bad = await page.$$eval('#projects a', (links) => links.filter((a) => a.getAttribute('target') !== '_blank' || !/\bnoopener\b/.test(a.getAttribute('rel') || '')).map((a) => a.getAttribute('href')));
      expect(bad).toEqual([]);
    });
  });
}

test('the Anysoft cards quote the recommendation letter, in both languages, with attribution', async ({ page }) => {
  for (const lang of ['en', 'fr']) {
    await page.goto(`/?lang=${lang}`);
    await waitForI18n(page);
    await expect(page.locator('#projects .work-quote')).toHaveCount(2);
    for (const source of await page.locator('#projects .work-quote-src').allInnerTexts()) expect(source).toContain('Anysoft S.A.');
  }
});

test('the section content is translated (French differs from English)', async ({ page }) => {
  const text = async (lang: string) => {
    await page.goto(`/?lang=${lang}`);
    await waitForI18n(page);
    return page.locator('#projects').innerText();
  };
  const en = await text('en');
  const fr = await text('fr');
  expect(en).toContain('Public work');
  expect(fr).toContain('Réalisations publiques');
  expect(fr).not.toEqual(en);
});

test.describe('hero', () => {
  for (const lang of ['en', 'fr']) {
    test(`links to the public work and the CV, and says where Quentin is (${lang})`, async ({ page }) => {
      await page.goto(`/?lang=${lang}`);
      await waitForI18n(page);
      await expect(page.locator('#hero a[href="#projects"]')).toBeVisible();
      await expect(page.locator('#hero a.hero-cv-link')).toBeVisible();
      await expect(page.locator('#hero .hero-desc')).toContainText(lang === 'en' ? 'open to relocation' : 'ouvert à la relocalisation');
      await page.click('#hero a[href="#projects"]');
      await expect(page.locator('#projects')).toBeInViewport();
    });
  }
});
