import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { read, en, fr } from './site';

// i18n/loader.js run in jsdom with the real vendored i18next + language detector.
// Only the HTTP backend is replaced by an in-memory one that serves the real i18n/*.json files.
const dictionaries: Record<string, Record<string, any>> = { en, fr };
const scripts = {
  i18next: read('vendor/i18next.min.js'),
  detector: read('vendor/i18next-browser-languagedetector.min.js'),
  loader: read('i18n/loader.js'),
};

const PAGE = `<!doctype html><html lang="en" class="i18n-pending"><head>
  <title>en title</title>
  <meta name="description" content="en description">
  <meta property="og:title" content="en og title">
  <meta property="og:description" content="en og description">
  <meta property="og:locale" content="en_US">
</head><body>
  <span id="label" data-i18n="stats.stat_label.3">EN</span>
  <a id="cv" href="/en.pdf" data-i18n-attr="href:attr.cv_url">CV</a>
  <button id="langBtn" data-i18n="nav.lang_btn">FR</button>
</body></html>`;

let failing: string[] = []; // languages whose JSON "fails to load" in the current test

class MemoryBackend {
  static type = 'backend';
  type = 'backend';
  init() {}
  read(language: string, _ns: string, callback: (err: unknown, data?: unknown) => void) {
    if (failing.includes(language) || !dictionaries[language]) callback(new Error(`cannot load ${language}`));
    else callback(null, dictionaries[language]);
  }
}

interface BootOptions {
  search?: string;
  navigatorLanguage?: string;
  stored?: string;
  withLibraries?: boolean;
  failing?: string[];
}

async function boot({ search = '', navigatorLanguage = 'en-US', stored, withLibraries = true, failing: failingLanguages = [] }: BootOptions = {}) {
  failing = failingLanguages;
  const dom = new JSDOM(PAGE, { url: `http://localhost/${search}`, runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window as any;
  Object.defineProperty(win.navigator, 'language', { value: navigatorLanguage, configurable: true });
  Object.defineProperty(win.navigator, 'languages', { value: [navigatorLanguage], configurable: true });
  if (stored) win.localStorage.setItem('ql-lang', stored);
  const roles: unknown[] = [];
  win.__setRoles = (r: unknown) => roles.push(r);
  if (withLibraries) {
    win.eval(scripts.i18next);
    win.eval(scripts.detector);
    win.i18nextHttpBackend = MemoryBackend;
  }
  win.eval(scripts.loader);
  for (let i = 0; i < 100 && win.document.documentElement.classList.contains('i18n-pending'); i++) await new Promise((r) => setTimeout(r, 10));
  const $ = (sel: string) => win.document.querySelector(sel);
  return {
    win,
    roles,
    lang: win.document.documentElement.lang,
    pending: win.document.documentElement.classList.contains('i18n-pending'),
    label: $('#label').innerHTML,
    cv: $('#cv').getAttribute('href'),
    title: win.document.title,
    ogLocale: $('meta[property="og:locale"]').getAttribute('content'),
    button: $('#langBtn').textContent,
    stored: win.localStorage.getItem('ql-lang'),
    click: async () => {
      $('#langBtn').click();
      await new Promise((r) => setTimeout(r, 100));
    },
  };
}

describe('i18n/loader.js — language resolution', () => {
  it('uses English for an English browser', async () => {
    const page = await boot({ navigatorLanguage: 'en-US' });
    expect(page.lang).toBe('en');
    expect(page.cv).toBe('/quentin-lecler-cv.pdf');
    expect(page.ogLocale).toBe('en_US');
  });

  it('uses French for a French browser, including regional variants (fr-CA, fr-BE)', async () => {
    for (const navigatorLanguage of ['fr', 'fr-FR', 'fr-CA', 'fr-BE']) {
      const page = await boot({ navigatorLanguage });
      expect(page.lang, navigatorLanguage).toBe('fr');
      expect(page.label).toBe(fr['stats.stat_label.3']);
      expect(page.cv).toBe('/quentin-lecler-cv-fr.pdf');
      expect(page.ogLocale).toBe('fr_FR');
    }
  });

  it('falls back to English for an unsupported browser language', async () => {
    const page = await boot({ navigatorLanguage: 'de-DE' });
    expect(page.lang).toBe('en');
    expect(page.label).toBe(en['stats.stat_label.3']);
  });

  it('lets ?lang= override the browser language, and remembers it', async () => {
    const page = await boot({ search: '?lang=fr', navigatorLanguage: 'en-US' });
    expect(page.lang).toBe('fr');
    expect(page.stored).toBe('fr');
  });

  it('ignores an unsupported ?lang= value and does not store it', async () => {
    const page = await boot({ search: '?lang=de', navigatorLanguage: 'en-US' });
    expect(page.lang).toBe('en');
    expect(page.stored).toBeNull();
  });

  it('prefers the stored choice over the browser language', async () => {
    const page = await boot({ stored: 'fr', navigatorLanguage: 'en-US' });
    expect(page.lang).toBe('fr');
  });
});

describe('i18n/loader.js — applying translations', () => {
  it('translates text, attributes, <title>, meta tags and the typed roles', async () => {
    const page = await boot({ navigatorLanguage: 'fr-CA' });
    expect(page.label).toBe(fr['stats.stat_label.3']);
    expect(page.title).toBe(fr['meta.title']);
    expect(page.roles.at(-1)).toEqual(fr['js.roles']);
  });

  it('reveals the page once translations are applied', async () => {
    expect((await boot({ navigatorLanguage: 'fr' })).pending).toBe(false);
  });

  it('never leaves the page hidden when the libraries are missing', async () => {
    const page = await boot({ navigatorLanguage: 'fr', withLibraries: false });
    expect(page.pending).toBe(false);
    expect(page.lang).toBe('en'); // untouched English HTML
  });
});

describe('i18n/loader.js — language switch button', () => {
  it('toggles EN → FR → EN and stores each choice', async () => {
    const page = await boot({ navigatorLanguage: 'en-US' });
    await page.click();
    expect(page.win.document.documentElement.lang).toBe('fr');
    expect(page.win.localStorage.getItem('ql-lang')).toBe('fr');
    expect(page.win.document.getElementById('label').innerHTML).toBe(fr['stats.stat_label.3']);
    await page.click();
    expect(page.win.document.documentElement.lang).toBe('en');
    expect(page.win.localStorage.getItem('ql-lang')).toBe('en');
    expect(page.win.document.getElementById('label').innerHTML).toBe(en['stats.stat_label.3']);
  });
});

describe('i18n/loader.js — when a translation file cannot be loaded', () => {
  it('still reveals the page and keeps the switch button working (French visitor, fr.json down)', async () => {
    const page = await boot({ navigatorLanguage: 'fr', failing: ['fr'] });
    expect(page.pending).toBe(false);
    await page.click();
    expect(page.win.document.documentElement.lang).toBe('en');
    expect(page.win.document.getElementById('label').innerHTML).toBe(en['stats.stat_label.3']);
  });

  it('stays on the current language and does not save the failed choice (English visitor clicks FR, fr.json down)', async () => {
    const page = await boot({ navigatorLanguage: 'en-US', failing: ['fr'] });
    await page.click();
    expect(page.win.document.documentElement.lang).toBe('en');
    expect(page.win.localStorage.getItem('ql-lang')).toBeNull();
    expect(page.win.document.getElementById('label').innerHTML).toBe(en['stats.stat_label.3']);
    // a later click still does not break anything
    await page.click();
    expect(page.win.document.documentElement.lang).toBe('en');
  });

  it('saves the choice only once the language really switched', async () => {
    const page = await boot({ navigatorLanguage: 'en-US' });
    await page.click();
    expect(page.win.localStorage.getItem('ql-lang')).toBe('fr');
  });
});
