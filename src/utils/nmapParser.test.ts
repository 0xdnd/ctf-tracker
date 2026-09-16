import { describe, it, expect } from 'vitest';
import { parseNmapScanOutput } from './nmapParser';

describe('nmapParser utility', () => {
  it('parses standard nmap output with open ports and services', () => {
    const rawNmap = `
Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 10.10.10.150
Host is up (0.045s latency).
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 8.2p1 Ubuntu 4ubuntu0.5
80/tcp   open  http        Apache httpd 2.4.41 ((Ubuntu))
445/tcp  open  netbios-ssn Samba smbd 4.6.2
Nmap done: 1 IP address scanned in 8.35 seconds
    `;

    const result = parseNmapScanOutput(rawNmap);

    expect(result.ports).toEqual([22, 80, 445]);
    expect(result.details).toHaveLength(3);

    expect(result.details[0]).toEqual({
      port: 22,
      protocol: 'tcp',
      state: 'open',
      service: 'ssh',
      version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.5',
    });

    expect(result.details[1]).toEqual({
      port: 80,
      protocol: 'tcp',
      state: 'open',
      service: 'http',
      version: 'Apache httpd 2.4.41 ((Ubuntu))',
    });
  });

  it('parses UDP open ports correctly', () => {
    const rawNmap = `
53/udp   open  domain  ISC BIND 9.16.1
161/udp  open  snmp    SNMPv3 server
    `;

    const result = parseNmapScanOutput(rawNmap);

    expect(result.ports).toEqual([53, 161]);
    expect(result.details[0].protocol).toBe('udp');
    expect(result.details[0].service).toBe('domain');
    expect(result.details[1].protocol).toBe('udp');
  });

  it('filters out closed, filtered, and open|filtered ports', () => {
    const rawNmap = `
21/tcp   closed   ftp
22/tcp   open     ssh
23/tcp   filtered telnet
80/tcp   open|filtered http
443/tcp  open     https
    `;

    const result = parseNmapScanOutput(rawNmap);

    expect(result.ports).toEqual([22, 443]);
    expect(result.details).toHaveLength(2);
    expect(result.details.map((d) => d.port)).toEqual([22, 443]);
  });

  it('deduplicates ports and sorts them in ascending order', () => {
    const rawNmap = `
8080/tcp open http-proxy
22/tcp   open ssh
80/tcp   open http
22/tcp   open ssh
    `;

    const result = parseNmapScanOutput(rawNmap);

    expect(result.ports).toEqual([22, 80, 8080]);
    expect(result.details).toHaveLength(3);
  });

  it('parses comma-separated port lists with keywords', () => {
    const text = 'Discovered open ports: 21, 22, 80, 443 on target';

    const result = parseNmapScanOutput(text);

    expect(result.ports).toEqual([21, 22, 80, 443]);
    expect(result.details).toHaveLength(4);
    expect(result.details[0].protocol).toBe('tcp');
  });

  it('safely handles empty, null, or garbage input', () => {
    expect(parseNmapScanOutput('')).toEqual({ ports: [], details: [] });
    // @ts-expect-error testing invalid input types
    expect(parseNmapScanOutput(null)).toEqual({ ports: [], details: [] });
    // @ts-expect-error testing invalid input types
    expect(parseNmapScanOutput(undefined)).toEqual({ ports: [], details: [] });
    expect(parseNmapScanOutput('No ports open, host seems down.')).toEqual({
      ports: [],
      details: [],
    });
  });
});
