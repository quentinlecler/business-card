import { describe, it, expect } from 'vitest';
import { en, fr } from './site';

const missingIn = (a: object, b: object) => Object.keys(a).filter((k) => !(k in b));
const tags = (s: unknown) => (String(s).match(/<\/?\w+>/g) || []).join('');

describe('translation files (i18n/en.json, i18n/fr.json)', () => {
  it('have exactly the same keys', () => {
    expect(missingIn(en, fr), 'keys missing in fr.json').toEqual([]);
    expect(missingIn(fr, en), 'keys missing in en.json').toEqual([]);
  });

  it('never contain an empty translation', () => {
    const empty = Object.keys(en).filter((k) => String(fr[k]).length === 0 || String(en[k]).length === 0);
    expect(empty).toEqual([]);
  });

  it('keep the same inline HTML tags in French as in English', () => {
    const differing = Object.keys(en).filter((k) => tags(fr[k]) !== tags(en[k]));
    expect(differing).toEqual([]);
  });

  it('have the same number of typed roles', () => {
    expect(Array.isArray(en['js.roles'])).toBe(true);
    expect(fr['js.roles']).toHaveLength(en['js.roles'].length);
  });
});
