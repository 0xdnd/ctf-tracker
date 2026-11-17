import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const req = createRequire(import.meta.url);
const { SPLASH_RE, ROOT_RE } = req('../../../scripts/lib/splash.cjs');
const shell = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('boot splash prerender markers (real index.html)', () => {
  it('extracts the whole splash, with balanced divs', () => {
    const m = shell.match(SPLASH_RE);
    expect(m).not.toBeNull();
    const splash = m![0];
    expect(splash).toContain('id="boot-splash"');
    expect(splash).toContain('role="status"');
    expect(splash).toContain('Loading ZeroBox');
    expect(count(splash, /<div[\s>]/g)).toBe(count(splash, /<\/div>/g));
  });

  it('matches #root as one balanced block that holds only the splash', () => {
    const m = shell.match(ROOT_RE);
    expect(m).not.toBeNull();
    const root = m![0];
    expect(root).toContain('Loading ZeroBox');
    expect(count(root, /<div[\s>]/g)).toBe(count(root, /<\/div>/g));
    expect(root.endsWith('</div>')).toBe(true);
  });

  it('keeps the splash through a route-page rewrite', () => {
    const splash = shell.match(SPLASH_RE)![0];
    const page = shell.replace(ROOT_RE, () => `<div id="root"><main>seo</main>${splash}</div>`);
    expect(page).toContain('<main>seo</main>');
    expect(page.match(SPLASH_RE)![0]).toBe(splash);
    expect(count(page, /<div[\s>]/g)).toBe(count(page, /<\/div>/g));
  });
});
