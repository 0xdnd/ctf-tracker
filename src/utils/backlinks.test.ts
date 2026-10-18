import { describe, it, expect } from 'vitest';
import { extractWikiLinks, buildBacklinkIndex, INLINE_TOKEN_REGEX } from './backlinks';

describe('extractWikiLinks', () => {
  it('normalizes alias, heading, case and whitespace', () => {
    expect(extractWikiLinks('see [[ Nmap Basics |scan]] and [[Kerberos#Roasting]] and [[NMAP basics]]'))
      .toEqual(['nmap basics', 'kerberos']);
  });
  it('returns empty for no links', () => {
    expect(extractWikiLinks('plain [text](https://x.io)')).toEqual([]);
    expect(extractWikiLinks('')).toEqual([]);
  });
});

describe('buildBacklinkIndex', () => {
  it('indexes by normalized target and skips self-links', () => {
    const idx = buildBacklinkIndex([
      { id: '1', title: 'Alpha', kind: 'note', text: 'links [[Beta]] and [[alpha]]' },
      { id: '2', title: 'Box', kind: 'lab', text: '[[beta|b]]' },
    ]);
    expect(idx.get('beta')).toEqual([
      { id: '1', title: 'Alpha', kind: 'note' },
      { id: '2', title: 'Box', kind: 'lab' },
    ]);
    expect(idx.has('alpha')).toBe(false);
  });
});

describe('INLINE_TOKEN_REGEX', () => {
  it('splits wikilinks out as tokens', () => {
    expect('a [[B]] c'.split(INLINE_TOKEN_REGEX)).toEqual(['a ', '[[B]]', ' c']);
  });
});
