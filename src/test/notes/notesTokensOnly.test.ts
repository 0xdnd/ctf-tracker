import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const notesDir = path.join(root, 'components/notes');
const files = [
  ...fs
    .readdirSync(notesDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(notesDir, f)),
  path.join(root, 'components/cheatsheet/ObsidianNoteViewer.tsx'),
  path.join(root, 'components/cheatsheet/ObsidianTabContent.tsx'),
];

// Literal colors that bypass the ZeroBox tokens. UI text such as `#tag` or `#add` is not flagged:
// 3-4 digit hex only counts when it is the whole content of a quoted string.
const LITERAL_COLOR = new RegExp(
  [
    String.raw`\[#[0-9a-fA-F]{3,8}\]`, // tailwind arbitrary color
    String.raw`#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b`, // 6 and 8 digit hex anywhere
    String.raw`(['"\x60])#[0-9a-fA-F]{3,4}\1`, // quoted short hex
    String.raw`\b(?:rgba?|hsla?)\(`, // functional literals
    String.raw`\b(?:text|bg|border|ring|fill|stroke|from|to|via|outline|shadow|divide)-(?:white|black)\b`,
  ].join('|'),
);

describe('notes components use ZeroBox tokens only', () => {
  it('covers the expected files', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files.map((f) => [path.relative(root, f), f]))('%s has no literal colors', (_name, file) => {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const hits = lines
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => LITERAL_COLOR.test(line))
      .map(({ line, n }) => `${n}: ${line.trim().slice(0, 120)}`);
    expect(hits).toEqual([]);
  });

  it('the guard catches each literal form', () => {
    for (const bad of ['text-white', 'bg-black/50', 'bg-[#fff]', "'#1a2b3c'", "'#fff'", 'rgb(0 0 0)', 'hsl(10 20% 30%)', 'rgba(1,2,3,.4)']) {
      expect(LITERAL_COLOR.test(bad), bad).toBe(true);
    }
    for (const ok of ['#tag', '#add', '#{t}', 'bg-surface-base', 'text-primary']) {
      expect(LITERAL_COLOR.test(ok), ok).toBe(false);
    }
  });
});
