import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Static guard: native blocking dialogs (alert / confirm / prompt) are forbidden
 * in application source. Use useToastStore().showToast and the in-app
 * ConfirmDialog / modal flows instead.
 */
const SRC_ROOT = path.resolve(__dirname, '..', '..');

const NATIVE_CALL = /(?<![\w.])(alert|confirm|prompt)\s*\(/;
const WINDOW_CALL = /window\.(alert|confirm|prompt)/;

function isExcluded(rel: string): boolean {
  const norm = rel.split(path.sep).join('/');
  return (
    norm.startsWith('test/') ||
    norm.startsWith('data/') ||
    /\.test\.[tj]sx?$/.test(norm) ||
    /\.spec\.[tj]sx?$/.test(norm) ||
    norm.endsWith('.d.ts')
  );
}

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !isExcluded(path.relative(SRC_ROOT, full))) {
      out.push(full);
    }
  }
  return out;
}

describe('no native dialogs in application source', () => {
  const files = collect(SRC_ROOT);

  it('scans a non-trivial set of source files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('contains no alert()/confirm()/prompt() or window.alert/confirm/prompt calls', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (NATIVE_CALL.test(line) || WINDOW_CALL.test(line)) {
          offenders.push(`${path.relative(SRC_ROOT, file).split(path.sep).join('/')}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, `Native dialogs found:\n${offenders.join('\n')}`).toEqual([]);
  });
});
