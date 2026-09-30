// Shared helpers for the unit tests: read the site sources from the repo root.
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

export const read = (path: string): string => readFileSync(new URL(path, root), 'utf8');
export const exists = (path: string): boolean => existsSync(new URL(path, root));

export const html = read('index.html');
export const en: Record<string, any> = JSON.parse(read('i18n/en.json'));
export const fr: Record<string, any> = JSON.parse(read('i18n/fr.json'));

export const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Every element carrying data-i18n, with its English inner HTML as written in index.html. */
export const units = [...html.matchAll(/<(\w+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)].map(
  ([, , key, inner]) => ({ key, inner: normalize(inner) }),
);

/** Every key used through data-i18n-attr="attr:key". */
export const attrKeys = [...html.matchAll(/data-i18n-attr="([^"]+)"/g)].map(([, spec]) => spec.slice(spec.indexOf(':') + 1));
