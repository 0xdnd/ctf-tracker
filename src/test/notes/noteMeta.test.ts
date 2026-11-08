import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  isSameTitle,
  noteTitleCandidates,
  getTitleHeadingLine,
  getNoteOutline,
  countWords,
  getBacklinkSnippet,
} from '../../utils/noteMeta';
import { slugifyHeading } from '../../utils/workspaceLinkInterceptor';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const n = { title: 'Recon Basics', titleEn: 'Recon Basics' };
const mk = (id: string, body: string, extra: Partial<CptsNoteEntry> = {}): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown: body, ...extra }) as unknown as CptsNoteEntry;

describe('normalizeTitle / isSameTitle', () => {
  it('drops emoji and variation selectors, collapses spaces, lowercases', () => {
    expect(normalizeTitle('  🛡️ Recon \t  Basics ')).toBe('recon basics');
    expect(normalizeTitle('a‍b')).toBe('ab');
  });
  it('compares normalized titles', () => {
    expect(isSameTitle('🛡️ Recon   Basics', 'recon basics')).toBe(true);
    expect(isSameTitle('Recon', 'Recon Basics')).toBe(false);
  });
});

describe('noteTitleCandidates', () => {
  it('lists distinct non-empty titles', () => {
    expect(noteTitleCandidates({ title: 'A', titleEn: 'A', titleHe: 'ב' })).toEqual(['A', 'ב']);
    expect(noteTitleCandidates({ title: 'A', titleEn: '' })).toEqual(['A']);
  });
});

describe('getTitleHeadingLine', () => {
  it('finds the first h1 when it equals the title (emoji and spacing ignored)', () => {
    expect(getTitleHeadingLine('intro\n# 🛡️ Recon   Basics \n## A', n)).toBe(1);
  });
  it('returns -1 when the first h1 differs, even if a later one matches', () => {
    expect(getTitleHeadingLine('# Other\n# Recon Basics', n)).toBe(-1);
  });
  it('ignores h1 lines inside fenced code', () => {
    expect(getTitleHeadingLine('```\n# Recon Basics\n```\n# Recon Basics', n)).toBe(3);
    expect(getTitleHeadingLine('~~~\n# Recon Basics\n~~~', n)).toBe(-1);
  });
  it('does not treat h2 as the title line', () => {
    expect(getTitleHeadingLine('## Recon Basics', n)).toBe(-1);
  });
  it('matches any title candidate', () => {
    expect(getTitleHeadingLine('# Hebrew', { title: 'x', titleEn: 'x', titleHe: 'Hebrew' })).toBe(0);
  });
});

describe('getNoteOutline', () => {
  it('drops a leading h1 equal to the title, ignoring emoji and spacing', () =>
    expect(getNoteOutline('# 🛡️ Recon   Basics \n## Step one\n# Later', n).map((o) => o.text)).toEqual(['Step one', 'Later']));
  it('keeps a leading h1 that differs', () => expect(getNoteOutline('# Other\n## A', n)[0].text).toBe('Other'));
  it('does not drop a later h1 that matches when the first h1 differs', () =>
    expect(getNoteOutline('# Other\n# Recon Basics', n).map((o) => o.text)).toEqual(['Other', 'Recon Basics']));
  it('skips headings inside fenced code', () =>
    expect(getNoteOutline('```\n# not a heading\n```\n## Real', n).map((o) => o.text)).toEqual(['Real']));
  it('slug matches slugifyHeading', () => expect(getNoteOutline('## Step one', n)[0].slug).toBe(slugifyHeading('Step one')));
  it('records levels 1 to 3 and ignores deeper ones (the body gives only h1-h3 ids)', () =>
    expect(getNoteOutline('# a\n## b\n### c\n#### d\n##### e', { title: 'zz', titleEn: 'zz' }).map((o) => o.level)).toEqual([1, 2, 3]));
});

describe('countWords', () => {
  it('counts words', () => {
    expect(countWords('a  b\nc')).toBe(3);
    expect(countWords('')).toBe(0);
  });
});

describe('getBacklinkSnippet', () => {
  it('finds the linking line', () =>
    expect(getBacklinkSnippet(mk('A', 'x\nsee [[recon basics|here]] now'), { ...mk('B', ''), ...n })).toBe(
      'see [[recon basics|here]] now',
    ));
  it('falls back to the file name', () =>
    expect(
      getBacklinkSnippet(mk('A', 'x\n  see [[file-name#h]]  '), mk('B', '', { relPath: 'dir/file-name.md' })),
    ).toBe('see [[file-name#h]]'));
  it('returns an empty string when nothing links', () =>
    expect(getBacklinkSnippet(mk('A', 'plain'), mk('B', ''))).toBe(''));
});
