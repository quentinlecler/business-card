# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static single-page personal business card / portfolio site for Quentin Lecler, deployed to GitHub Pages at `lecler.dev`.

**No build system, no framework.** The page is a single hand-written `index.html` (HTML + inline CSS + inline JS) plus `i18n/` (translations) and `vendor/` (i18next, see below).

`package.json` holds two kinds of packages:
- **Runtime dependencies** (`i18next`, `i18next-browser-languagedetector`, `i18next-http-backend`, exact versions): GitHub Pages does not run `npm install`, so their browser builds are **copied into `vendor/` and committed** with `npm run vendor` (script `vendor.mjs`). The site never loads anything from `node_modules` (gitignored) or from a CDN. To upgrade: bump the version, `npm install`, `npm run vendor`, `npm test` (unit + e2e), commit `vendor/` too.
- **Testing tooling** (`devDependencies`, exact versions): `vitest` + `jsdom` (unit tests), `@playwright/test` (end-to-end tests; same version as the `playwright-core` pulled by `@playwright/cli`, so they share one project-local Chromium), `@playwright/cli` (manual browser automation).

## Internationalisation (EN / FR)

- English is written in `index.html` (fallback without JS, and what crawlers / link previews see). French comes from `i18n/fr.json`; `i18n/en.json` mirrors the HTML and is used to switch back.
- Translatable elements carry `data-i18n="key"` (innerHTML, so values may contain `<strong>` and `&amp;`); attributes use `data-i18n-attr="attr:key"` (e.g. `href:attr.cv_url`, `title:attr.theme`). `meta.*` and `js.*` keys feed `<title>`, meta tags, the typed roles and the form messages.
- `i18n/loader.js` sets up i18next: language order `?lang=` → `localStorage` (`ql-lang`) → browser language → English. A tiny inline script in `<head>` hides the page for French visitors until translations are applied (2.5 s safety timeout).
- **Adding or changing visible text: edit `index.html` AND both `i18n/*.json` files**, keep the same keys, then run the tests. Do not leave English-only text in a translated element.
- The CV link follows the language: `quentin-lecler-cv.pdf` (EN, name kept so old links keep working) and `quentin-lecler-cv-fr.pdf` (FR). Both are copies from `~/Projects/resume/site/`; keep them in sync manually.
- Link previews (`og:*`) stay English for everyone: crawlers don't run JS.

## Tests

- **Unit tests** (`npm run test:unit`, vitest, `tests/unit/*.test.ts`, no browser): translation catalog (key parity, tags, roles), HTML markup (`data-i18n` keys, drift between `index.html` and `en.json`), content rules (forbidden claims, CyberOps = training, CCNA the only certification, "développeur solo"), referenced files, `i18n/loader.js` (language resolution, `?lang=`, storage, applying text/attrs/meta/roles, switch button, libraries missing) and the inline theme script, both run in jsdom.
- **End-to-end tests** (`npm run test:e2e`, Playwright Test, `tests/e2e/*.spec.ts`, config `playwright.config.ts`): they first run `npm run build:site` (assembles `_site/`, exactly what is deployed) and test that folder through a throw-away static server. Specs: `i18n` (detection, switch, persistence, CV per language), `theme` (system preference, saved choice, live change), `assets` (PDFs, CNAME, JSON), `layout` (geometry matrix: EN/FR × 320…1280 px — nothing sticks out of its card, no horizontal scroll, nav neither overlaps nor wraps), `phone` (real scroll to the very bottom + burger menu open/close at 320/390 px, dark, plus one Pixel 7 emulation, also dark), `contact-form` and `hero-roles`. No screenshots; aesthetics, contrast and spacing are **not** covered: look at the page. Verified to fail on the known-broken commit `a170454`.
- **CI/CD** (`.github/workflows/ci.yml`): unit + e2e on every push and PR; the `deploy` job (GitHub Pages) `needs` both and only runs on `main`, so red tests = no deployment. This requires **Settings → Pages → Source = "GitHub Actions"**; to also reject merges, protect `main` (require a PR and the `Unit tests` / `End-to-end tests` checks). `.githooks/pre-push` runs only the fast unit tests before a push (enabled by `npm install` via `prepare`); the e2e tests are run by the CI, and locally with `npm run test:e2e`. Skip the hook once with `--no-verify`. Locally, install the browser once: `PLAYWRIGHT_BROWSERS_PATH=0 npx --no-install playwright install chromium`.
- **Never push UI changes without checking the real behaviour first** (burger menu open, real scroll to the very bottom at 375 px, no horizontal scroll) and without the owner's go-ahead.

## Development

Preview locally with any static server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

## Architecture

`index.html` is structured in three logical blocks:

1. **`<style>` (lines 25–413)** — All CSS inline, including self-hosted `@font-face` declarations (lines ~28–77) and a `@media (max-width: 680px)` mobile block. A near-invisible animated mesh-gradient wash (`.mesh-bg`, `--mesh-op` ~0.07) sits behind the whole page; a canvas-based drifting particle field (`#heroCanvas`) renders in the hero. Per-element hover halo (radial glow tracked to cursor position via `--hx`/`--hy` custom properties, set in JS) is used on cards, bento tiles and pill badges — deliberately *not* a global cursor-following spotlight. Animations respect `prefers-reduced-motion` throughout (`REDUCED_MOTION` JS flag).

2. **`<body>` (lines 415–892)** — Inline theme-init script first (prevents flash of wrong theme), then `<nav>` (glassmorphism, burger drawer on mobile, availability pill with pulsing dot), `#hero` (single strong CTA + quiet secondary link, no clutter), `.stats-strip` (full-bleed band directly below the hero — deliberately outside the hero container, not boxed inside it), `#about`, `#stack` (bento grid of tech categories, pastel per-card tint), `#experience` (accordion cards), `#projects` (public work: 6 cards with links), `#education`, `#contact` (real contact form + a separate "contact info" card), `<footer>`.

3. **`<script>` (from ~line 721)** — Vanilla JS only: typing effect, burger menu toggle, scroll-spy, IntersectionObserver `.reveal` animations, per-element hover-halo tracking, the hero particle field, and the contact form submit handler (see below).

## Contact form

`#contact` has a real `<form id="contactForm">` that POSTs to Formspree (`https://formspree.io/f/xzepvzzq`) via `fetch()` in vanilla JS (no `@formspree/ajax` library — kept dependency-free per the no-CDN rule). Success/error is shown inline in `#contactFormStatus` without leaving the page. Formspree's form-level "restrict to domain" setting only allows `lecler.dev`, so **submissions from `localhost` or any other origin will not deliver** — this is expected when testing locally, not a bug; Formspree still returns a generic 200-ish response in that case (to avoid leaking config to probes), so the JS cannot reliably distinguish a domain-block from a real success when testing off-domain. Only trust a real end-to-end test once deployed on `lecler.dev`.

## Assets

- `og.jpg` — Open Graph preview image. Must be regenerated manually when hero content changes (see commit history for context).
- `CNAME` — Contains `lecler.dev` for GitHub Pages custom domain.
- `fonts/` — Self-hosted woff2 fonts (Instrument Sans, DM Sans, JetBrains Mono) + their OFL licenses. Instrument Sans is the `--display` font (headings/name).
- `icons/` — Self-hosted image assets (currently just `malt.webp`; the `#stack` bento grid uses inline SVG line icons, not files, so no per-tech icon files are needed there anymore).
- `quentin-lecler-cv.pdf` (EN) and `quentin-lecler-cv-fr.pdf` (FR) — CVs linked from the site according to the language; copies of `~/Projects/resume/site/*.pdf`, keep in sync manually, no auto-generation.

## Deployment

Push to `main` → the CI runs the tests, then the `deploy` job publishes `_site/` to GitHub Pages (see Tests > CI/CD); nothing is deployed if a test fails. Cloudflare caches static files for up to 4 h, so `index.html` and `i18n/*.json` can briefly be out of sync after a push (missing French text then falls back to English).

Note: Cloudflare (sitting in front of the domain) auto-injects a `<script src="/cdn-cgi/scripts/.../email-decode.min.js">` tag before `</body>` to obfuscate the mailto link — this is not something added to the source and isn't a third-party dependency to maintain; it won't appear when previewing via a local static server.

## Browser Automation

Use the `/playwright-cli` skill for browser testing and automation. The Playwright MCP server is disabled — do not use it.

`playwright-cli` is installed **locally in the project** (devDependency), not globally, and its browser lives in `node_modules` too. Setup after a fresh clone:

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx --no-install playwright-cli install-browser chrome-for-testing
```

Then always call it via `npx --no-install playwright-cli ...` with `PLAYWRIGHT_BROWSERS_PATH=0` (so it uses the project-local browser, not `~/.cache`). Google Chrome is not installed on this machine → use `--browser=chromium`, not `--browser=chrome`.

**Always open the browser in headed (visible) mode:**
```bash
PLAYWRIGHT_BROWSERS_PATH=0 npx --no-install playwright-cli open --browser=chromium --headed http://localhost:8080
```
Never omit `--headed` — without it, playwright-cli defaults to headless.

## Content conventions

- **AI-assisted development is a deliberate highlight** (aligned with the CV repo `~/Projects/resume`): `AI-Assisted` in `<title>`/og:title, a sentence in the hero and `#about`, `AI-Assisted Developer` in the typed roles, the `AI & Tooling` bento card placed **first**, Claude Code bullets + tag on Doctipro and Référenceur. Only claim facts verifiable in `~/Projects/doctiprodev` (CLAUDE.md, `.claude/skills/`, the mandatory code-review step in the `push-staging`/`push-master` skills). No AI claims before 2025 / for Anysoft. No "LLM APIs" claim — Quentin has never integrated an LLM API (confirmed 2026-09-24); the AI experience is Claude Code as a development tool.
- **`#projects` only shows public data.** Product descriptions come from the public pages themselves (anysoft.lu for CLIP and HYPOTOOLS), Quentin's part comes from his CV or his own statement (he built the React credit-simulator / request forms on a C# .NET Core Web API connected to CLIP and HYPOTOOLS). No employer code, screenshots or figures. The broker sites (leemanskredieten.be — its public page shows the simulator: amount, durations, APR, monthly payment, total cost —, clicredit.be, wallfin.be, euro-finances.be) are shown as "Seen on" at his request; none of them credits him or Anysoft publicly. Doctipro's part is his own statement (worked on the existing codebase; ophthalmology and waiting-room modules, patient registration and client area, bug fixes, controller cleanup, defensive security, CI/CD and Playwright tests); the public page describes the booking platform. Brunswick Marine lunch app (E.S.I. Informatique, 2017–2019): the public page only shows the title "Brunswick App"; the description (choose/book a midday meal, order and delivery management) and "built end to end" are his statement; stack per his statement: React, Node.js, TypeScript. Simsy (Référenceur, 2024–2025): he built everything except the UI mockups (his statement); the employer placement follows the CV.
- CyberOps Associate was **never completed** — it is shown as `Training` in `#education`, never as a certification. The only real certification is CCNA.
- `quentin-lecler-cv.pdf` / `quentin-lecler-cv-fr.pdf` = copies of `~/Projects/resume/site/quentin-lecler-cv.pdf` and `~/Projects/resume/site/quentin-lecler-cv-fr.pdf` (produced in the separate resume session; do not edit CVs from this repo).

## Regenerating `og.jpg`

No `playwright-cli` needed: render a temporary copy of `index.html` (with `fonts/` and `icons/` symlinked next to it) that hides `nav` and `.grecaptcha-badge`, shifts `#hero` up by the nav height (`margin-top:-58px`), and swaps `#typedRole` for a static span after load (otherwise the typing animation is captured mid-word). Then run the Playwright-bundled Chromium: `node_modules/playwright-core/.local-browsers/chromium-*/chrome-linux64/chrome --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=8000 --screenshot=og.png http://localhost:PORT/`, and convert to JPEG (quality 85).
