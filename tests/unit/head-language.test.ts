import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { html } from './site';

// The inline <head> script hides the page for visitors who will get French, so they never see the English flash.
// It must resolve the language exactly like i18n/loader.js does: ?lang= → saved choice → navigator.languages, supported languages only.
const inline = html.match(/<script>\/\* Guess the language early[\s\S]*?<\/script>/)?.[0].replace(/^<script>|<\/script>$/g, '');

interface Visitor {
  search?: string;
  stored?: string;
  languages?: string[];
  language?: string;
  storageThrows?: boolean;
}

function hidesPage({ search = '', stored, languages = ['en-US'], language, storageThrows = false }: Visitor): boolean {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: `http://localhost/${search}`, runScripts: 'outside-only' });
  const win = dom.window as any;
  Object.defineProperty(win.navigator, 'languages', { value: languages, configurable: true });
  Object.defineProperty(win.navigator, 'language', { value: language ?? languages[0] ?? 'en-US', configurable: true });
  if (stored) win.localStorage.setItem('ql-lang', stored);
  if (storageThrows) Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied'); }, configurable: true });
  win.eval(inline!);
  return win.document.documentElement.classList.contains('i18n-pending');
}

describe('inline <head> language guess', () => {
  it('finds the inline script in index.html', () => {
    expect(inline).toBeTruthy();
  });

  it.each<[string, Visitor, boolean]>([
    ['English browser', { languages: ['en-US'] }, false],
    ['French browser', { languages: ['fr'] }, true],
    ['regional French (fr-CA)', { languages: ['fr-CA'] }, true],
    ['unsupported first, French second (de, fr)', { languages: ['de', 'fr'] }, true],
    ['English first, French second (en, fr)', { languages: ['en', 'fr'] }, false],
    ['only an unsupported language', { languages: ['de-DE'] }, false],
    ['?lang=fr over an English browser', { search: '?lang=fr', languages: ['en'] }, true],
    ['?lang=en over a French browser', { search: '?lang=en', languages: ['fr'] }, false],
    ['unsupported ?lang= is ignored (falls back to the saved French)', { search: '?lang=de', stored: 'fr', languages: ['en'] }, true],
    ['unsupported ?lang= is ignored (falls back to the French browser)', { search: '?lang=de', languages: ['fr'] }, true],
    ['saved English wins over a French browser', { stored: 'en', languages: ['fr'] }, false],
    ['saved French wins over an English browser', { stored: 'fr', languages: ['en'] }, true],
    ['unsupported saved value is ignored', { stored: 'de', languages: ['fr'] }, true],
    ['no navigator.languages, navigator.language is French', { languages: [], language: 'fr' }, true],
    ['storage unavailable (private mode): the browser language still applies', { storageThrows: true, languages: ['fr'] }, true],
  ])('%s', (_name, visitor, expected) => {
    expect(hidesPage(visitor)).toBe(expected);
  });
});
