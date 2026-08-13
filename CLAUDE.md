# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static single-page personal business card / portfolio site for Quentin Lecler, deployed to GitHub Pages at `lecler.dev`.

**No build system, no package manager, no framework.** Everything lives in a single file: `index.html` (≈890 lines of HTML + inline CSS + inline JS).

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

2. **`<body>` (lines 415–892)** — Inline theme-init script first (prevents flash of wrong theme), then `<nav>` (glassmorphism, burger drawer on mobile, availability pill with pulsing dot), `#hero` (single strong CTA + quiet secondary link, no clutter), `.stats-strip` (full-bleed band directly below the hero — deliberately outside the hero container, not boxed inside it), `#about`, `#stack` (bento grid of tech categories, pastel per-card tint), `#experience` (accordion cards), `#education`, `#contact` (real contact form + a separate "contact info" card), `<footer>`.

3. **`<script>` (from ~line 721)** — Vanilla JS only: typing effect, burger menu toggle, scroll-spy, IntersectionObserver `.reveal` animations, per-element hover-halo tracking, the hero particle field, and the contact form submit handler (see below).

## Contact form

`#contact` has a real `<form id="contactForm">` that POSTs to Formspree (`https://formspree.io/f/xzepvzzq`) via `fetch()` in vanilla JS (no `@formspree/ajax` library — kept dependency-free per the no-CDN rule). Success/error is shown inline in `#contactFormStatus` without leaving the page. Formspree's form-level "restrict to domain" setting only allows `lecler.dev`, so **submissions from `localhost` or any other origin will not deliver** — this is expected when testing locally, not a bug; Formspree still returns a generic 200-ish response in that case (to avoid leaking config to probes), so the JS cannot reliably distinguish a domain-block from a real success when testing off-domain. Only trust a real end-to-end test once deployed on `lecler.dev`.

## Assets

- `og.jpg` — Open Graph preview image. Must be regenerated manually when hero content changes (see commit history for context).
- `CNAME` — Contains `lecler.dev` for GitHub Pages custom domain.
- `fonts/` — Self-hosted woff2 fonts (Instrument Sans, DM Sans, JetBrains Mono) + their OFL licenses. Instrument Sans is the `--display` font (headings/name).
- `icons/` — Self-hosted image assets (currently just `malt.webp`; the `#stack` bento grid uses inline SVG line icons, not files, so no per-tech icon files are needed there anymore).
- `quentin-lecler-cv.pdf` — CV linked from the site; keep in sync manually, no auto-generation.

## Deployment

Push to `main` → GitHub Pages auto-deploys. No CI pipeline.

Note: Cloudflare (sitting in front of the domain) auto-injects a `<script src="/cdn-cgi/scripts/.../email-decode.min.js">` tag before `</body>` to obfuscate the mailto link — this is not something added to the source and isn't a third-party dependency to maintain; it won't appear when previewing via a local static server.

## Browser Automation

Use the `/playwright-cli` skill for browser testing and automation. The Playwright MCP server is disabled — do not use it.

**Always open the browser in headed (visible) mode:**
```bash
playwright-cli open --browser=chrome --headed http://localhost:8080
```
Never omit `--headed` — without it, playwright-cli defaults to headless.
