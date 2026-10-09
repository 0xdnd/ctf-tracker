import { describe, it, expect } from 'vitest';
import {
  redactScanPayload,
  restoreRedactions,
  buildScanPrompt,
  buildRedactedScanPrompt
} from './aiScanInterpreter';
import type { ScanImportResult } from './scanParserUtils';

describe('redactScanPayload / restoreRedactions (pure functions)', () => {
  it('redacts IPv4 addresses with stable, reused placeholders', () => {
    const { redacted, map } = redactScanPayload('Host 10.10.11.42 responded; also seen at 10.10.11.42 again.');
    expect(redacted).not.toContain('10.10.11.42');
    expect(redacted).toContain('[IP_1]');
    // Same value reused -> same placeholder, not [IP_2]
    expect(redacted.match(/\[IP_1\]/g)?.length).toBe(2);
    expect(map['[IP_1]']).toBe('10.10.11.42');
  });

  it('redacts distinct IPv4 addresses with incrementing placeholders', () => {
    const { redacted, map } = redactScanPayload('10.10.11.1 and 10.10.11.2');
    expect(redacted).toBe('[IP_1] and [IP_2]');
    expect(map['[IP_1]']).toBe('10.10.11.1');
    expect(map['[IP_2]']).toBe('10.10.11.2');
  });

  it('redacts IPv6 addresses', () => {
    const { redacted, map } = redactScanPayload('Link-local fe80::1ff:fe23:4567:890a detected.');
    expect(redacted).not.toContain('fe80::1ff:fe23:4567:890a');
    expect(redacted).toMatch(/\[IP_1\]/);
    expect(Object.values(map)).toContain('fe80::1ff:fe23:4567:890a');
  });

  it('redacts CIDR subnets as NET placeholders, distinct from plain IPs', () => {
    const { redacted, map } = redactScanPayload('Internal range 192.168.56.0/24 in scope.');
    expect(redacted).toContain('[NET_1]');
    expect(redacted).not.toContain('192.168.56.0/24');
    expect(map['[NET_1]']).toBe('192.168.56.0/24');
  });

  it('redacts MAC addresses', () => {
    const { redacted, map } = redactScanPayload('NIC 00:11:22:AA:BB:CC observed on the wire.');
    expect(redacted).toContain('[MAC_1]');
    expect(redacted).not.toContain('00:11:22:AA:BB:CC');
    expect(map['[MAC_1]']).toBe('00:11:22:AA:BB:CC');
  });

  it('redacts AD domain names like CORP.LOCAL', () => {
    const { redacted, map } = redactScanPayload('Domain controller for CORP.LOCAL discovered.');
    expect(redacted).toContain('[DOMAIN_1]');
    expect(redacted).not.toContain('CORP.LOCAL');
    expect(map['[DOMAIN_1]']).toBe('CORP.LOCAL');
  });

  it('redacts NetBIOS domain\\user pairs (e.g. smb-enum-users output) into separate DOMAIN/USER placeholders', () => {
    const { redacted, map } = redactScanPayload('|   ADMIN\\Administrator (RID: 500)');
    expect(redacted).toContain('[DOMAIN_1]\\[USER_1]');
    expect(map['[DOMAIN_1]']).toBe('ADMIN');
    expect(map['[USER_1]']).toBe('Administrator');
  });

  it('redacts generic hostnames/FQDNs without touching version numbers', () => {
    const { redacted, map } = redactScanPayload('Service on web01.example.com runs Apache 2.4.49.');
    expect(redacted).toContain('[HOST_1]');
    expect(redacted).not.toContain('web01.example.com');
    expect(map['[HOST_1]']).toBe('web01.example.com');
    // Version numbers must survive untouched - they are not hostnames.
    expect(redacted).toContain('Apache 2.4.49');
  });

  it('redacts "User:" / "Account:" / "sAMAccountName:" scan-output idioms', () => {
    const { redacted, map } = redactScanPayload(
      'ldap result sAMAccountName: jdoe\nUser: asmith\nAccount: bwayne'
    );
    expect(redacted).not.toContain('jdoe');
    expect(redacted).not.toContain('asmith');
    expect(redacted).not.toContain('bwayne');
    expect(Object.values(map)).toEqual(expect.arrayContaining(['jdoe', 'asmith', 'bwayne']));
  });

  it('restoreRedactions reverses redactScanPayload exactly', () => {
    const original = 'Target 10.10.11.42 (dc01.corp.local) has user ADMIN\\Administrator on 00:11:22:AA:BB:CC.';
    const { redacted, map } = redactScanPayload(original);
    expect(redacted).not.toContain('10.10.11.42');
    const restored = restoreRedactions(redacted, map);
    expect(restored).toBe(original);
  });

  it('keeps numbering/reuse consistent across multiple calls sharing a map (one logical request)', () => {
    const first = redactScanPayload('Target IP: 10.10.11.42');
    const second = redactScanPayload('Repeat reference to 10.10.11.42 and new host 10.10.11.99', first.map);
    expect(second.map['[IP_1]']).toBe('10.10.11.42');
    expect(second.map['[IP_2]']).toBe('10.10.11.99');
    expect(second.redacted).toContain('[IP_1]');
    expect(second.redacted).toContain('[IP_2]');
  });
});

describe('buildRedactedScanPrompt', () => {
  const scan: ScanImportResult = {
    format: 'nmap-text',
    detectedIp: '10.10.11.42',
    detectedHost: 'blocky.htb',
    ports: [
      { port: 22, protocol: 'tcp', state: 'open', service: 'ssh', version: '', suggestedTools: [] },
      { port: 445, protocol: 'tcp', state: 'open', service: 'microsoft-ds', version: '', suggestedTools: [] }
    ]
  };

  it('redacts target IP/name embedded in the generated prompt by default', () => {
    const { prompt, map, rawPrompt } = buildRedactedScanPrompt(scan, {
      targetIp: '10.10.11.42',
      targetName: 'blocky.htb'
    });
    expect(rawPrompt).toContain('10.10.11.42');
    expect(prompt).not.toContain('10.10.11.42');
    expect(Object.values(map)).toContain('10.10.11.42');
  });

  it('does not redact when redact=false', () => {
    const { prompt, map } = buildRedactedScanPrompt(scan, { targetIp: '10.10.11.42', redact: false });
    expect(prompt).toContain('10.10.11.42');
    expect(map).toEqual({});
  });

  it('buildScanPrompt itself returns the raw (unredacted) prompt', () => {
    const raw = buildScanPrompt(scan, { targetIp: '10.10.11.42' });
    expect(raw).toContain('10.10.11.42');
  });
});
