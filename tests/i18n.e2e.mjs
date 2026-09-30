// Browser tests of the language switch (FR/EN). Run: npm run test:e2e
// Uses the project-local Chromium (see CLAUDE.md > Browser Automation), headless, with a throw-away static server.
import { test, beforeAll as before, afterAll as after } from 'vitest';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };

function chromePath() {
  const dir = join(ROOT, 'node_modules/playwright-core/.local-browsers');
  if (!existsSync(dir)) return null;
  const c = readdirSync(dir).find((d) => d.startsWith('chromium-'));
  return c ? join(dir, c, 'chrome-linux64/chrome') : null;
}

let server, browser, base;

before(async () => {
  const exe = chromePath();
  assert.ok(exe && existsSync(exe), 'Chromium not installed — run: PLAYWRIGHT_BROWSERS_PATH=0 npx --no-install playwright-cli install-browser chrome-for-testing');
  server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    const file = join(ROOT, p === '/' ? 'index.html' : p);
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch({ executablePath: exe });
});
after(async () => { await browser?.close(); server?.close(); });

async function open(url, { locale = 'en-US', width = 1200 } = {}) {
  const ctx = await browser.newContext({ locale, viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
  await page.goto(base + url);
  await page.waitForFunction(() => window.i18next?.isInitialized && !document.documentElement.classList.contains('i18n-pending'));
  return { ctx, page, problems };
}
const state = (page) => page.evaluate(() => ({
  lang: document.documentElement.lang,
  btn: document.getElementById('langBtn').textContent,
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

test('English browser: English page, English CV, no error', async () => {
  const { ctx, page, problems } = await open('/');
  const s = await state(page);
  assert.equal(s.lang, 'en');
  assert.equal(s.btn, 'FR');
  assert.ok(s.title.includes('Senior Full-Stack Developer'));
  assert.deepEqual(s.cv, ['/quentin-lecler-cv.pdf', '/quentin-lecler-cv.pdf']);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('French browser (fr-CA): French page, French CV, no error', async () => {
  const { ctx, page, problems } = await open('/', { locale: 'fr-CA' });
  const s = await state(page);
  assert.equal(s.lang, 'fr');
  assert.equal(s.btn, 'EN');
  assert.ok(s.title.includes('Développeur full-stack senior'));
  assert.deepEqual(s.cv, ['/quentin-lecler-cv-fr.pdf', '/quentin-lecler-cv-fr.pdf']);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('?lang=fr overrides the browser language and is remembered', async () => {
  const { ctx, page } = await open('/?lang=fr');
  assert.equal((await state(page)).lang, 'fr');
  assert.equal((await state(page)).stored, 'fr');
  await ctx.close();
});

test('switch EN → FR → EN, choice survives a reload, and English text is restored exactly', async () => {
  const { ctx, page, problems } = await open('/');
  const original = await texts(page);

  await switchLang(page);
  let s = await state(page);
  assert.deepEqual([s.lang, s.btn, s.stored], ['fr', 'EN', 'fr']);
  assert.deepEqual(s.cv, ['/quentin-lecler-cv-fr.pdf', '/quentin-lecler-cv-fr.pdf']);
  assert.notDeepEqual(await texts(page), original);

  await page.reload();
  await page.waitForFunction(() => document.getElementById('langBtn').textContent === 'EN'); // translations applied and switch bound
  assert.equal((await state(page)).lang, 'fr');

  await switchLang(page);
  s = await state(page);
  assert.deepEqual([s.lang, s.btn, s.stored], ['en', 'FR', 'en']);
  assert.deepEqual(s.cv, ['/quentin-lecler-cv.pdf', '/quentin-lecler-cv.pdf']);
  assert.deepEqual(await texts(page), original);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('every data-i18n element is translated in French (none left in English)', async () => {
  const { ctx, page } = await open('/?lang=fr');
  const fr = JSON.parse(readFileSync(join(ROOT, 'i18n/fr.json'), 'utf8'));
  const rendered = await page.evaluate(() => [...document.querySelectorAll('[data-i18n]')].map((e) => [e.dataset.i18n, e.innerHTML.replace(/\s+/g, ' ').trim()]));
  for (const [key, html] of rendered) assert.equal(html, fr[key], `"${key}" not rendered from fr.json`);
  assert.ok(rendered.length > 50);
  await ctx.close();
});

test('mobile (375px): hamburger is the right-most control and the logo stays on one line', async () => {
  const { ctx, page } = await open('/', { width: 375 });
  const r = await page.evaluate(() => {
    const box = (s) => document.querySelector(s).getBoundingClientRect();
    return { burger: box('#hamburger').right, theme: box('#themeBtn').right, lang: box('#langBtn').right, logoH: box('.nav-logo').height, vw: innerWidth, sw: document.documentElement.scrollWidth };
  });
  assert.ok(r.burger > r.theme && r.theme > r.lang, JSON.stringify(r));
  assert.ok(r.logoH < 30, `logo wraps (height ${r.logoH})`);
  assert.ok(r.sw <= r.vw, 'horizontal scroll on mobile');
  await ctx.close();
});

test('both CV PDFs are served as PDF', async () => {
  for (const f of ['quentin-lecler-cv.pdf', 'quentin-lecler-cv-fr.pdf']) {
    const res = await fetch(`${base}/${f}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  }
});
