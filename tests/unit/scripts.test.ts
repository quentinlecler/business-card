import { describe, it, expect, afterAll } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));

// A checkout living in a folder with a space and an accent ("My Projets/…"): URL pathnames are percent-encoded there,
// so scripts that build file paths from `new URL(...).pathname` break. Copy only what the scripts need.
const base = mkdtempSync(join(tmpdir(), 'ql-'));
const project = join(base, 'Mes Projets é', 'business-card');
afterAll(() => rmSync(base, { recursive: true, force: true }));

function copyProject() {
  mkdirSync(join(project, 'tests', 'e2e'), { recursive: true });
  cpSync(join(repo, 'scripts'), join(project, 'scripts'), { recursive: true });
  cpSync(join(repo, 'tests', 'e2e', 'server.mjs'), join(project, 'tests', 'e2e', 'server.mjs'));
  for (const f of ['index.html', 'CNAME', 'og.jpg', 'quentin-lecler-cv.pdf', 'quentin-lecler-cv-fr.pdf']) cpSync(join(repo, f), join(project, f));
  for (const d of ['i18n', 'vendor', 'fonts', 'icons']) cpSync(join(repo, d), join(project, d), { recursive: true });
  writeFileSync(join(project, 'package.json'), '{"type":"module"}');
}

describe('scripts in a path with spaces and accents', () => {
  it('build:site assembles _site', () => {
    copyProject();
    const run = spawnSync('node', ['scripts/build-site.mjs'], { cwd: project, encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    for (const f of ['index.html', 'CNAME', 'i18n/fr.json', 'vendor/i18next.min.js', 'quentin-lecler-cv-fr.pdf']) expect(existsSync(join(project, '_site', f)), f).toBe(true);
  });

  it('the e2e static server serves _site', async () => {
    const port = 4790;
    const server = spawn('node', ['tests/e2e/server.mjs', String(port)], { cwd: project, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      await new Promise<void>((resolve, reject) => {
        server.stdout.once('data', () => resolve());
        server.once('error', reject);
        setTimeout(() => reject(new Error('server did not start')), 5000);
      });
      const res = await fetch(`http://localhost:${port}/`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('<html');
      expect((await fetch(`http://localhost:${port}/i18n/fr.json`)).status).toBe(200);
    } finally {
      server.kill();
    }
  });
});

describe('scripts/setup-hooks.mjs (npm prepare)', () => {
  it('never fails the install outside a git checkout', () => {
    const noGit = mkdtempSync(join(tmpdir(), 'ql-nogit-'));
    try {
      const run = spawnSync('node', [join(repo, 'scripts', 'setup-hooks.mjs')], { cwd: noGit, encoding: 'utf8' });
      expect(run.status).toBe(0);
    } finally {
      rmSync(noGit, { recursive: true, force: true });
    }
  });
});
