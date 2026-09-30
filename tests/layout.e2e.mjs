// Browser tests of the layout (UI regressions): no horizontal scroll, nothing sticking out of its card,
// nav controls not overlapping, in EN/FR × light/dark × 320/375/768/1280 px. Run: npm run test:e2e
// Layout is checked with geometry (bounding boxes), not screenshots: robust across machines, no baselines to maintain.
// What it can NOT judge: aesthetics, contrast, spacing — look at the page for that.
import { test, before, after } from 'node:test';
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
