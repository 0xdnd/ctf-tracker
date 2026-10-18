import { describe, it, expect } from 'vitest';
import {
  parseMultiToolScan,
  parseNmapXmlPortable,
  parseNmapGrepable,
  parseNmapText,
  parseNetExecText,
  parseWebFuzzContent,
  isDomainControllerPorts,
  generateHostsFileEntry,
} from './multiHostScanParser';

describe('multiHostScanParser Engine', () => {
  describe('Active Directory Domain Controller Detection', () => {
    it('accurately identifies Domain Controller when ports 88, 389, and 445 are open', () => {
      const ports = [
        { port: 53, protocol: 'tcp' as const, state: 'open' as const, service: 'domain', version: '' },
        { port: 88, protocol: 'tcp' as const, state: 'open' as const, service: 'kerberos', version: 'Microsoft Windows Kerberos' },
        { port: 389, protocol: 'tcp' as const, state: 'open' as const, service: 'ldap', version: 'Microsoft Windows Active Directory LDAP' },
        { port: 445, protocol: 'tcp' as const, state: 'open' as const, service: 'microsoft-ds', version: '' },
      ];
      expect(isDomainControllerPorts(ports)).toBe(true);
    });

    it('returns false if Kerberos (88) is missing even if SMB (445) is open', () => {
      const ports = [
        { port: 80, protocol: 'tcp' as const, state: 'open' as const, service: 'http', version: 'Apache' },
        { port: 445, protocol: 'tcp' as const, state: 'open' as const, service: 'microsoft-ds', version: 'Windows 10' },
      ];
      expect(isDomainControllerPorts(ports)).toBe(false);
    });
  });

  describe('Hosts File Entry Generator', () => {
    it('creates accurate /etc/hosts command with domain and FQDN', () => {
      const entry = generateHostsFileEntry('10.10.10.161', 'htb.local', 'forest');
      expect(entry).toContain('echo "10.10.10.161 htb.local forest.htb.local" | sudo tee -a /etc/hosts');
    });
  });

  describe('Nmap XML Multi-Host Parser', () => {
    it('parses multi-host Nmap XML subnet scan', () => {
      const sampleXml = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" version="7.94">
  <host>
    <address addr="10.10.10.161" addrtype="ipv4"/>
    <hostnames>
      <hostname name="forest.htb.local" type="user"/>
    </hostnames>
    <ports>
      <port protocol="tcp" portid="88"><state state="open"/><service name="kerberos-sec" product="Microsoft Windows Kerberos"/></port>
      <port protocol="tcp" portid="389"><state state="open"/><service name="ldap" product="Microsoft Windows Active Directory LDAP"/></port>
      <port protocol="tcp" portid="445"><state state="open"/><service name="microsoft-ds"/></port>
    </ports>
  </host>
  <host>
    <address addr="10.10.10.10" addrtype="ipv4"/>
    <hostnames>
      <hostname name="web01.htb.local" type="user"/>
    </hostnames>
    <ports>
      <port protocol="tcp" portid="80"><state state="open"/><service name="http" product="Apache httpd" version="2.4.41"/></port>
      <port protocol="tcp" portid="22"><state state="open"/><service name="ssh" product="OpenSSH" version="8.2p1"/></port>
    </ports>
  </host>
</nmaprun>
`;
      const hosts = parseNmapXmlPortable(sampleXml);
      expect(hosts.length).toBe(2);

      // Host 1: Forest AD DC
      expect(hosts[0].ip).toBe('10.10.10.161');
      expect(hosts[0].hostname).toBe('forest.htb.local');
      expect(hosts[0].isDomainController).toBe(true);
      expect(hosts[0].suggestedTags).toContain('Domain-Controller');
      expect(hosts[0].ports.length).toBe(3);

      // Host 2: Web Server
      expect(hosts[1].ip).toBe('10.10.10.10');
      expect(hosts[1].isDomainController).toBe(false);
      expect(hosts[1].suggestedTags).toContain('Web');
      expect(hosts[1].suggestedTags).toContain('SSH');
    });
  });

  describe('Nmap Grepable (.gnmap) Parser', () => {
    it('parses multi-host .gnmap lines', () => {
      const sampleGnmap = `
# Nmap 7.94 scan initiated
Host: 10.10.10.1 (gateway.local)	Ports: 22/open/tcp//ssh//OpenSSH 8.2p1/, 80/open/tcp//http//nginx 1.18.0/
Host: 10.10.10.2 (db.local)	Ports: 3306/open/tcp//mysql//MySQL 8.0/
# Nmap done
`;
      const hosts = parseNmapGrepable(sampleGnmap);
      expect(hosts.length).toBe(2);
      expect(hosts[0].ip).toBe('10.10.10.1');
      expect(hosts[0].hostname).toBe('gateway');
      expect(hosts[0].domain).toBe('local');
      expect(hosts[0].ports.length).toBe(2);
      expect(hosts[1].ip).toBe('10.10.10.2');
      expect(hosts[1].ports[0].port).toBe(3306);
    });
  });

  describe('Nmap Terminal Text Parser', () => {
    it('parses multi-host terminal copy-paste blocks', () => {
      const sampleText = `
Nmap scan report for 10.10.10.161
Host is up (0.045s latency).
PORT    STATE SERVICE      VERSION
88/tcp  open  kerberos-sec Microsoft Windows Kerberos
389/tcp open  ldap         Microsoft Windows Active Directory LDAP
445/tcp open  microsoft-ds Windows 10 Enterprise

Nmap scan report for target.htb (10.10.10.200)
Host is up (0.050s latency).
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache/2.4.49
`;
      const hosts = parseNmapText(sampleText);
      expect(hosts.length).toBe(2);
      expect(hosts[0].ip).toBe('10.10.10.161');
      expect(hosts[0].isDomainController).toBe(true);
      expect(hosts[1].ip).toBe('10.10.10.200');
      expect(hosts[1].hostname).toBe('target');
      expect(hosts[1].domain).toBe('htb');
    });
  });

  describe('NetExec / CrackMapExec Parser', () => {
    it('extracts SMB intelligence, hostname, domain, and signing state', () => {
      const nxcOutput = `
SMB         10.10.10.161    445    FOREST           [*] Windows 10.0 Build 17763 x64 (name:FOREST) (domain:htb.local) (signing:False) (SMBv1:False)
LDAP        10.10.10.161    389    FOREST           [*] Windows 10.0 Build 17763 x64 (name:FOREST) (domain:htb.local)
`;
      const hosts = parseNetExecText(nxcOutput);
      expect(hosts.length).toBe(1);
      expect(hosts[0].ip).toBe('10.10.10.161');
      expect(hosts[0].hostname).toBe('FOREST');
      expect(hosts[0].domain).toBe('htb.local');
      expect(hosts[0].smbSigning).toBe(false);
      expect(hosts[0].suggestedTags).toContain('SMB-Relay');
      expect(hosts[0].hostsFileEntry).toContain('echo "10.10.10.161 htb.local forest.htb.local" | sudo tee -a /etc/hosts');
    });
  });

  describe('Web Fuzzing Parser (ffuf & gobuster)', () => {
    it('parses ffuf JSON format', () => {
      const ffufJson = JSON.stringify({
        results: [
          { input: { FUZZ: '/admin' }, status: 200, length: 1234, words: 45 },
          { input: { FUZZ: '/login' }, status: 302, length: 0, redirectlocation: '/portal' },
        ],
      });
      const findings = parseWebFuzzContent(ffufJson);
      expect(findings.length).toBe(2);
      expect(findings[0].path).toBe('/admin');
      expect(findings[0].statusCode).toBe(200);
      expect(findings[1].redirectUrl).toBe('/portal');
    });

    it('parses gobuster text lines', () => {
      const gobusterText = `
/admin (Status: 301) [Size: 178] [--> http://target.htb/admin/]
/login (Status: 200) [Size: 2450]
`;
      const findings = parseWebFuzzContent(gobusterText);
      expect(findings.length).toBe(2);
      expect(findings[0].path).toBe('/admin');
      expect(findings[0].statusCode).toBe(301);
      expect(findings[0].redirectUrl).toBe('http://target.htb/admin/');
      expect(findings[1].statusCode).toBe(200);
    });
  });

  describe('Universal parseMultiToolScan Dispatcher', () => {
    it('auto-detects Nmap XML and dispatches correctly', () => {
      const report = parseMultiToolScan('<nmaprun version="7.94"><host><address addr="10.10.10.1"/></host></nmaprun>');
      expect(report.format).toBe('nmap-xml');
      expect(report.hosts.length).toBe(1);
    });

    it('auto-detects NetExec output', () => {
      const report = parseMultiToolScan('SMB 10.10.10.5 445 DC [*] Windows 10.0 (name:DC) (domain:corp.local) (signing:True)');
      expect(report.format).toBe('netexec');
      expect(report.hosts[0].hostname).toBe('DC');
      expect(report.hosts[0].domain).toBe('corp.local');
    });
  });
});
