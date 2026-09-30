import { test, expect } from './fixtures';

const fillAndSubmit = (page) =>
  page.evaluate(() => {
    const form = document.getElementById('contactForm') as HTMLFormElement;
    for (const f of form.querySelectorAll<HTMLInputElement>('[required]')) {
      if (f.type === 'checkbox') f.checked = true;
      else f.value = f.type === 'email' ? 'recruiter@example.com' : 'x';
    }
    form.requestSubmit();
  });

test.describe('contact form', () => {
  test('sends the message and re-enables the button (formspree mocked)', async ({ page }) => {
    await page.route('**/formspree.io/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.goto('/');
    await fillAndSubmit(page);
    await expect(page.locator('#contactFormStatus')).toContainText(/sent|envoyé/i);
    await expect(page.locator('#contactForm button[type=submit]')).toBeEnabled();
  });

  test('still works when i18n/loader.js could not be loaded (stale cache, blocker, network)', async ({ page }) => {
    await page.route('**/i18n/loader.js', (route) => route.abort());
    await page.route('**/formspree.io/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.goto('/');
    await fillAndSubmit(page);
    await expect(page.locator('#contactFormStatus')).toContainText('Message sent'); // English fallback text
    await expect(page.locator('#contactForm button[type=submit]')).toBeEnabled();
  });

  test('shows an error and re-enables the button when Formspree fails', async ({ page }) => {
    await page.route('**/formspree.io/**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
    await page.goto('/');
    await fillAndSubmit(page);
    await expect(page.locator('#contactFormStatus')).toHaveClass(/error/);
    await expect(page.locator('#contactForm button[type=submit]')).toBeEnabled();
  });
});
