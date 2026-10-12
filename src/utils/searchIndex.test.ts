import { describe, it, expect } from 'vitest';
import { buildSearchIndex, getSearchIndex, searchDocs, stripMarkdown } from './searchIndex';
import type { CptsNoteEntry } from './obsidianManualUtils';

const note = (id: string, title: string, rawMarkdown: string): CptsNoteEntry =>
  ({ id, title, titleEn: title, rawMarkdown, summary: '' }) as unknown as CptsNoteEntry;

describe('stripMarkdown', () => {
  it('removes syntax but keeps readable text', () => {
    const out = stripMarkdown('# Title\n\n**bold** and [link](http://x.y) `code`\n- item\n```bash\nnmap -sV\n```');
    expect(out).toBe('Title bold and link code item nmap -sV');
  });
  it('resolves wikilinks and images', () => {
    expect(stripMarkdown('see [[Kerberos|krb]] ![alt](a.png)')).toBe('see krb alt');
  });
});

describe('searchDocs ranking and snippets', () => {
  const index = buildSearchIndex({
    customNotes: [
      note('a', 'Kerberos attacks', 'roasting tickets'),
      note('b', 'Notes on kerberos', 'misc'),
      note('c', 'Pivoting', 'use chisel for a socks proxy through the kerberos host'),
      note('d', 'kerberos', 'exact'),
    ],
  });

  it('orders exact title, title prefix, title substring, then body', () => {
    const ids = searchDocs(index, 'kerberos').map((h) => h.doc.ref.id);
    expect(ids).toEqual(['d', 'a', 'b', 'c']);
  });

  it('returns a short snippet with highlight ranges that line up', () => {
    const hit = searchDocs(index, 'chisel')[0];
    expect(hit.doc.ref.id).toBe('c');
    expect(hit.snippetRanges).toHaveLength(1);
    const [s, e] = hit.snippetRanges[0];
    expect(hit.snippet.slice(s, e).toLowerCase()).toBe('chisel');
    expect(hit.snippet.length).toBeLessThanOrEqual(125);
  });

  it('highlights title matches and requires all tokens', () => {
    const hit = searchDocs(index, 'notes kerberos')[0];
    expect(hit.doc.ref.id).toBe('b');
    expect(hit.titleRanges.length).toBe(2);
    expect(searchDocs(index, 'kerberos zzz')).toEqual([]);
  });

  it('does not match machine names for machine-derived note/writeup docs', () => {
    const idx = buildSearchIndex({
      machines: [{ id: 'm1', name: 'Lame', quickNotes: 'samba usermap', writeupMarkdown: '## Foothold\nCVE-2007-2447' }],
    });
    expect(searchDocs(idx, 'lame')).toEqual([]);
    expect(searchDocs(idx, 'usermap')[0].doc.section).toBe('notes');
    expect(searchDocs(idx, 'foothold')[0].doc.section).toBe('writeups');
  });
});

describe('secret safety', () => {
  it('never indexes credential secrets, loot values/notes or machine flags', () => {
    const SECRET = 'Sup3rS3cretPassw0rd!';
    const HASH = 'aad3b435b51404eeaad3b435b51404ee';
    const FLAG = 'HTB{do_not_find_me}';
    const idx = buildSearchIndex({
      machines: [{ id: 'm1', name: 'Box', userFlag: FLAG, rootFlag: FLAG, quickNotes: 'plain' } as never],
      credentials: [
        { id: 'c1', type: 'password', username: 'admin', secret: SECRET, notes: SECRET } as never,
        { id: 'c2', type: 'hash', username: 'svc', secret: HASH } as never,
      ],
      lootItems: [{ id: 'l1', category: 'flag', title: 'User flag', value: FLAG, notes: SECRET, username: SECRET } as never],
    });
    for (const q of [SECRET, SECRET.toLowerCase(), HASH, FLAG, 'do_not_find_me', 'sup3rs3cret']) {
      expect(searchDocs(idx, q)).toEqual([]);
    }
    expect(JSON.stringify(idx)).not.toContain(SECRET);
    expect(JSON.stringify(idx)).not.toContain(HASH);
    expect(JSON.stringify(idx)).not.toContain(FLAG);
    // Titles and types remain findable.
    expect(searchDocs(idx, 'user flag')[0].doc.section).toBe('vault');
    expect(searchDocs(idx, 'admin')[0].doc.ref.kind).toBe('credential');
  });
});

describe('getSearchIndex memoization', () => {
  it('reuses the index while input identity is unchanged', () => {
    const notes = [note('a', 'A', 'x')];
    expect(getSearchIndex({ customNotes: notes })).toBe(getSearchIndex({ customNotes: notes }));
    expect(getSearchIndex({ customNotes: [...notes] })).not.toBe(getSearchIndex({ customNotes: notes }));
  });
});

describe('performance', () => {
  it('searches ~1000 machines with notes and writeups quickly', () => {
    const filler = 'lorem ipsum dolor sit amet enumerate service banner credential reuse ';
    const machines = Array.from({ length: 1000 }, (_, i) => ({
      id: `m${i}`,
      name: `Machine${i}`,
      quickNotes: filler.repeat(20) + (i === 777 ? ' needleinhaystack' : ''),
      writeupMarkdown: `## Recon\n${filler.repeat(60)}`,
    }));
    const customNotes = Array.from({ length: 200 }, (_, i) => note(`n${i}`, `Note ${i}`, filler.repeat(30)));
    const idx = buildSearchIndex({ machines, customNotes });

    const timings: number[] = [];
    let hits = 0;
    for (const q of ['needleinhaystack', 'enum', 'credential reuse', 'zzzznomatch']) {
      const t0 = performance.now();
      const r = searchDocs(idx, q);
      timings.push(performance.now() - t0);
      if (q === 'needleinhaystack') hits = r.length;
    }
    expect(hits).toBe(1);
    // Target is <16ms per keystroke; the CI bound is deliberately generous.
    expect(Math.max(...timings)).toBeLessThan(150);
  });
});
