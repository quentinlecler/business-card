import { test, expect } from './fixtures';

// The hero types a rotating role. Switching language swaps the list of roles (window.__setRoles) while a word may be half typed.
test.describe('hero typed role', () => {
  test('keeps cycling when the roles are swapped while a longer word is half typed', async ({ page }) => {
    await page.goto('/');
    const text = () => page.evaluate(() => document.getElementById('typedRole')!.textContent!.replace(/​/g, ''));
    await expect.poll(async () => (await text()).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(12); // mid-word
    await page.evaluate(() => (window as any).__setRoles(['Short', 'Other'])); // both shorter than what is typed
    await expect.poll(text, { timeout: 15_000, message: 'the typing animation froze' }).toBe('Other');
  });
});
