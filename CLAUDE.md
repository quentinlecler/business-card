# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static single-page personal business card / portfolio site for Quentin Lecler, deployed to GitHub Pages at `lecler.dev`.

**No build system, no package manager, no framework.** Everything lives in a single file: `index.html` (≈1100 lines of HTML + inline CSS + inline JS).

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

1. **`<style>` (lines 31–740)** — All CSS inline. Contains a desktop-first section followed by a `@media (max-width: 768px)` mobile block. Animations use `@keyframes` + `.reveal` class toggled by JS.

2. **`<body>` (lines 744–1056)** — Sections in order: `#nav` (burger menu on mobile), hero, `#stack` (tech cards with hover detail), `#parcours` (experience timeline), `#formation` (education & certifications), `#contact`.

3. **`<script>` (lines 1057–1099)** — Vanilla JS only: burger menu toggle, scroll-spy for active nav link, IntersectionObserver for `.reveal` scroll animations.

## Assets

- `og.png` — Open Graph preview image. Must be regenerated manually when hero content changes (see commit history for context).
- `CNAME` — Contains `lecler.dev` for GitHub Pages custom domain.

## Deployment

Push to `main` → GitHub Pages auto-deploys. No CI pipeline.
