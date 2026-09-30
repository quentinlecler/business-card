// Static checks on the translation files and the HTML markup (no browser). Run: npm test
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const en = JSON.parse(read('i18n/en.json'));
const fr = JSON.parse(read('i18n/fr.json'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const units = [...html.matchAll(/<(\w+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)]
  .map(([, , key, inner]) => ({ key, inner: norm(inner) }));
const attrKeys = [...html.matchAll(/data-i18n-attr="([^"]+)"/g)].map(([, spec]) => spec.slice(spec.indexOf(':') + 1));

test('both language files have exactly the same keys', () => {
  const only = (a, b) => Object.keys(a).filter((k) => !(k in b));
  assert.deepEqual(only(en, fr), [], 'keys missing in fr.json');
  assert.deepEqual(only(fr, en), [], 'keys missing in en.json');
});

test('every data-i18n / data-i18n-attr key of index.html exists in both files', () => {
  assert.ok(units.length > 50, `only ${units.length} data-i18n elements found`);
  for (const key of [...units.map((u) => u.key), ...attrKeys]) {
    assert.ok(key in en, `en.json is missing "${key}"`);
    assert.ok(key in fr, `fr.json is missing "${key}"`);
  }
});

test('no duplicated data-i18n key in index.html', () => {
  const keys = units.map((u) => u.key);
  assert.deepEqual(keys.filter((k, i) => keys.indexOf(k) !== i), []);
});

test('en.json has no orphan key (not used by the HTML, meta, or JS)', () => {
  const used = new Set([...units.map((u) => u.key), ...attrKeys]);
  const orphans = Object.keys(en).filter((k) => !used.has(k) && !/^(meta|js)\./.test(k));
  assert.deepEqual(orphans, []);
});

test('English text in index.html matches en.json (no drift between the two)', () => {
  const drift = units.filter((u) => u.inner !== en[u.key]).map((u) => u.key);
  assert.deepEqual(drift, []);
});

test('a translation is never empty and keeps the same inline HTML tags as English', () => {
  const tags = (s) => (String(s).match(/<\/?\w+>/g) || []).join('');
  for (const k of Object.keys(en)) {
    assert.ok(String(fr[k]).length > 0, `fr.json "${k}" is empty`);
    assert.equal(tags(fr[k]), tags(en[k]), `HTML tags differ for "${k}"`);
  }
  assert.equal(fr['js.roles'].length, en['js.roles'].length);
});

test('claims the site must never make', () => {
  const forbidden = /\b(sharepoint|power platform|azure|aws|kubernetes|kafka|terraform|bachelor|bachelier|diplôme|diploma|sans emploi|unemployed)\b/i;
  for (const [name, text] of [['index.html', html], ['en.json', JSON.stringify(en)], ['fr.json', JSON.stringify(fr)]]) {
    const hit = text.match(forbidden);
    assert.equal(hit, null, `${name} contains forbidden term "${hit?.[0]}"`);
  }
});

test('CyberOps stays a training and CCNA stays the only certification', () => {
  assert.equal(en['education.edu_type.3'], 'Training');
  assert.equal(fr['education.edu_type.3'], 'Formation');
  assert.equal(en['education.edu_type.2'], 'Certification');
  assert.equal(fr['education.edu_type.2'], 'Certification');
  assert.equal(Object.entries(en).filter(([k, v]) => k.startsWith('education.edu_type') && v === 'Certification').length, 1);
});

test('files referenced by the site exist', () => {
  for (const key of ['attr.cv_url']) for (const dict of [en, fr]) {
    assert.ok(existsSync(new URL(`..${dict[key]}`, import.meta.url)), `${dict[key]} not found`);
  }
  for (const f of ['vendor/i18next.min.js', 'vendor/i18next-browser-languagedetector.min.js', 'vendor/i18next-http-backend.min.js', 'i18n/loader.js']) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), `${f} not found`);
    assert.ok(html.includes(`src="${f}"`), `index.html does not load ${f}`);
  }
});
