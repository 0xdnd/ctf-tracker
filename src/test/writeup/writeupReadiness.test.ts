import { describe, it, expect } from 'vitest';
import { computeWriteupReadiness } from '../../utils/writeupReadiness';

const TEMPLATE = [
  '# Box - Writeup',
  '## 2. Reconnaissance & Nmap Scan Results',
  '```bash',
  'nmap -sC -sV 10.0.0.1',
  '```',
  '- **Foothold Vector:** [Brief summary]',
  '- **Privilege Escalation Vector:** [Brief summary]',
  '```bash',
  'ffuf -u http://10.0.0.1/FUZZ',
  '```',
].join('\n');

describe('computeWriteupReadiness', () => {
  it('scores a fresh template at 0%', () => {
    const r = computeWriteupReadiness(TEMPLATE, TEMPLATE);
    expect(r.score).toBe(0);
    expect(r.checks.every((c) => !c.ok)).toBe(true);
  });

  it('scores empty content at 0%', () => {
    expect(computeWriteupReadiness('', TEMPLATE).score).toBe(0);
  });

  it('counts only lines added beyond the template', () => {
    const r = computeWriteupReadiness(`${TEMPLATE}\nGot a foothold via an exploit of the upload form.`, TEMPLATE);
    expect(r.checks.find((c) => c.id === 'foothold')?.ok).toBe(true);
    expect(r.checks.find((c) => c.id === 'privesc')?.ok).toBe(false);
  });

  it('subtracts template lines as a multiset', () => {
    const tpl = 'sudo thing\n';
    expect(computeWriteupReadiness('sudo thing', tpl).checks.find((c) => c.id === 'privesc')?.ok).toBe(false);
    expect(computeWriteupReadiness('sudo thing\nsudo thing', tpl).checks.find((c) => c.id === 'privesc')?.ok).toBe(true);
  });

  it('never subtracts code-fence lines, and counts blocks with own content for PoC', () => {
    const own = ['```bash', 'curl -s http://x/a', '```', '```bash', 'id', '```'].join('\n');
    const r = computeWriteupReadiness(own, '```bash\n```');
    expect(r.checks.find((c) => c.id === 'code')?.ok).toBe(true);
    const empty = computeWriteupReadiness('```bash\n```\n```bash\n```', '```bash\n```');
    expect(empty.checks.find((c) => c.id === 'code')?.ok).toBe(false);
  });

  it('recomputes the word count on the remaining text', () => {
    const extra = Array.from({ length: 260 }, (_, i) => `word${i}`).join(' ');
    const r = computeWriteupReadiness(`${TEMPLATE}\n${extra}`, TEMPLATE);
    expect(r.checks.find((c) => c.id === 'depth')?.ok).toBe(true);
    expect(computeWriteupReadiness(TEMPLATE, TEMPLATE).words).toBeLessThan(10);
  });
});
