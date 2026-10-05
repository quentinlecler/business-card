import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { collectProblems, waitForI18n } from './helpers';

const fr = JSON.parse(readFileSync(new URL('../../i18n/fr.json', import.meta.url), 'utf8'));

const state = (page) =>
  page.evaluate(() => ({
    lang: document.documentElement.lang,
    btn: document.getElementById('langBtn')!.textContent,
    title: document.title,
    cv: [...document.querySelectorAll('[data-i18n-attr*="attr.cv_url"]')].map((a) => a.getAttribute('href')),
    stored: localStorage.getItem('ql-lang'),
  }));
const texts = (page) => page.evaluate(() => [...document.querySelectorAll('[data-i18n]')].map((e) => e.innerHTML.replace(/\s+/g, ' ').trim()));
const switchLang = async (page) => {
  const before = await page.evaluate(() => document.documentElement.lang);
  await page.click('#langBtn');
  await page.waitForFunction((l) => document.documentElement.lang !== l, before);
};

test.describe('English browser', () => {
  test.use({ locale: 'en-US' });
  test('shows the English page and the English CV, without any error', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await waitForI18n(page);
    const s = await state(page);
    expect(s.lang).toBe('en');
    expect(s.btn).toBe('FR');
    expect(s.title).toContain('Senior Full-Stack Developer');
    expect(s.cv).toEqual(['/resume/quentin-lecler-cv-en.pdf', '/resume/quentin-lecler-cv-en.pdf']);
    expect(problems).toEqual([]);
  });
});

test.describe('French browser (fr-CA)', () => {
  test.use({ locale: 'fr-CA' });
  test('shows the French page and the French CV, without any error', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await waitForI18n(page);
    const s = await state(page);
    expect(s.lang).toBe('fr');
    expect(s.btn).toBe('EN');
    expect(s.title).toContain('Développeur full-stack senior');
    expect(s.cv).toEqual(['/resume/quentin-lecler-cv-fr.pdf', '/resume/quentin-lecler-cv-fr.pdf']);
    expect(problems).toEqual([]);
  });

  test('renders every data-i18n element from fr.json (nothing left in English)', async ({ page }) => {
    await page.goto('/');
    await waitForI18n(page);
    const rendered: [string, string][] = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-i18n]')].map((e) => [e.dataset.i18n!, e.innerHTML.replace(/\s+/g, ' ').trim()]));
    expect(rendered.length).toBeGreaterThan(50);
    for (const [key, html] of rendered) expect(html, `"${key}" not rendered from fr.json`).toBe(fr[key]);
  });
});

test.describe('language choice', () => {
  test.use({ locale: 'en-US' });

  test('?lang=fr overrides the browser language and is remembered', async ({ page }) => {
    await page.goto('/?lang=fr');
    await waitForI18n(page);
    const s = await state(page);
    expect(s.lang).toBe('fr');
    expect(s.stored).toBe('fr');
  });

  test('switching EN → FR → EN works, survives a reload, and restores the English text exactly', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await waitForI18n(page);
    const original = await texts(page);

    await switchLang(page);
    let s = await state(page);
    expect([s.lang, s.btn, s.stored]).toEqual(['fr', 'EN', 'fr']);
    expect(s.cv).toEqual(['/resume/quentin-lecler-cv-fr.pdf', '/resume/quentin-lecler-cv-fr.pdf']);
    expect(await texts(page)).not.toEqual(original);

    await page.reload();
    await page.waitForFunction(() => document.getElementById('langBtn')!.textContent === 'EN'); // translations applied and switch bound
    expect((await state(page)).lang).toBe('fr');

    await switchLang(page);
    s = await state(page);
    expect([s.lang, s.btn, s.stored]).toEqual(['en', 'FR', 'en']);
    expect(s.cv).toEqual(['/resume/quentin-lecler-cv-en.pdf', '/resume/quentin-lecler-cv-en.pdf']);
    expect(await texts(page)).toEqual(original);
    expect(problems).toEqual([]);
  });
});
