import { describe, it, expect } from 'vitest';
import { formatHostsLine } from './hostsLine';

describe('formatHostsLine', () => {
  it('formats domain then vhosts, deduped and lowercased', () => {
    expect(formatHostsLine('10.10.10.5', 'Domain.htb', ['www.domain.htb', 'DOMAIN.htb', ' '])).toBe(
      '10.10.10.5\tdomain.htb www.domain.htb',
    );
  });
  it('works with only vhosts', () => {
    expect(formatHostsLine('10.10.10.5', undefined, ['a.htb'])).toBe('10.10.10.5\ta.htb');
  });
  it('returns empty without ip or names', () => {
    expect(formatHostsLine('', 'a.htb')).toBe('');
    expect(formatHostsLine('10.10.10.5')).toBe('');
    expect(formatHostsLine('not-an-ip', 'a.htb')).toBe('');
    expect(formatHostsLine('300.1.1.1', 'a.htb')).toBe('');
  });
  it('accepts IPv6', () => {
    expect(formatHostsLine('dead:beef::1', 'a.htb')).toBe('dead:beef::1\ta.htb');
  });
  it('rejects names with whitespace or control chars', () => {
    expect(formatHostsLine('10.0.0.1', 'a b.htb', ['ok.htb', 'x\ny.htb', 'z\u0001.htb'])).toBe('10.0.0.1\tok.htb');
  });
});
