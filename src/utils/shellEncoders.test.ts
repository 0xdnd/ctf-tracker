import { describe, it, expect } from 'vitest';
import { encodeUtf16LeBase64, isNtHash, credFlag } from './shellEncoders';

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
});

describe('credFlag', () => {
  const pw = 'Summer2024!';
  const hash = 'aad3b435b51404eeaad3b435b51404ee';

  it('cme/nxc: password uses -p, hash uses -H', () => {
    expect(credFlag('cme', pw)).toEqual({ flag: `-p ${pw}`, usesHash: false });
    expect(credFlag('nxc', hash)).toEqual({ flag: `-H ${hash}`, usesHash: true });
  });

  it('evil-winrm: password uses -p, hash uses -H', () => {
    expect(credFlag('evil-winrm', pw)).toEqual({ flag: `-p ${pw}`, usesHash: false });
    expect(credFlag('evil-winrm', hash)).toEqual({ flag: `-H ${hash}`, usesHash: true });
  });

  it('impacket: password is positional, hash uses -hashes', () => {
    expect(credFlag('impacket', pw)).toEqual({ flag: pw, usesHash: false });
    expect(credFlag('impacket', hash)).toEqual({ flag: `-hashes :${hash}`, usesHash: true });
  });

  it('smbclient: password uses --password, hash uses --pw-nt-hash', () => {
    expect(credFlag('smbclient', pw)).toEqual({ flag: `--password ${pw}`, usesHash: false });
    expect(credFlag('smbclient', hash)).toEqual({ flag: `--pw-nt-hash ${hash}`, usesHash: true });
  });
});
