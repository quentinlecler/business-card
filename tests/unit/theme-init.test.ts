import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { html } from './site';

// The inline script of index.html that picks the theme before the first render (avoids a flash).
const inline = html.match(/<script>\/\* Applique le thème[\s\S]*?<\/script>/)?.[0].replace(/^<script>|<\/script>$/g, '');

function isLight({ systemPrefersLight, saved }: { systemPrefersLight: boolean; saved?: 'light' | 'dark' }): boolean {
  const dom = new JSDOM('<body></body>', { runScripts: 'outside-only', url: 'http://localhost/' });
  const win = dom.window as any;
  win.matchMedia = (query: string) => ({ matches: query.includes('light') ? systemPrefersLight : !systemPrefersLight });
  if (saved) win.localStorage.setItem('ql-theme', saved);
  win.eval(inline!);
  return win.document.body.classList.contains('light');
}

describe('theme chosen before the first render', () => {
  it('finds the inline theme script in index.html', () => {
    expect(inline).toBeTruthy();
  });

  it('follows the system preference when the visitor never chose', () => {
    expect(isLight({ systemPrefersLight: true })).toBe(true);
    expect(isLight({ systemPrefersLight: false })).toBe(false);
  });

  it('lets a saved choice win over the system preference, both ways', () => {
    expect(isLight({ systemPrefersLight: true, saved: 'dark' })).toBe(false);
    expect(isLight({ systemPrefersLight: false, saved: 'light' })).toBe(true);
  });
});
