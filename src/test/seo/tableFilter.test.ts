// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// public/table-filter.js is a classic browser script (the package is "type": "module"), so it is evaluated rather than required.
const src = readFileSync(new URL('../../../public/table-filter.js', import.meta.url), 'utf8');
const mod: { exports: Record<string, (...a: any[]) => any> } = { exports: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
new Function('module', src)(mod);
const { norm, makeRow, matches, sortRows, distinct, tagOptions, mixesDifficulty, countText } = mod.exports;

const row = (name: string, os: string, difficulty: string, platform: string, tags: string, idx: number) => makeRow({ name, os, difficulty, platform, tags }, idx);
const rows = [
  row('Lame', 'Linux', 'Easy', 'HTB', 'Exploit-modification|Samba|CVE-2007-2447', 0),
  row('Blue', 'Windows', 'Easy', 'THM', 'EternalBlue|SMB', 1),
  row('Active', 'Windows', 'Medium', 'HTB', 'Active Directory|Kerberoasting|SQL-Injection', 2),
  row('Zipping', 'Linux', 'Hard', 'HTB', '', 3),
  row('Bashed', 'Linux', 'Easy', 'HTB', 'Sudo', 4),
];
const names = (list: { name: string }[]) => list.map((r) => r.name);
const none = { q: '', os: '', difficulty: '', platform: '', tag: '' };

describe('table filter helpers', () => {
  it('normalizes case and separators', () => {
    expect(norm('  SQL-Injection / Union_based ')).toBe('sql injection union based');
    expect(norm(null)).toBe('');
  });
  it('splits tags and builds one search text from name and tags', () => {
    expect(rows[0].tags).toEqual(['Exploit-modification', 'Samba', 'CVE-2007-2447']);
    expect(rows[3].tags).toEqual([]);
    expect(rows[0].hay).toContain('lame');
    expect(rows[0].hay).toContain('samba');
  });
  it('matches everything with no constraints', () => {
    expect(rows.every((r) => matches(r, none))).toBe(true);
  });
  it('search is case-insensitive and covers name and tags', () => {
    expect(names(rows.filter((r) => matches(r, { ...none, q: 'LAME' })))).toEqual(['Lame']);
    expect(names(rows.filter((r) => matches(r, { ...none, q: 'sql injection' })))).toEqual(['Active']);
    expect(names(rows.filter((r) => matches(r, { ...none, q: 'sql-injection' })))).toEqual(['Active']);
    expect(names(rows.filter((r) => matches(r, { ...none, q: 'cve-2007' })))).toEqual(['Lame']);
    expect(rows.filter((r) => matches(r, { ...none, q: 'nothing like this' }))).toEqual([]);
  });
  it('filters by os, difficulty, platform and exact tag, and combines them', () => {
    expect(names(rows.filter((r) => matches(r, { ...none, os: 'Windows' })))).toEqual(['Blue', 'Active']);
    expect(names(rows.filter((r) => matches(r, { ...none, difficulty: 'Easy' })))).toEqual(['Lame', 'Blue', 'Bashed']);
    expect(names(rows.filter((r) => matches(r, { ...none, platform: 'THM' })))).toEqual(['Blue']);
    expect(names(rows.filter((r) => matches(r, { ...none, tag: 'smb' })))).toEqual(['Blue']);
    expect(names(rows.filter((r) => matches(r, { ...none, tag: 'SQL' })))).toEqual([]);
    expect(names(rows.filter((r) => matches(r, { ...none, os: 'Linux', difficulty: 'Easy', q: 'sudo' })))).toEqual(['Bashed']);
  });
  it('sorts by name both ways, by difficulty, and back to source order, without mutating the input', () => {
    const before = names(rows);
    expect(names(sortRows(rows, 'name-asc'))).toEqual(['Active', 'Bashed', 'Blue', 'Lame', 'Zipping']);
    expect(names(sortRows(rows, 'name-desc'))).toEqual(['Zipping', 'Lame', 'Blue', 'Bashed', 'Active']);
    expect(names(sortRows(rows, 'difficulty'))).toEqual(['Lame', 'Blue', 'Bashed', 'Active', 'Zipping']);
    expect(names(sortRows(sortRows(rows, 'name-desc'), ''))).toEqual(before);
    expect(names(rows)).toEqual(before);
  });
  it('sorts numbers inside names naturally and keeps unknown difficulties last', () => {
    const r = [row('Box 10', 'Linux', 'Easy', 'HTB', '', 0), row('Box 2', 'Linux', 'Weird', 'HTB', '', 1), row('Box 1', 'Linux', 'Insane', 'HTB', '', 2)];
    expect(names(sortRows(r, 'name-asc'))).toEqual(['Box 1', 'Box 2', 'Box 10']);
    expect(names(sortRows(r, 'difficulty'))).toEqual(['Box 10', 'Box 1', 'Box 2']);
  });
  it('lists the distinct values present, difficulty easiest first', () => {
    expect(distinct(rows, 'os')).toEqual(['Linux', 'Windows']);
    expect(distinct(rows, 'platform')).toEqual(['HTB', 'THM']);
    expect(distinct(rows, 'difficulty')).toEqual(['Easy', 'Medium', 'Hard']);
  });
  it('lists every tag on a small page, one entry per spelling-insensitive tag', () => {
    const t = tagOptions([...rows, row('Dup', 'Linux', 'Easy', 'HTB', 'samba|Sudo', 5)]);
    expect(t).toContain('Samba');
    expect(t.filter((x: string) => x.toLowerCase() === 'samba')).toHaveLength(1);
    expect(t).toContain('Active Directory');
  });
  it('drops one-off tags from the Tag select only when the page has many tags', () => {
    const many = Array.from({ length: 90 }, (_, i) => row('M' + i, 'Linux', 'Easy', 'HTB', 'Common|Only' + i, i));
    expect(tagOptions(many)).toEqual(['Common']);
  });
  it('offers the difficulty sort only when a single table mixes difficulties', () => {
    expect(mixesDifficulty([[rows[0], rows[1]], [rows[2]]])).toBe(false);
    expect(mixesDifficulty([[rows[0], rows[2]]])).toBe(true);
    expect(mixesDifficulty([])).toBe(false);
  });
  it('words the count the way the page announces it', () => {
    expect(countText(3, 1027)).toBe('Showing 3 of 1027 machines');
  });
});
