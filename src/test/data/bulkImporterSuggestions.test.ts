import { describe, it, expect } from 'vitest';
import { extractCandidateNames, matchCandidateNamesToCatalog, suggestCatalogMatches } from '../../utils/bulkPwnImporter';
import type { Machine } from '../../types';

const box = (over: Partial<Machine>): Machine => ({
  id: 'x', name: 'X', ip: '10.10.x.x', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'backlog',
  tags: [], certifications: [], timeSpentSeconds: 0,
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', ...over,
});

const catalog = (): Machine[] => [
  box({ id: 'thm-retro', name: 'Retro', platform: 'THM' }),
  box({ id: 'htb-retro', name: 'Retro', platform: 'HTB' }),
  box({ id: 'htb-lame', name: 'Lame' }),
  box({ id: 'htb-forest', name: 'Forest' }),
  box({ id: 'htb-sauna', name: 'Sauna' }),
  box({ id: 'thm-pickle-rick', name: 'Pickle Rick', platform: 'THM' }),
  box({ id: 'pg-sauna', name: 'Saunas', platform: 'PG' }),
];

describe('extractCandidateNames lists', () => {
  it('keeps every name of a single comma-separated line', () => {
    expect(extractCandidateNames('Blue, Lame, Retro, Forest')).toEqual(['Blue', 'Lame', 'Retro', 'Forest']);
  });
  it('keeps only the first column of multi-line rows', () => {
    expect(extractCandidateNames('Forest,Active Directory\nLame,10.10.10.3')).toEqual(['Forest', 'Lame']);
    expect(extractCandidateNames('Lame,10.10.10.3,Retired\nForest,x')).toEqual(['Lame', 'Forest']);
  });
  it('still reads metadata rows as one name per row', () => {
    expect(extractCandidateNames('Name,Difficulty\nLame,Easy,Linux\nForest,Medium')).toEqual(['Lame', 'Forest']);
  });
});

describe('suggestCatalogMatches', () => {
  it('suggests close spellings and returns at most three', () => {
    expect(suggestCatalogMatches('Forrest', catalog())[0].id).toBe('htb-forest');
    expect(suggestCatalogMatches('Sauna', catalog(), 1)).toHaveLength(1);
    expect(suggestCatalogMatches('Re', catalog(), 3).length).toBeLessThanOrEqual(3);
  });
  it('finds partial names and ignores platform prefixes', () => {
    expect(suggestCatalogMatches('Pickle', catalog())[0].id).toBe('thm-pickle-rick');
    expect(suggestCatalogMatches('HTB - Lamee', catalog())[0].id).toBe('htb-lame');
  });
  it('returns nothing for blank or hopeless input', () => {
    expect(suggestCatalogMatches('', catalog())).toEqual([]);
    expect(suggestCatalogMatches('zzzzqqqq', catalog())).toEqual([]);
  });
  it('prefers the chosen platform among equal suggestions', () => {
    expect(suggestCatalogMatches('Retr0', catalog(), 3, { preferPlatform: 'HTB' })[0].id).toBe('htb-retro');
  });
});

describe('platform bias in matching', () => {
  const idFor = (raw: string, prefer?: 'HTB' | 'THM') =>
    matchCandidateNamesToCatalog([raw], catalog(), prefer ? { preferPlatform: prefer } : undefined).allMatches[0]?.machineId;
  it('is a no-op by default', () => {
    expect(idFor('Retro')).toBe('thm-retro');
  });
  it('steers unprefixed names to the chosen platform', () => {
    expect(idFor('Retro', 'HTB')).toBe('htb-retro');
    expect(idFor('Retro', 'THM')).toBe('thm-retro');
  });
  it('lets an explicit prefix win over the bias', () => {
    expect(idFor('[THM] Retro', 'HTB')).toBe('thm-retro');
  });
  it('falls back when the chosen platform lacks the name', () => {
    expect(idFor('Lame', 'THM')).toBe('htb-lame');
  });
});
