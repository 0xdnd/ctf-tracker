import { describe, it, expect } from 'vitest';
import {
  buildNoteIndex,
  extractInlineTags,
  extractLinkTargets,
  resolveExact,
} from '../../utils/noteIndex';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

function note(id: string, title: string, extra: Partial<CptsNoteEntry> = {}): CptsNoteEntry {
  return {
    id,
    title,
    titleEn: title,
    category: '',
    rawCategory: '',
    subCategory: '',
    tags: [],
    difficulty: '',
    summary: '',
    commands: [],
    relPath: `${title}.md`,
    rawMarkdown: '',
    ...extra,
  };
}

describe('extractInlineTags', () => {
  it('extracts and lowercases, keeps nesting', () => {
    expect(extractInlineTags('see #web/sqli and #Recon')).toEqual(['web/sqli', 'recon']);
  });
  it('ignores headings', () => {
    expect(extractInlineTags('# Heading\n## Two')).toEqual([]);
  });
  it('ignores code, fences and url fragments', () => {
    expect(
      extractInlineTags('`#notatag` and\n```\n#nope\n```\nhttps://x.io/#frag #ok'),
    ).toEqual(['ok']);
  });
  it('does not count a tag glued to an inline code span', () => {
    expect(extractInlineTags('`c`#glued and `c` #spaced')).toEqual(['spaced']);
  });
  it('requires a leading letter and supports unicode', () => {
    expect(extractInlineTags('#123')).toEqual([]);
    expect(extractInlineTags('#רשת')).toEqual(['רשת']);
  });
});

describe('extractLinkTargets', () => {
  it('returns raw targets, skipping code', () => {
    expect(extractLinkTargets('[[A]] [[B#Sec|alias]] `[[C]]` \n```\n[[D]]\n```')).toEqual(['A', 'B']);
  });
});

describe('buildNoteIndex', () => {
  it('builds outgoing and backlinks without self or missing', () => {
    const idx = buildNoteIndex([
      note('a', 'A', { rawMarkdown: '[[B]] [[A]] [[missing]]' }),
      note('b', 'B'),
    ]);
    expect(idx.outgoing.get('a')).toEqual(['b']);
    expect(idx.backlinks.get('b')).toEqual(['a']);
    expect(idx.backlinks.get('a') ?? []).toEqual([]);
  });

  it('sorts backlinks by source title', () => {
    const idx = buildNoteIndex([
      note('1', 'Zed', { rawMarkdown: '[[T]]' }),
      note('2', 'Alpha', { rawMarkdown: '[[T]]' }),
      note('3', 'T'),
    ]);
    expect(idx.backlinks.get('3')).toEqual(['2', '1']);
  });

  it('resolves by title, filename, relPath and numeric prefix; not substrings', () => {
    const idx = buildNoteIndex([
      note('p', 'Privesc', { filename: 'privesc-notes.md', relPath: 'linux/02 - Privesc.md' }),
    ]);
    const l = idx.titleLookup;
    expect(resolveExact('Privesc', l)).toBe('p');
    expect(resolveExact('privesc-notes', l)).toBe('p');
    expect(resolveExact('linux/02 - Privesc', l)).toBe('p');
    expect(resolveExact('02 - Privesc', l)).toBe('p');
    expect(resolveExact('Priv', l)).toBeUndefined();
  });

  it('resolves duplicate titles to the lowest id', () => {
    const idx = buildNoteIndex([
      note('z', 'Dup'),
      note('m', 'Dup'),
      note('s', 'S', { rawMarkdown: '[[Dup]]' }),
    ]);
    expect(idx.outgoing.get('s')).toEqual(['m']);
  });

  it('merges field and inline tags once', () => {
    const idx = buildNoteIndex([note('a', 'A', { tags: ['Web'], rawMarkdown: '#web #api' })]);
    expect(idx.tags.get('web')).toEqual(['a']);
    expect(idx.tags.get('api')).toEqual(['a']);
  });

  it('builds 2,000 notes quickly', () => {
    const notes: CptsNoteEntry[] = [];
    for (let i = 0; i < 2000; i++) {
      const links = [1, 2, 3, 4, 5].map((k) => `[[Note ${(i + k * 37) % 2000}]]`).join(' ');
      notes.push(note(`n${i}`, `Note ${i}`, { rawMarkdown: `${links} #t${i % 7} #u${i % 11} #v${i % 13}` }));
    }
    const t0 = performance.now();
    const idx = buildNoteIndex(notes);
    const ms = performance.now() - t0;
    console.info(`buildNoteIndex(2000 notes): ${ms.toFixed(1)} ms`);
    expect(idx.outgoing.get('n0')!.length).toBe(5);
    expect(ms).toBeLessThan(200);
  });
});
