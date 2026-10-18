import { describe, it, expect } from 'vitest';
import { applyScanTextToMachine } from './scanCardHelper';
import { Machine } from '../types';

const MOCK_MACHINE: Machine = {
  id: 'htb-sau',
  name: 'Sau',
  ip: '10.10.11.224',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: ['web', 'cve'],
  certifications: ['OSCP'],
  openPorts: [22],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  quickNotes: 'Initial quick notes from user.'
};

const SAMPLE_NMAP_OUTPUT = `
Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-14 20:00 EDT
Nmap scan report for sau.htb (10.10.11.224)
Host is up (0.045s latency).
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.7 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http    nginx 1.18.0
55555/tcp open  unknown
Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds
`;

const SAMPLE_GNMAP_OUTPUT = `
# Nmap 7.94 scan initiated Wed Sep 2 22:00:00 2026 as: nmap -sC -sV 10.10.11.175
Host: 10.10.11.175 (dc01.corp.local)\tStatus: Up
Host: 10.10.11.175 (dc01.corp.local)\tPorts: 53/open/tcp//domain//Simple DNS Plus/, 88/open/tcp//kerberos-sec//Microsoft Windows Kerberos/, 445/open/tcp//microsoft-ds//Windows Server 2019/
# Nmap done at Wed Sep 2 22:01:15 2026
`;

describe('scanCardHelper', () => {
  it('should return null for empty or invalid scan text', () => {
    expect(applyScanTextToMachine(MOCK_MACHINE, '')).toBeNull();
    expect(applyScanTextToMachine(MOCK_MACHINE, 'not a real scan at all')).toBeNull();
  });

  it('should parse Nmap standard text output and merge ports & tags without data loss', () => {
    const result = applyScanTextToMachine(MOCK_MACHINE, SAMPLE_NMAP_OUTPUT);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.parsedCount).toBe(3);
    expect(result.detectedIp).toBe('10.10.11.224');
    expect(result.detectedHost).toBe('sau.htb');

    const updated = result.updatedMachine;
    // Ports 22 was already there, 80 and 55555 should be added and sorted
    expect(updated.openPorts).toEqual([22, 80, 55555]);

    // Tags should include previous tags plus 'nmap-scanned', 'ssh', 'http' (skipping unknown)
    expect(updated.tags).toContain('web');
    expect(updated.tags).toContain('cve');
    expect(updated.tags).toContain('nmap-scanned');
    expect(updated.tags).toContain('ssh');
    expect(updated.tags).toContain('http');

    // Quick notes should preserve existing notes and append the recon report
    expect(updated.quickNotes).toContain('Initial quick notes from user.');
    expect(updated.quickNotes).toContain('### ⚡ Scan Intake');
    expect(updated.quickNotes).toContain('Port 22/tcp');
    expect(updated.quickNotes).toContain('Port 80/tcp');
  });

  it('should parse .gnmap output and handle Active Directory ports', () => {
    const freshMachine: Machine = {
      ...MOCK_MACHINE,
      id: 'htb-dc01',
      openPorts: [],
      tags: [],
      quickNotes: ''
    };

    const result = applyScanTextToMachine(freshMachine, SAMPLE_GNMAP_OUTPUT);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.parsedCount).toBe(3);
    expect(result.updatedMachine.openPorts).toEqual([53, 88, 445]);
    expect(result.updatedMachine.tags).toContain('nmap-scanned');
    expect(result.updatedMachine.tags).toContain('domain');
    expect(result.updatedMachine.tags).toContain('kerberos-sec');
    expect(result.updatedMachine.tags).toContain('microsoft-ds');
    expect(result.updatedMachine.quickNotes).toContain('Open Services (3):');
  });
});
