import { describe, it, expect } from 'vitest';
import { html, en, fr, exists } from './site';

describe('files referenced by the site', () => {
  it.each([
    ['en', en],
    ['fr', fr],
  ])('the %s CV exists', (_lang, dict) => {
    expect(exists(`.${dict['attr.cv_url']}`), `${dict['attr.cv_url']} not found`).toBe(true);
  });

  it.each(['vendor/i18next.min.js', 'vendor/i18next-browser-languagedetector.min.js', 'vendor/i18next-http-backend.min.js', 'i18n/loader.js'])(
    '%s exists and is loaded by index.html',
    (file) => {
      expect(exists(file), `${file} not found`).toBe(true);
      expect(html).toContain(`src="${file}"`);
    },
  );

  it('has the files GitHub Pages needs', () => {
    expect(exists('CNAME')).toBe(true);
    expect(exists('og.jpg')).toBe(true);
  });
});
