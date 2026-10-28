import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const run = (script: string, args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

let tmp: string;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zerobox-toolkit-'));
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('redact-notes', () => {
  const HASH = 'a'.repeat(32);
  const notes = [`nmap 10.0.0.5 and 8.8.4.4`, `cat root.txt`, HASH, `flagx{abcdefgh}`, `[sudo] password for alice:`, `bob@box:~$ id`, `![[shot.png]]`, `![x](a.png)`].join('\n');

  it('dry run reports masked findings and writes nothing', () => {
    const f = path.join(tmp, 'n1.md');
    fs.writeFileSync(f, notes);
    const r = run('redact-notes.cjs', [f]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/line 1: private\/VPN IP/);
    expect(r.out).toMatch(/line 3: /);
    expect(r.out).toMatch(/image embed/);
    expect(r.out).not.toContain(HASH);
    expect(r.out).not.toContain('abcdefgh');
    expect(fs.existsSync(path.join(tmp, 'n1.redacted.md'))).toBe(false);
  });

  it('--write produces a redacted copy and leaves the original', () => {
    const f = path.join(tmp, 'n2.md');
    fs.writeFileSync(f, notes);
    expect(run('redact-notes.cjs', [f, '--write']).code).toBe(0);
    const red = fs.readFileSync(path.join(tmp, 'n2.redacted.md'), 'utf8');
    expect(red).toContain('TARGET_LOCAL');
    expect(red).toContain('TARGET');
    expect(red).not.toContain(HASH);
    expect(red).not.toContain('abcdefgh');
    expect(red).toContain('password for user:');
    expect(red).toContain('user@box');
    expect(red).not.toContain('alice');
    expect(fs.readFileSync(f, 'utf8')).toBe(notes);
  });

  it('exits 1 on a missing file', () => {
    expect(run('redact-notes.cjs', [path.join(tmp, 'nope.md')]).code).toBe(1);
  });
});

describe('check-writeups', () => {
  const validPath = path.join(ROOT, 'content', 'writeups', 'htb-blue.md');

  it('passes the repo writeups and prints stats', () => {
    const r = run('check-writeups.cjs', []);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/OK\s+htb-blue\.md/);
    expect(r.out).toMatch(/prose words: \d+; takeaway words: \d+/);
  });

  it('checks a single valid file by path', () => {
    expect(run('check-writeups.cjs', [validPath]).code).toBe(0);
  });

  it('checks a draft file by path and reports a clean failure', () => {
    const raw = fs.readFileSync(validPath, 'utf8').replace(/^takeaway:.*$/m, 'takeaway: too short');
    const f = path.join(tmp, 'htb-blue.md');
    fs.writeFileSync(f, raw.replace(/^---\r?\n/, '---\ndraft: true\n'));
    const r = run('check-writeups.cjs', [f]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('FAIL htb-blue.md: takeaway must be 40-60 words');
  });

  it('reports a missing key with the exact message', () => {
    const raw = fs.readFileSync(validPath, 'utf8').replace(/^difficulty:.*\r?\n/m, '');
    const f = path.join(tmp, 'htb-blue.md');
    fs.writeFileSync(f, raw);
    const r = run('check-writeups.cjs', [f]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('FAIL htb-blue.md: missing frontmatter key "difficulty"');
  });

  it('--help lists technique slugs', () => {
    const r = run('check-writeups.cjs', ['--help']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Allowed technique slugs');
    expect(r.out).toContain('smb');
  });

  it('does not crash on the blank template', () => {
    const r = run('check-writeups.cjs', [path.join(ROOT, 'tools', 'writeups', 'TEMPLATE.md')]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^FAIL TEMPLATE\.md: /m);
  });
});
