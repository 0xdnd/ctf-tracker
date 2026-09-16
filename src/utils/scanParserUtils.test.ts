import { describe, it, expect } from 'vitest';
import {
  getServiceIntelligence,
  parseNmapXml,
  parseRustscan,
  detectAndParseScan,
} from './scanParserUtils';

describe('scanParserUtils', () => {
  describe('getServiceIntelligence', () => {
    it('returns FTP tools and detects vsftpd 2.3.4 backdoor CVE', () => {
      const result = getServiceIntelligence(21, 'ftp', 'vsftpd 2.3.4');
      expect(result.tools).toContain('ftp');
      expect(result.tools).toContain('hydra');
      expect(result.cve).toContain('CVE-2011-2523');
    });

    it('returns SMB tools and detects Samba 3.0.20 RCE', () => {
      const result = getServiceIntelligence(445, 'microsoft-ds', 'Samba 3.0.20');
      expect(result.tools.some((t) => t.includes('smb'))).toBe(true);
      expect(result.cve).toContain('CVE-2007-2447');
    });

    it('returns web enumeration tools for HTTP ports', () => {
      const result = getServiceIntelligence(80, 'http', 'Apache 2.4.49');
      expect(result.tools).toContain('ffuf');
      expect(result.tools).toContain('gobuster');
      expect(result.cve).toContain('CVE-2021-41773');
    });

    it('returns generic fallback tools for unmapped services', () => {
      const result = getServiceIntelligence(9999, 'custom-service', 'v1.0');
      expect(result.tools).toContain('nc -nv');
      expect(result.tools).toContain('nmap -sC -sV');
    });
  });

  describe('parseNmapXml', () => {
    it('parses valid Nmap XML output extracting host IP and open ports', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -sC -sV 10.10.10.100" version="7.94">
  <host>
    <status state="up"/>
    <address addr="10.10.10.100" addrtype="ipv4"/>
    <hostnames><hostname name="target.box" type="user"/></hostnames>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open"/>
        <service name="ssh" product="OpenSSH" version="8.2p1"/>
      </port>
      <port protocol="tcp" portid="80">
        <state state="open"/>
        <service name="http" product="nginx" version="1.18.0"/>
      </port>
      <port protocol="tcp" portid="3306">
        <state state="closed"/>
        <service name="mysql"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const result = parseNmapXml(xml);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('nmap-xml');
      expect(result?.detectedIp).toBe('10.10.10.100');
      expect(result?.detectedHost).toBe('target.box');
      expect(result?.ports).toHaveLength(2);
      expect(result?.ports[0].port).toBe(22);
      expect(result?.ports[1].port).toBe(80);
    });

    it('returns null for malformed or non-nmap XML', () => {
      expect(parseNmapXml('not xml at all')).toBeNull();
      expect(parseNmapXml('<root><broken></root>')).toBeNull();
      expect(parseNmapXml('<otherXml></otherXml>')).toBeNull();
    });
  });

  describe('parseRustscan', () => {
    it('parses Rustscan output format with Open IP:PORT lines', () => {
      const rustscanOutput = `
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \\ |  \\| |
| .-. \\| {_} |.-}_} } | |  .-}_} }\\     }/  /\\  \\|   | |
\`-' \`-' \`-----'\`----'  \`-'  \`----'  \`---' \`-'  \`-'\`-' \`-'
Open 10.10.10.175:22
Open 10.10.10.175:80
Open 10.10.10.175:8080
[~] Starting Script(s)
      `;

      const result = parseRustscan(rustscanOutput);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('rustscan');
      expect(result?.detectedIp).toBe('10.10.10.175');
      expect(result?.ports.map((p) => p.port)).toEqual([22, 80, 8080]);
    });
  });

  describe('detectAndParseScan', () => {
    it('automatically identifies XML format', () => {
      const xml = `<nmaprun><host><address addr="192.168.1.1" addrtype="ipv4"/><ports><port protocol="tcp" portid="443"><state state="open"/></port></ports></host></nmaprun>`;
      const res = detectAndParseScan(xml);
      expect(res).not.toBeNull();
      expect(res?.format).toBe('nmap-xml');
      expect(res?.detectedIp).toBe('192.168.1.1');
    });

    it('identifies raw port list fallback', () => {
      const raw = '80, 443, 8080';
      const res = detectAndParseScan(raw);
      expect(res).not.toBeNull();
      expect(res?.ports.map((p) => p.port)).toEqual([80, 443, 8080]);
    });
  });
});
