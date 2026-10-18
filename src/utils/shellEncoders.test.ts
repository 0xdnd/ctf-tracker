import { describe, it, expect } from 'vitest';
import { encodeUtf16LeBase64, isNtHash, credFlag, shellQuote } from './shellEncoders';

describe('encodeUtf16LeBase64', () => {
  it('encodes ascii text as UTF-16LE base64', () => {
    // "A" -> UTF-16LE bytes [0x41, 0x00] -> base64 "QQA="
    expect(encodeUtf16LeBase64('A')).toBe(btoa('A\0'));
  });

  it('returns empty string for empty input', () => {
    expect(encodeUtf16LeBase64('')).toBe('');
  });

  it('handles large input without throwing', () => {
    const big = 'x'.repeat(50000);
    expect(() => encodeUtf16LeBase64(big)).not.toThrow();
  });
});

describe('shellQuote', () => {
  it('wraps simple strings in single quotes', () => {
    expect(shellQuote('admin')).toBe(`'admin'`);
    expect(shellQuote('P@ssword123')).toBe(`'P@ssword123'`);
  });

  it('escapes embedded single quotes as "\'\'" pattern', () => {
    expect(shellQuote("a'b")).toBe(`'a'"'"'b'`);
  });

  it('keeps passwords with spaces and specials usable when quoted', () => {
    expect(shellQuote('p@ss w0rd! $`')).toBe(`'p@ss w0rd! $` + '`' + `'`);
  });

  it('strips CR/LF to prevent command splitting', () => {
    expect(shellQuote('a\nb')).toBe(`'ab'`);
    expect(shellQuote('a\rb\nc')).toBe(`'abc'`);
    expect(shellQuote('evil\nrm -rf /')).toBe(`'evilrm -rf /'`);
  });
});

describe('isNtHash', () => {
  it('accepts 32 hex chars', () => {
    expect(isNtHash('aad3b435b51404eeaad3b435b51404ee')).toBe(true);
    expect(isNtHash('AAD3B435B51404EEAAD3B435B51404E'.padEnd(32, '0'))).toBe(true);
  });

  it('rejects non-hex or wrong length', () => {
    expect(isNtHash('not a hash')).toBe(false);
    expect(isNtHash('abc123')).toBe(false);
    expect(isNtHash('')).toBe(false);
  });

  it('returns false (not throw) for undefined/null', () => {
    expect(isNtHash(undefined)).toBe(false);
    expect(isNtHash(null)).toBe(false);
    expect(() => isNtHash(undefined)).not.toThrow();
    expect(() => isNtHash(null)).not.toThrow();
  });
});

describe('credFlag', () => {
  const pw = 'Summer2024!';
  const hash = 'aad3b435b51404eeaad3b435b51404ee';

  it('cme/nxc: password uses -p, hash uses -H (shell-quoted)', () => {
    expect(credFlag('cme', pw)).toEqual({ flag: `-p '${pw}'`, usesHash: false });
    expect(credFlag('nxc', hash)).toEqual({ flag: `-H '${hash}'`, usesHash: true });
  });

  it('evil-winrm: password uses -p, hash uses -H (shell-quoted)', () => {
    expect(credFlag('evil-winrm', pw)).toEqual({ flag: `-p '${pw}'`, usesHash: false });
    expect(credFlag('evil-winrm', hash)).toEqual({ flag: `-H '${hash}'`, usesHash: true });
  });

  it('impacket: password is positional quoted, hash uses -hashes with quoted :hash', () => {
    expect(credFlag('impacket', pw)).toEqual({ flag: `'${pw}'`, usesHash: false });
    expect(credFlag('impacket', hash)).toEqual({ flag: `-hashes ':${hash}'`, usesHash: true });
  });

  it('smbclient: password uses --password, hash uses --password + --pw-nt-hash', () => {
    expect(credFlag('smbclient', pw)).toEqual({ flag: `--password '${pw}'`, usesHash: false });
    expect(credFlag('smbclient', hash)).toEqual({
      flag: `--password '${hash}' --pw-nt-hash`,
      usesHash: true,
    });
  });

  it('quotes shell metachars so injection cannot break out', () => {
    const evil = `a'; rm -rf / #`;
    const out = credFlag('cme', evil);
    expect(out.usesHash).toBe(false);
    expect(out.flag).toBe(`-p ${shellQuote(evil)}`);
    expect(out.flag).toContain(`'"'"'`);
    const evilHashCmd = credFlag('nxc', `$(id)`);
    expect(evilHashCmd.flag).toBe(`-p ${shellQuote('$(id)')}`);
  });

  it('keeps legitimate passwords with spaces working when quoted', () => {
    const spaced = 'my secret pass 123!';
    expect(credFlag('cme', spaced)).toEqual({ flag: `-p '${spaced}'`, usesHash: false });
  });

  it('strips newlines from quoted tokens', () => {
    const withNl = 'pass\n evil';
    expect(credFlag('cme', withNl).flag).not.toContain('\n');
  });
});
