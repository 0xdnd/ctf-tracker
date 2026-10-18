import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SLUG = 'htb-mongod';
const NOTE = 'First <b>para</b> & more.\n\nSecond paragraph.';

let tmp: string;
const distWith: Record<string, string> = {};

function build(label: string, notes: Record<string, string>) {
  const dist = path.join(tmp, label);
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>shell</title>');
  const routes: { path: string }[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'seo', 'routeMeta.json'), 'utf8'));
  for (const r of routes) {
    const dir = path.join(dist, r.path.replace(/^\/|\/$/g, ''));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>route</title>');
  }
  const shots: { srcset?: { src: string }[] }[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'templates', 'landing-shots.json'), 'utf8'));
  for (const s of shots) for (const v of s.srcset || []) {
    const f = path.join(dist, v.src.replace(/^\//, ''));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '');
  }
  const notesFile = path.join(tmp, `${label}.json`);
  fs.writeFileSync(notesFile, JSON.stringify(notes));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gen-content-pages.cjs')], {
    cwd: ROOT,
    env: { ...process.env, GEN_CONTENT_DIST: dist, MACHINE_NOTES_FILE: notesFile },
    stdio: 'pipe',
  });
  distWith[label] = fs.readFileSync(path.join(dist, 'machines', SLUG, 'index.html'), 'utf8');
}

describe('SEO generator: machine "My notes" section', () => {
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zerobox-notes-'));
    build('with', { [SLUG]: NOTE });
    build('without', {});
  }, 240000);

  afterAll(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('renders escaped paragraphs under the attack path summary when a note exists', () => {
    const html = distWith.with;
    expect(html).toContain('<h2>My notes</h2><p>First &lt;b&gt;para&lt;/b&gt; &amp; more.</p><p>Second paragraph.</p>');
    expect(html).not.toContain('<b>para</b>');
    expect(html.indexOf('Attack path summary')).toBeLessThan(html.indexOf('My notes'));
  });

  it('omits the section when there is no note', () => {
    expect(distWith.without).not.toContain('My notes');
  });
});
