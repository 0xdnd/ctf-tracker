import { describe, it, expect } from 'vitest';
import { rankNoteMatches, extractMatchSnippets } from '../../utils/noteSearch';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

function note(title: string, extra: Partial<CptsNoteEntry> = {}): CptsNoteEntry {
  return {
    id: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    titleEn: title,
    category: '',
    rawCategory: '',
    subCategory: '',
    tags: [],
    difficulty: '',
    summary: '',
    commands: [],
    relPath: `notes/${title.toLowerCase().replace(/\s+/g, '-')}.md`,
    ...extra,
  };
}

describe('rankNoteMatches', () => {
  it('ranks title matches above path matches above body-only matches regardless of input order', () => {
    const body = note('Plain Note', {
      relPath: 'misc/plain.md',
      rawMarkdown: 'This note talks about kerberos delegation.',
    });
    const path = note('Other Note', {
      relPath: 'kerberos/other.md',
      rawMarkdown: 'Nothing relevant here.',
    });
    const title = note('Kerberos Attack Chain', {
      relPath: 'misc/chain.md',
      rawMarkdown: 'Nothing relevant here.',
    });

    const results = rankNoteMatches('kerberos', [body, path, title]);

    expect(results.map((r) => r.field)).toEqual(['title', 'path', 'body']);
    expect(results.map((r) => r.note.title)).toEqual([
      'Kerberos Attack Chain',
      'Other Note',
      'Plain Note',
    ]);
  });

  it('matches titles fuzzily: each query token is a prefix or in-order subsequence of a title word', () => {
    const linux = note('Linux Privilege Escalation');
    const results = rankNoteMatches('lnx priv', [linux]);

    expect(results).toHaveLength(1);
    expect(results[0].field).toBe('title');
    expect(results[0].note.title).toBe('Linux Privilege Escalation');
  });

  it('returns no matches for a query that matches nothing', () => {
    expect(rankNoteMatches('zzz', [note('Linux Privilege Escalation')])).toEqual([]);
  });

  it('is case-insensitive', () => {
    const results = rankNoteMatches('LINUX', [note('linux basics')]);
    expect(results).toHaveLength(1);
  });

  it('matches Hebrew titles by prefix', () => {
    const hebrew = note('הרשאות', { titleEn: 'Permissions' });
    const results = rankNoteMatches('הרשא', [hebrew]);

    expect(results).toHaveLength(1);
    expect(results[0].field).toBe('title');
  });

  it('returns an empty list for an empty query', () => {
    expect(rankNoteMatches('', [note('Linux')])).toEqual([]);
    expect(rankNoteMatches('   ', [note('Linux')])).toEqual([]);
  });

  it('puts shorter titles first within the same tier', () => {
    const longer = note('Kerberos Attack Chain');
    const shorter = note('Kerberos');
    const results = rankNoteMatches('kerberos', [longer, shorter]);

    expect(results.map((r) => r.note.title)).toEqual(['Kerberos', 'Kerberos Attack Chain']);
  });

  it('caps results at the limit, defaulting to 20', () => {
    const notes = Array.from({ length: 25 }, (_, i) => note(`Scan ${i}`));
    expect(rankNoteMatches('scan', notes)).toHaveLength(20);
    expect(rankNoteMatches('scan', notes, 5)).toHaveLength(5);
  });
});

describe('extractMatchSnippets', () => {
  const body = [
    'intro line',
    'the word appears here',
    'nothing',
    'nothing',
    'word again',
    'nothing',
    'nothing',
    'nothing',
    'and a WORD here',
    'nothing',
    'nothing',
    'final word',
  ].join('\n');

  it('returns up to three snippets, one per matching line, with 1-based lines and match offsets', () => {
    const snippets = extractMatchSnippets(body, 'word');

    expect(snippets.map((s) => s.line)).toEqual([2, 5, 9]);
    for (const s of snippets) {
      expect(s.text.slice(s.start, s.end).toLowerCase()).toBe('word');
    }
    expect(snippets[0]).toEqual({
      line: 2,
      text: 'the word appears here',
      start: 4,
      end: 8,
    });
  });

  it('trims lines longer than 160 characters around the match with an ellipsis', () => {
    const long = 'x'.repeat(200) + ' Kerberos ' + 'y'.repeat(200);
    const [snippet] = extractMatchSnippets(long, 'kerberos');

    expect(snippet.line).toBe(1);
    expect(snippet.text.startsWith('…')).toBe(true);
    expect(snippet.text.endsWith('…')).toBe(true);
    expect(snippet.text.length).toBeLessThanOrEqual(162);
    expect(snippet.text.slice(snippet.start, snippet.end)).toBe('Kerberos');
  });

  it('returns no snippets for an empty query or when nothing matches', () => {
    expect(extractMatchSnippets(body, '')).toEqual([]);
    expect(extractMatchSnippets(body, 'absent-term')).toEqual([]);
  });
});
