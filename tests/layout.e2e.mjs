// Browser tests of the layout (UI regressions): no horizontal scroll, nothing sticking out of its card,
// nav controls not overlapping, in EN/FR × light/dark × 320/375/768/1280 px. Run: npm run test:e2e
// Layout is checked with geometry (bounding boxes), not screenshots: robust across machines, no baselines to maintain.
// What it can NOT judge: aesthetics, contrast, spacing — look at the page for that.
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

// parent selector → children that must stay inside it
const CONTAINMENT = {
  '.container': ['.bento-card', '.exp-card', '.edu-card', '.contact-form', '.contact-grid > *', '.about-langs-row', '.hero-actions', '.hero-stack', '.stat'],
  '.contact-form': ['.form-row', '.form-field', 'input:not([type=radio]):not([type=checkbox])', 'textarea', '.form-pills', '.form-consent', 'button[type=submit]'],
  '.form-row': ['.form-field'],
  '.contact-grid > *:not(.contact-form)': ['.contact-link'],
  '.contact-link': ['.contact-link-lbl', '.contact-link-val', '.arrow'],
  '.bento-card': ['.bento-top', '.bento-title', '.bento-desc'],
  '.exp-card': ['.exp-header', '.exp-body', '.exp-bullets', '.exp-tags'],
  '.edu-card': ['.edu-type', '.edu-title', '.edu-school', '.edu-dates'],
  '.stat': ['.stat-num', '.stat-label'],
  '.about-langs-row': ['.about-lang', '.about-langs-title'],
};

async function audit(page) {
  return page.evaluate((containment) => {
    const T = 1.5;
    const out = [];
    const vw = document.documentElement.clientWidth;
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
    if (document.documentElement.scrollWidth > vw + T) out.push(`horizontal scroll: page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);
    for (const [parentSel, childSels] of Object.entries(containment)) {
      for (const parent of document.querySelectorAll(parentSel)) {
        if (!shown(parent)) continue;
        const p = parent.getBoundingClientRect();
        for (const cs of childSels) {
          for (const child of parent.querySelectorAll(cs)) {
            if (child === parent || !shown(child)) continue;
            const c = child.getBoundingClientRect();
            if (c.left < p.left - T || c.right > p.right + T) out.push(`${label(child)} [${Math.round(c.left)}–${Math.round(c.right)}] sticks out of ${label(parent)} [${Math.round(p.left)}–${Math.round(p.right)}]`);
          }
        }
      }
    }
    // Nav: every visible control stays on screen and controls do not overlap horizontally.
    const nav = [...document.querySelectorAll('.nav-logo, .nav-right > *, .nav-links > a')].filter((e) => shown(e) && e.getBoundingClientRect().left >= 0);
    const rects = nav.map((e) => [e, e.getBoundingClientRect()]);
    for (const [e, r] of rects) if (r.right > vw + T) out.push(`nav ${label(e)} goes off screen (right=${Math.round(r.right)} > ${vw})`);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [a, ra] = rects[i], [b, rb] = rects[j];
      if (a.contains(b) || b.contains(a)) continue;
      const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (overlapX > T && overlapY > T) out.push(`nav ${label(a)} overlaps ${label(b)}`);
    }
    for (const l of document.querySelectorAll('.nav-links > li > a, .nav-links > a')) if (shown(l) && l.getBoundingClientRect().height > 30 && l.getBoundingClientRect().left >= 0 && getComputedStyle(l).position !== 'fixed') out.push(`nav link "${l.textContent.trim()}" wraps onto several lines`);
    const logo = document.querySelector('.nav-logo');
    if (logo && logo.getBoundingClientRect().height > 40) out.push('nav logo wraps onto several lines');
    return out;
  }, CONTAINMENT);
}

for (const lang of ['en', 'fr']) for (const scheme of ['light', 'dark']) for (const width of [320, 375, 768, 1280]) {
  test(`layout ${lang} / ${scheme} / ${width}px: nothing overflows`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion: 'reduce' });
    try {
      const page = await ctx.newPage();
      await page.goto(`${base}/?lang=${lang}`);
      await page.waitForFunction(() => window.i18next?.isInitialized && !document.documentElement.classList.contains('i18n-pending'));
      // Reveal everything and open every accordion so hidden content is measured too.
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('visible', 'in', 'revealed')));
      for (const h of await page.$$('.exp-card:not(.open) .exp-header')) await h.click();
      await page.waitForTimeout(700);
      assert.deepEqual(await audit(page), []);
    } finally { await ctx.close(); }
  });
}

// Real behaviour on a phone: scroll for real (no forced classes) down to the very bottom, then open the burger menu.
// Regression guard for: horizontal scroll appearing at the bottom of the page, broken mobile menu.
for (const lang of ['en', 'fr']) for (const scheme of ['light', 'dark']) for (const width of [320, 375, 414]) {
  test(`phone ${lang} / ${scheme} / ${width}px: real scroll to the bottom, then burger menu`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 700 }, colorScheme: scheme, hasTouch: true });
    try {
      const page = await ctx.newPage();
      await page.goto(`${base}/?lang=${lang}`);
      await page.waitForFunction(() => window.i18next?.isInitialized && !document.documentElement.classList.contains('i18n-pending'));
      const widths = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, x: Math.round(scrollX) }));
      const problems = [];
      for (let i = 0; i < 80; i++) {
        await page.mouse.wheel(0, 350);
        await page.waitForTimeout(60);
        const w = await widths();
        if (w.sw > w.cw + 1 || w.x !== 0) { problems.push(`horizontal scroll while scrolling (step ${i}): scrollWidth ${w.sw} > ${w.cw}, scrollX ${w.x}`); break; }
        if (await page.evaluate(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight)) break;
      }
      await page.waitForTimeout(600);
      const bottom = await widths();
      if (bottom.sw > bottom.cw + 1) problems.push(`horizontal scroll at the bottom: scrollWidth ${bottom.sw} > ${bottom.cw}`);
      assert.deepEqual(await audit(page), [], 'layout at the bottom of the page');
      // Burger menu
      await page.evaluate(() => scrollTo(0, 0));
      await page.click('#hamburger');
      await page.waitForTimeout(500);
      const menu = await page.evaluate(() => {
        const nav = document.getElementById('navLinks');
        const links = [...nav.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().width > 0);
        const vw = document.documentElement.clientWidth, vh = innerHeight;
        return {
          open: nav.classList.contains('open'),
          links: links.length,
          offscreen: links.filter((a) => { const r = a.getBoundingClientRect(); return r.left < 0 || r.right > vw + 1 || r.bottom > vh + 1 || r.top < 0; }).map((a) => a.textContent.trim()),
          sw: document.documentElement.scrollWidth, cw: vw,
          burger: (() => { const r = document.getElementById('hamburger').getBoundingClientRect(); return r.left >= 0 && r.right <= vw + 1; })(),
        };
      });
      if (!menu.open) problems.push('burger menu did not open');
      if (menu.links < 4) problems.push(`burger menu shows ${menu.links} links (expected ≥ 4)`);
      if (menu.offscreen.length) problems.push(`burger menu links off screen: ${menu.offscreen.join(', ')}`);
      if (menu.sw > menu.cw + 1) problems.push(`horizontal scroll with the menu open: ${menu.sw} > ${menu.cw}`);
      if (!menu.burger) problems.push('burger / close button is off screen');
      await page.click('#hamburger');
      await page.waitForTimeout(300);
      if (await page.evaluate(() => document.getElementById('navLinks').classList.contains('open'))) problems.push('burger menu did not close');
      assert.deepEqual(problems, []);
    } finally { await ctx.close(); }
  });
}

test('theme follows the system preference, and a saved choice wins', async () => {
  const isLight = async (scheme, saved) => {
    const ctx = await browser.newContext({ colorScheme: scheme });
    try {
      const page = await ctx.newPage();
      if (saved) await page.addInitScript((v) => localStorage.setItem('ql-theme', v), saved);
      await page.goto(base + '/');
      return await page.evaluate(() => document.body.classList.contains('light'));
    } finally { await ctx.close(); }
  };
  assert.equal(await isLight('light'), true);
  assert.equal(await isLight('dark'), false);
  assert.equal(await isLight('light', 'dark'), false);
  assert.equal(await isLight('dark', 'light'), true);
});
