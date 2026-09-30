import { test, expect } from '@playwright/test';

const isLight = (page) => page.evaluate(() => document.body.classList.contains('light'));

test.describe('theme', () => {
  test.describe('system in light mode', () => {
    test.use({ colorScheme: 'light' });
    test('starts light', async ({ page }) => {
      await page.goto('/');
      expect(await isLight(page)).toBe(true);
    });
    test('a saved dark choice wins over the system', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('ql-theme', 'dark'));
      await page.goto('/');
      expect(await isLight(page)).toBe(false);
    });
  });

  test.describe('system in dark mode', () => {
    test.use({ colorScheme: 'dark' });
    test('starts dark', async ({ page }) => {
      await page.goto('/');
      expect(await isLight(page)).toBe(false);
    });
    test('a saved light choice wins over the system', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('ql-theme', 'light'));
      await page.goto('/');
      expect(await isLight(page)).toBe(true);
    });
    test('follows the system live when the visitor never chose', async ({ page }) => {
      await page.goto('/');
      expect(await isLight(page)).toBe(false);
      await page.emulateMedia({ colorScheme: 'light' });
      await expect.poll(() => isLight(page)).toBe(true);
    });
    test('the toggle button switches the theme and remembers the choice', async ({ page }) => {
      await page.goto('/');
      await page.click('#themeBtn');
      expect(await isLight(page)).toBe(true);
      expect(await page.evaluate(() => localStorage.getItem('ql-theme'))).toBe('light');
      await page.reload();
      expect(await isLight(page)).toBe(true);
    });
  });
});
