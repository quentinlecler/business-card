import type { Page } from '@playwright/test';

/** Waits until i18next has applied the translations and the page is revealed. */
export async function waitForI18n(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).i18next?.isInitialized && !document.documentElement.classList.contains('i18n-pending'));
}

/** Errors that must never happen on any page: uncaught exceptions, console errors, failed requests. */
export function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
  return problems;
}

/** parent selector → children that must stay inside it */
const CONTAINMENT: Record<string, string[]> = {
  '.container': ['.bento-card', '.exp-card', '.edu-card', '.work-card', '.contact-form', '.contact-grid > *', '.about-langs-row', '.hero-actions', '.hero-stack', '.stat'],
  '.contact-form': ['.form-row', '.form-field', 'input:not([type=radio]):not([type=checkbox])', 'textarea', '.form-pills', '.form-consent', 'button[type=submit]'],
  '.form-row': ['.form-field'],
  '.contact-grid > *:not(.contact-form)': ['.contact-link'],
  '.contact-link': ['.contact-link-lbl', '.contact-link-val', '.arrow'],
  '.bento-card': ['.bento-top', '.bento-title', '.bento-desc'],
  '.exp-card': ['.exp-header', '.exp-body', '.exp-bullets', '.exp-tags'],
  '.edu-card': ['.edu-type', '.edu-title', '.edu-school', '.edu-dates'],
  '.work-card': ['.edu-type', '.edu-title', '.work-desc', '.work-part', '.work-quote', '.work-tags', '.work-links', '.work-seen'],
  '.stat': ['.stat-num', '.stat-label'],
  '.about-langs-row': ['.about-lang', '.about-langs-title'],
};

/**
 * Geometry audit of the current page state. Returns a list of human-readable problems (empty = OK):
 * horizontal scroll, elements sticking out of their card, nav controls off screen / overlapping / wrapping.
 */
export function auditLayout(page: Page): Promise<string[]> {
  return page.evaluate((containment) => {
    const T = 1.5;
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;

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

    const nav = [...document.querySelectorAll('.nav-logo, .nav-right > *, .nav-links > li > a, .nav-links > a')].filter((e) => shown(e) && e.getBoundingClientRect().left >= 0);
    const rects = nav.map((e) => [e, e.getBoundingClientRect()] as const);
    for (const [e, r] of rects) if (r.right > vw + T) out.push(`nav ${label(e)} goes off screen (right=${Math.round(r.right)} > ${vw})`);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const [a, ra] = rects[i], [b, rb] = rects[j];
        if (a.contains(b) || b.contains(a)) continue;
        const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (overlapX > T && overlapY > T) out.push(`nav ${label(a)} overlaps ${label(b)}`);
      }
    }
    for (const l of document.querySelectorAll('.nav-links > li > a, .nav-links > a, .nav-logo')) {
      if (shown(l) && l.getBoundingClientRect().left >= 0 && getComputedStyle(l).position !== 'fixed' && l.getBoundingClientRect().height > 40) out.push(`nav "${l.textContent?.trim()}" wraps onto several lines`);
    }
    return out;
  }, CONTAINMENT);
}

/** Scrolls like a visitor (real scrolling, so scroll-triggered animations run) down to the very bottom, checking for horizontal scroll at each step. */
export async function scrollToBottom(page: Page): Promise<string[]> {
  const problems: string[] = [];
  const widths = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, x: Math.round(scrollX) }));
  for (let i = 0; i < 100; i++) {
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(60);
    const w = await widths();
    if (w.sw > w.cw + 1 || w.x !== 0) {
      problems.push(`horizontal scroll while scrolling (step ${i}): scrollWidth ${w.sw} > ${w.cw}, scrollX ${w.x}`);
      return problems;
    }
    if (await page.evaluate(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight)) break;
  }
  await page.waitForTimeout(600);
  const w = await widths();
  if (w.sw > w.cw + 1) problems.push(`horizontal scroll at the bottom: scrollWidth ${w.sw} > ${w.cw}`);
  return problems;
}

/** Opens the burger menu, checks it, closes it. Returns the problems found. */
export async function exerciseBurgerMenu(page: Page): Promise<string[]> {
  const problems: string[] = [];
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('#hamburger');
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => {
    const nav = document.getElementById('navLinks')!;
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const links = [...nav.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().width > 0);
    const burger = document.getElementById('hamburger')!.getBoundingClientRect();
    return {
      open: nav.classList.contains('open'),
      links: links.length,
      offscreen: links.filter((a) => { const r = a.getBoundingClientRect(); return r.left < 0 || r.right > vw + 1 || r.bottom > vh + 1 || r.top < 0; }).map((a) => a.textContent!.trim()),
      sw: document.documentElement.scrollWidth,
      cw: vw,
      burgerOnScreen: burger.left >= 0 && burger.right <= vw + 1,
    };
  });
  if (!menu.open) problems.push('burger menu did not open');
  if (menu.links < 4) problems.push(`burger menu shows ${menu.links} links (expected at least 4)`);
  if (menu.offscreen.length) problems.push(`burger menu links off screen: ${menu.offscreen.join(', ')}`);
  if (menu.sw > menu.cw + 1) problems.push(`horizontal scroll with the menu open: ${menu.sw} > ${menu.cw}`);
  if (!menu.burgerOnScreen) problems.push('burger / close button is off screen');
  await page.click('#hamburger');
  await page.waitForTimeout(300);
  if (await page.evaluate(() => document.getElementById('navLinks')!.classList.contains('open'))) problems.push('burger menu did not close');
  return problems;
}
