# Quentin Lecler — Portfolio

[![CI/CD](https://github.com/quentinlecler/business-card/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/quentinlecler/business-card/actions/workflows/ci.yml)

[![lecler.dev](og.jpg)](https://lecler.dev)

**[lecler.dev](https://lecler.dev)** — personal portfolio / business card for Quentin Lecler, Senior Full-Stack Developer.

## Stack

Zero framework, zero build step, zero third-party CDN. One hand-written `index.html`, bilingual (EN/FR):

- Vanilla HTML/CSS/JS — no React, no bundler
- Translations with [i18next](https://www.i18next.com/) (`i18n/en.json`, `i18n/fr.json`), vendored in `vendor/` — language from `?lang=`, saved choice or browser, FR/EN switch in the nav
- Self-hosted fonts (Instrument Sans, DM Sans, JetBrains Mono) and icons
- Canvas-based particle field + per-element cursor-tracked hover halo, all vanilla JS
- Contact form posts to [Formspree](https://formspree.io) via `fetch()`, protected by reCAPTCHA Enterprise + Formshield
- Dark/light theme with no flash-of-wrong-theme on load

Deployed on [GitHub Pages](https://pages.github.com/) with a custom domain (`CNAME`). Push to `main` → GitHub Actions runs the unit and end-to-end tests, then deploys; a failing test means no deployment.

## Local development

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. See `CLAUDE.md` for the full architecture breakdown.

## Testing

```bash
npm install          # also enables the pre-push hook (git config core.hooksPath .githooks)
PLAYWRIGHT_BROWSERS_PATH=0 npx --no-install playwright install chromium   # once, for the e2e tests
npm run test:unit    # vitest: translations, markup, content rules, i18n loader, theme
npm run test:e2e     # Playwright: language, theme, layout (no overflow), real scroll + burger menu on phones
```

## Quality

A one-page site, but it is treated like a product: nothing reaches production unless the tests pass.

- **Unit tests** ([vitest](https://vitest.dev) + jsdom, no browser): translation catalogs (same keys, same inline tags in EN and FR), HTML markup against `en.json`, content rules (claims the site must never make, CyberOps shown as a training, CCNA the only certification), the i18n loader (language resolution, `?lang=`, saved choice, switch button, missing translation files), the early `<head>` script and the theme script.
- **End-to-end tests** ([Playwright](https://playwright.dev), headless Chromium, run against `_site/`, exactly the files that get deployed): language detection and switching, theme (system preference and saved choice), contact form (Formspree mocked), layout geometry at phone-to-desktop widths (nothing overflows or overlaps), and what a phone visitor does — real scrolling to the bottom and opening the burger menu. Third-party requests (reCAPTCHA) are stubbed, so the tests never depend on the network.
- **CI/CD** ([GitHub Actions](.github/workflows/ci.yml)): unit and e2e tests on every push and pull request; the GitHub Pages deployment only runs on `main` and only after both test jobs passed. A red test means no deployment.
- **Regression tests**: each bug fixed (frozen typing animation on language switch, contact form stuck without the i18n loader, horizontal scroll on phones) got a test that fails on the broken code and passes on the fixed one.

Limits, stated plainly: no coverage metric, Chromium only, no screenshot comparison. Looks, contrast and spacing are checked by eye, not by the tests.

After changing i18next's version: `npm run vendor` copies its browser builds into `vendor/` (committed, GitHub Pages doesn't run npm). `node_modules/` is never served.
