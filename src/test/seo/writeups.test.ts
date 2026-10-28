import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const req = createRequire(import.meta.url);
const { loadWriteups } = req('../../../scripts/lib/writeups.cjs');
const { applyCsp } = req('../../../scripts/lib/csp.cjs');

const SLUG = 'htb-kobold';
const TECH = new Set(['command-injection', 'linux-suid', 'sudo-misconfig']);
const MACHINES = new Map([
  [SLUG, { slug: SLUG, platform: 'HTB', os: 'Linux', difficulty: 'Easy', hasPage: true }],
  ['htb-nopage', { slug: 'htb-nopage', platform: 'HTB', os: 'Linux', difficulty: 'Easy', hasPage: false }],
]);
const TAKEAWAY = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ');
const SENTENCE = 'Placeholder prose for the fixture that only exists to reach the word count and say nothing real.';
const PROSE = Array.from({ length: 24 }, () => SENTENCE).join(' ');
const LINKS = '[a](/techniques/command-injection/) [b](/techniques/linux-suid/) [c](/techniques/sudo-misconfig/)';
const PERSONAL = ' I spent 2 hours on it.';
const BODY = `## Summary\n\n${PROSE}${PERSONAL} ${LINKS}\n\n## Approach\n\nApproach text.\n\n### Detail\n\nMore text.\n\n## Key steps\n\n1. First step.\n\n\`\`\`text\ncode block\n\`\`\`\n\n## What I would do differently\n\nA retrospective sentence.\n`;
const FRONT: Record<string, unknown> = {
  machine: SLUG,
  platform: 'HTB',
  os: 'Linux',
  difficulty: 'Easy',
  solved: '2026-01-15',
  time: 2,
  tags: '[IDOR, Command Injection]',
  takeaway: `"${TAKEAWAY}"`,
  timeBreakdown: '\n  - [Recon, 30]\n  - [Foothold, 60]\n  - [Root, 30]',
};

function doc(front: Record<string, unknown> = {}, body = BODY) {
  const f = { ...FRONT, ...front };
  const yaml = Object.entries(f)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `---\n${yaml}\n---\n\n${body}`;
}

let tmp: string;
function dirWith(files: Record<string, string>) {
  const d = fs.mkdtempSync(path.join(tmp, 'wu-'));
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(d, n), c);
  return d;
}
const load = (files: Record<string, string>, today = '2026-10-21') => loadWriteups({ dir: dirWith(files), machinesBySlug: MACHINES, techSlugs: TECH, today });
const withBody = (extra: string) => BODY.replace('A retrospective sentence.', `A retrospective sentence.\n\n${extra}`);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('writeups loader: validation', () => {
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zerobox-writeups-'));
  });
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('accepts a valid writeup and renders sections with ids', () => {
    const [w] = load({ [`${SLUG}.md`]: doc() });
    expect(w.slug).toBe(SLUG);
    expect(w.toc.map((t: { text: string }) => t.text)).toEqual(['Summary', 'Approach', 'Key steps', 'What I would do differently']);
    expect(w.html).toContain('<h2 id="w-summary">Summary</h2>');
  });

  it('skips underscore files, README and drafts (drafts are not validated)', () => {
    expect(load({ '_example.md': 'not even frontmatter', 'README.md': '# readme', [`${SLUG}.md`]: doc({ draft: true, time: -1 }) })).toEqual([]);
  });

  const cases: [string, Record<string, unknown>, string, string][] = [
    ['missing key', { difficulty: undefined }, BODY, 'missing frontmatter key "difficulty"'],
    ['bad enum', { platform: 'XYZ' }, BODY, 'platform must be one of'],
    ['future date', { solved: '2026-12-31' }, BODY, 'in the future'],
    ['takeaway too short', { takeaway: '"too short"' }, BODY, 'takeaway must be 40-60 words'],
    ['time breakdown mismatch', { timeBreakdown: '\n  - [Recon, 5]' }, BODY, 'timeBreakdown sums'],
    ['too few words', {}, `## Summary\n\nShort. I took 2 hours. ${LINKS}\n\n## Approach\n\nA.\n\n## Key steps\n\nB.\n`, 'at least 250 words'],
    ['too few technique links', {}, BODY.replace(LINKS, '[a](/techniques/command-injection/)'), 'at least 3 distinct links'],
    ['raw HTML', {}, withBody('<b>bold</b>'), 'raw HTML'],
    ['javascript link', {}, withBody('[x](javascript:alert(1))'), 'javascript:'],
    ['image', {}, withBody('![alt](/img/x.png)'), 'images are not allowed'],
    ['unknown H2', {}, withBody('## Extras\n\ntext'), 'H2 "Extras" is not allowed'],
    ['32-hex lowercase', {}, withBody('hash 0123456789abcdef0123456789abcdef here'), '32-character hex'],
    ['32-hex uppercase', {}, withBody('hash 0123456789ABCDEF0123456789ABCDEF here'), '32-character hex'],
    ['flag format', {}, withBody('ABC{abcdefgh}'), 'looks like a flag'],
    ['user.txt with hash', {}, withBody('cat user.txt gives 0123456789abcdef0123456789abcdef0123abcd'), 'user.txt/root.txt'],
    ['noindex key', { noindex: true }, BODY, 'noindex is not supported for machine pages; use draft: true'],
    ['flag with allow-hash', {}, withBody('ABC{abcdefgh} <!-- allow-hash -->'), 'looks like a flag'],
    ['script tag', {}, withBody('<script>alert(1)</script>'), 'raw HTML'],
    ['img onerror', {}, withBody('<img src=x onerror=alert(1)>'), 'raw HTML'],
    ['protocol-relative link', {}, withBody('[x](//evil.com)'), 'must be https:// or site-relative'],
    ['content before first H2', {}, `Intro text.\n\n${BODY}`, 'content before the first H2'],
    ['non-emitted technique hub', {}, BODY.replace('/techniques/sudo-misconfig/', '/techniques/not-a-hub/'), 'at least 3 distinct links'],
    ['no personal data point', {}, BODY.replace(PERSONAL, ''), 'personal data point'],
  ];
  it.each(cases)('rejects: %s', (_name, front, body, msg) => {
    expect(() => load({ [`${SLUG}.md`]: doc(front, body) })).toThrow(new RegExp(`^${SLUG}\\.md: .*${escRe(msg)}`));
  });

  it('rejects a machine without a page, and a file name that differs from machine', () => {
    expect(() => load({ 'htb-nopage.md': doc({ machine: 'htb-nopage' }) })).toThrow(/htb-nopage\.md: machine "htb-nopage" has no page/);
    expect(() => load({ 'htb-other.md': doc() })).toThrow(/htb-other\.md: machine "htb-kobold" must equal the file name/);
  });

  it('allow-hash permits a hash line and is stripped from the output', () => {
    const [w] = load({ [`${SLUG}.md`]: doc({}, withBody('hash 0123456789abcdef0123456789abcdef here <!-- allow-hash -->')) });
    expect(w.html).toContain('0123456789abcdef0123456789abcdef');
    expect(w.html).not.toContain('allow-hash');
  });
});

describe('SEO generator: on-site writeup in the machine page', () => {
  const out: Record<string, { dist: string; html: string; sitemap: string; llms: string }> = {};

  function build(label: string, files: Record<string, string> | null) {
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
    for (const s of shots)
      for (const v of s.srcset || []) {
        const f = path.join(dist, v.src.replace(/^\//, ''));
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, '');
      }
    const env: NodeJS.ProcessEnv = { ...process.env, GEN_CONTENT_DIST: dist, MACHINE_NOTES_FILE: path.join(tmp, 'no-notes.json') };
    if (files) env.WRITEUPS_DIR = dirWith(files);
    else delete env.WRITEUPS_DIR;
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gen-content-pages.cjs')], { cwd: ROOT, env, stdio: 'pipe' });
    out[label] = {
      dist,
      html: fs.readFileSync(path.join(dist, 'machines', SLUG, 'index.html'), 'utf8'),
      sitemap: fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8'),
      llms: fs.readFileSync(path.join(dist, 'llms-full.txt'), 'utf8'),
    };
  }

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zerobox-writeups-gen-'));
    build('base', null);
    build('with', { [`${SLUG}.md`]: doc() });
    build('draft', { [`${SLUG}.md`]: doc({ draft: true }) });
  }, 480000);
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const pick = (html: string) => ({
    title: (/<title>[^<]*<\/title>/.exec(html) || [])[0],
    description: (/<meta name="description" content="[^"]*"/.exec(html) || [])[0],
    h1: (/<h1>[^<]*<\/h1>/.exec(html) || [])[0],
  });
  const articleLd = (html: string) =>
    [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((o) => o['@type'] === 'TechArticle');

  it('renders the writeup section: takeaway, meta strip, TOC, sections and time table', () => {
    const html = out.with.html;
    expect(html).toContain('<section id="writeup"');
    expect(html).toContain('<h2>Key takeaway</h2>');
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('<h2 id="w-summary">Summary</h2>');
    expect(html).toContain('<table class="wu-time"><caption>');
    expect(html).toContain('<th scope="col">Phase</th>');
    expect(html.match(/<a class="btn" href="\/tracker\/\?target=[^"]+"/g)).toHaveLength(2);
    expect(html).not.toContain('Track this machine in ZeroBox');
    expect(html).not.toContain('Attack path summary');
    expect(html).not.toContain('name="robots"');
  });

  it('hero CTA: tracker is the primary button, the platform room a secondary link', () => {
    const html = fs.readFileSync(path.join(out.base.dist, 'machines', 'htb-cap', 'index.html'), 'utf8');
    const box = /<div class="cta-actions">([\s\S]*?)<\/div>/.exec(html)![1];
    expect(box).toMatch(/^<a class="btn" href="\/tracker\/\?target=htb-cap"[^>]*>Open Cap in the tracker/);
    expect(box).toMatch(/<a class="link-arrow" href="https:\/\/[^"]*hackthebox[^"]*"[^>]*>Open Cap on Hack The Box/);
  });

  it('default build (no non-underscore writeups) and drafts leave the page without a writeup', () => {
    for (const k of ['base', 'draft']) {
      expect(out[k].html).not.toContain('id="writeup"');
      expect(out[k].html).toContain('Attack path summary');
    }
    expect(out.draft.html).toBe(out.base.html);
  });

  it('writeup pages present themselves as writeups; pages without one are unchanged', () => {
    const a = pick(out.base.html);
    const w = pick(out.with.html);
    expect(a.h1).toContain('attack path and techniques');
    expect(w.h1).toBe('<h1>Kobold writeup and attack path</h1>');
    expect(w.title).toContain('Writeup');
    expect(a.title).not.toContain('Writeup');
    expect(out.with.html).not.toContain('Read the writeup');
    const slugs = fs.readdirSync(path.join(out.base.dist, 'machines'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    expect(slugs.length).toBeGreaterThan(10);
    for (const s of slugs.filter((x) => ![SLUG, 'htb-blue', 'htb-cap'].includes(x))) {
      const read = (d: string) => pick(fs.readFileSync(path.join(d, 'machines', s, 'index.html'), 'utf8'));
      expect(read(out.with.dist), s).toEqual(read(out.base.dist));
    }
  });

  it('htb-cap (real on-site writeup): H1, title and hero anchor say writeup', () => {
    const html = fs.readFileSync(path.join(out.base.dist, 'machines', 'htb-cap', 'index.html'), 'utf8');
    const p = pick(html);
    expect(p.h1).toBe('<h1>Cap writeup and attack path</h1>');
    expect(p.title).toContain('Writeup');
    const box = /<div class="cta-actions">([\s\S]*?)<\/div>/.exec(html)![1];
    expect(box).not.toContain('Read the writeup');
  });

  it('JSON-LD names the author by @id and carries the solved date as datePublished', () => {
    const o = articleLd(out.with.html);
    expect(o.author['@id']).toBe('https://ctftracker.com/about/#person');
    expect(o.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(o.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.with.html.match(/"author"/g)).toHaveLength(1);
  });

  it('the page stays in the sitemap and llms-full', () => {
    expect(out.with.sitemap).toContain(`/machines/${SLUG}/`);
    expect(out.with.llms).toContain(`/machines/${SLUG}/`);
  });

  it('CSP stays valid on the machine page', () => {
    const r = applyCsp(out.with.html);
    expect(r.html).toContain('Content-Security-Policy');
    expect(r.html).not.toMatch(/style-src[^;]*unsafe-inline/);
  });
});
