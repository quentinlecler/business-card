import { describe, it, expect } from 'vitest';
import { en, fr, units, attrKeys } from './site';

describe('index.html i18n markup', () => {
  it('finds the translatable elements (guards against a broken parser)', () => {
    expect(units.length).toBeGreaterThan(50);
  });

  it('only uses keys that exist in both language files', () => {
    const keys = [...units.map((u) => u.key), ...attrKeys];
    expect(keys.filter((k) => !(k in en)), 'missing in en.json').toEqual([]);
    expect(keys.filter((k) => !(k in fr)), 'missing in fr.json').toEqual([]);
  });

  it('has no duplicated data-i18n key', () => {
    const keys = units.map((u) => u.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it('leaves no orphan key in en.json (unused by the HTML, meta or JS)', () => {
    const used = new Set([...units.map((u) => u.key), ...attrKeys]);
    const orphans = Object.keys(en).filter((k) => !used.has(k) && !/^(meta|js)\./.test(k));
    expect(orphans).toEqual([]);
  });

  it('keeps the English text in index.html identical to en.json (no drift)', () => {
    const drift = units.filter((u) => u.inner !== en[u.key]).map((u) => u.key);
    expect(drift).toEqual([]);
  });
});
