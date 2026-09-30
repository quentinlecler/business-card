// Copies the browser builds of the runtime dependencies from node_modules/ into vendor/.
// GitHub Pages serves the repo as-is (no npm install at deploy time), so vendor/ is committed.
// Usage: npm run vendor
import { copyFileSync, mkdirSync } from 'node:fs';

const files = [
  ['i18next/i18next.min.js', 'i18next.min.js'],
  ['i18next/LICENSE', 'LICENSE-i18next.txt'],
  ['i18next-browser-languagedetector/i18nextBrowserLanguageDetector.min.js', 'i18next-browser-languagedetector.min.js'],
  ['i18next-browser-languagedetector/LICENSE', 'LICENSE-i18next-browser-languagedetector.txt'],
  ['i18next-http-backend/i18nextHttpBackend.min.js', 'i18next-http-backend.min.js'],
  ['i18next-http-backend/licence', 'LICENSE-i18next-http-backend.txt'],
];
mkdirSync('vendor', { recursive: true });
for (const [from, to] of files) copyFileSync(`node_modules/${from}`, `vendor/${to}`);
console.log(`vendor/: ${files.length} files copied`);
