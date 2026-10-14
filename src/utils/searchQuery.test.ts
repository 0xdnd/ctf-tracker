import { describe, it, expect } from 'vitest';
import { parseSearchQuery, matchesSearchQuery } from './searchQuery';

const m = {
  name: 'Forest', ip: '10.10.10.161', os: 'Windows', difficulty: 'Easy', platform: 'HTB',
  status: 'Active', openPorts: [88, 445], services: [{ port: 389 }], tags: ['AD', 'kerberos'],
};

describe('parseSearchQuery', () => {
  it('parses filters, comma values and free text', () => {
    const p = parseSearchQuery('kerb port:88,445 os:Windows diff:easy,medium review:due');
    expect(p.text).toBe('kerb');
    expect(p.filters).toEqual({
      port: [88, 445], os: ['windows'], difficulty: ['easy', 'medium'], review: 'due',
    });
  });
  it('keeps unknown keys and bad values in text', () => {
    const p = parseSearchQuery('foo:bar port:abc review:later');
    expect(p.text).toBe('foo:bar port:abc review:later');
    expect(p.filters).toEqual({});
  });
  it('supports quoted phrases', () => {
    expect(parseSearchQuery('"active directory" os:linux').text).toBe('active directory');
    expect(parseSearchQuery('track:"oscp"').filters.track).toEqual(['oscp']);
  });
});

describe('matchesSearchQuery', () => {
  it('matches filters', () => {
    expect(matchesSearchQuery(m, parseSearchQuery('port:389 os:windows diff:easy platform:htb status:active'))).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('port:22'))).toBe(false);
    expect(matchesSearchQuery(m, parseSearchQuery('os:linux'))).toBe(false);
  });
  it('matches free text on name, tags, ip, os', () => {
    expect(matchesSearchQuery(m, parseSearchQuery('FOREST'))).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('kerberos'))).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('10.10.10.161'))).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('windows'))).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('nope'))).toBe(false);
  });
  it('uses opts for review and track', () => {
    expect(matchesSearchQuery(m, parseSearchQuery('review:due'))).toBe(false);
    expect(matchesSearchQuery(m, parseSearchQuery('review:due'), { isDue: () => true })).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('track:oscp'), { trackIds: () => ['OSCP'] })).toBe(true);
    expect(matchesSearchQuery(m, parseSearchQuery('track:oscp'))).toBe(false);
  });
});
