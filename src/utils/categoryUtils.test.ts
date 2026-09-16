import { describe, it, expect, beforeEach } from 'vitest';
import {
  VULN_CATEGORIES,
  VULN_DOMAINS,
  classifyMachine,
  matchesCategory,
  matchesDomain,
  getCategoryDef,
  getDomainDef,
  clearClassificationCache,
} from './categoryUtils';
import { Machine } from '../types';

describe('categoryUtils - 25-Category Offensive Taxonomy', () => {
  beforeEach(() => {
    clearClassificationCache();
  });

  it('defines 25 unique vulnerability categories across 4 domains', () => {
    expect(VULN_CATEGORIES.length).toBe(25);
    const ids = new Set(VULN_CATEGORIES.map((c) => c.id));
    expect(ids.size).toBe(25);

    // Verify all domains are represented
    const domains = new Set(VULN_CATEGORIES.map((c) => c.domain));
    expect(domains.has('web')).toBe(true);
    expect(domains.has('ad')).toBe(true);
    expect(domains.has('system')).toBe(true);
    expect(domains.has('advanced')).toBe(true);
  });

  it('defines 5 tactical domains including ALL', () => {
    expect(VULN_DOMAINS.length).toBe(5);
    expect(VULN_DOMAINS.map((d) => d.id)).toEqual(['all', 'web', 'ad', 'system', 'advanced']);
  });

  it('preserves legacy category IDs without breaking existing filters', () => {
    const legacyIds = [
      'Web',
      'Active Directory',
      'SQLi',
      'XSS',
      'SSRF',
      'LFI',
      'RCE',
      'Linux PrivEsc',
      'Windows PrivEsc',
      'Binary / BOF',
      'Network / SMB',
    ];
    legacyIds.forEach((id) => {
      expect(getCategoryDef(id)).toBeDefined();
    });
  });

  it('prevents false-positive bleed with word-boundary regex guards', () => {
    // Machine mentioning uploading an SSH key should NOT be tagged as File Upload
    const machineWithSshKey: Machine = {
      id: 'test-ssh-key',
      name: 'SafeBox',
      ip: '10.10.10.10',
      os: 'Linux',
      platform: 'HTB',
      difficulty: 'Easy',
      status: 'completed',
      tags: ['ssh', 'keys'],
      certifications: [],
      hint: 'Generate an ssh keypair and upload the public key to authorized_keys',
      officialSynopsis: 'In this box the operator logs in via SSH key',
      timeSpentSeconds: 100,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const res = classifyMachine(machineWithSshKey);
    expect(res.categories).not.toContain('File Upload');
  });

  it('correctly classifies genuine File Upload vulnerabilities', () => {
    const rootMe: Machine = {
      id: 'thm-rootme',
      name: 'RootMe',
      ip: '10.10.10.1',
      os: 'Linux',
      platform: 'THM',
      difficulty: 'Easy',
      status: 'completed',
      tags: ['File-Upload', 'Bypass', 'SUID-Python', 'Privesc'],
      certifications: ['OSCP'],
      hint: 'Bypass PHP upload extension filter using .phtml on /panel',
      timeSpentSeconds: 2700,
      createdAt: '2024-01-01',
      updatedAt: '2026-08-20',
    };

    const res = classifyMachine(rootMe);
    expect(res.categories).toContain('File Upload');
    expect(res.categories).toContain('Linux PrivEsc');
    expect(res.domains).toContain('web');
    expect(res.domains).toContain('system');
  });

  it('correctly classifies Active Directory & ADCS environments with priority ranking', () => {
    const certifiedBox: Machine = {
      id: 'htb-certified',
      name: 'Certified',
      ip: '10.10.11.120',
      os: 'Windows',
      platform: 'HTB',
      difficulty: 'Medium',
      status: 'completed',
      tags: ['Active Directory', 'ADCS', 'ESC1', 'Certipy', 'Kerberos'],
      certifications: ['CPTS'],
      officialSynopsis: 'Vulnerable certificate templates allowed ESC1 privilege escalation',
      timeSpentSeconds: 3600,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const res = classifyMachine(certifiedBox);
    expect(res.isAD).toBe(true);
    expect(res.categories).toContain('ADCS');
    expect(res.categories).toContain('Active Directory');
    // ADCS has priority 100 vs AD priority 95, so primary is ADCS
    expect(res.primary).toBe('ADCS');
  });

  it('matches category and domain filters accurately', () => {
    const testBox: Machine = {
      id: 'test-sqli-box',
      name: 'InjectionStation',
      ip: '10.10.10.50',
      os: 'Linux',
      platform: 'HTB',
      difficulty: 'Medium',
      status: 'backlog',
      tags: ['sqli', 'sqlmap', 'web'],
      certifications: ['OSCP'],
      timeSpentSeconds: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    expect(matchesCategory(testBox, 'SQLi')).toBe(true);
    expect(matchesCategory(testBox, 'Binary / BOF')).toBe(false);
    expect(matchesCategory(testBox, 'ALL')).toBe(true);

    expect(matchesDomain(testBox, 'web')).toBe(true);
    expect(matchesDomain(testBox, 'ad')).toBe(false);
    expect(matchesDomain(testBox, 'all')).toBe(true);
  });

  it('resolves category and domain helper definitions', () => {
    const sqliDef = getCategoryDef('SQLi');
    expect(sqliDef).toBeDefined();
    expect(sqliDef?.label).toBe('SQL Injection');
    expect(sqliDef?.domain).toBe('web');

    const domainDef = getDomainDef('ad');
    expect(domainDef).toBeDefined();
    expect(domainDef?.label).toBe('Active Directory & Identity');
  });
});
