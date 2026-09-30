// Assembles the exact set of files GitHub Pages will serve into ./_site.
// Tests (e2e) run against this folder, so what is tested is what is deployed. Run: npm run build:site
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, '_site');

const files = ['index.html', 'CNAME', 'og.jpg', 'quentin-lecler-cv.pdf', 'quentin-lecler-cv-fr.pdf'];
const dirs = ['i18n', 'vendor', 'fonts', 'icons'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of files) {
  if (!existsSync(join(root, f))) throw new Error(`build:site — missing file ${f}`);
  cpSync(join(root, f), join(out, f));
}
for (const d of dirs) {
  if (!existsSync(join(root, d))) throw new Error(`build:site — missing folder ${d}`);
  cpSync(join(root, d), join(out, d), { recursive: true });
}
console.log(`_site ready: ${readdirSync(out).join(', ')}`);
