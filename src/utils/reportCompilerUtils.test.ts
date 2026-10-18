import { describe, it, expect } from 'vitest';
import {
  compilePortsMarkdownTable,
  compileCredentialsMarkdownTable,
  compileAttackTimelineMarkdown,
  compileFindingsMarkdown,
  compileCompleteMachineReport,
  MachineReportData,
} from './reportCompilerUtils';
import { Machine } from '../types';

describe('reportCompilerUtils Engine', () => {
  const dummyMachine: Machine = {
    id: 'htb-forest',
    name: 'Forest',
    ip: '10.10.10.161',
    os: 'Windows',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'completed',
    tags: ['Active-Directory', 'Kerberos'],
    certifications: ['OSCP', 'CPTS'],
    timeSpentSeconds: 3600,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  describe('Ports Table Compilation', () => {
    it('generates formatted Markdown table with port states and services', () => {
      const ports = [
        { port: 88, protocol: 'tcp' as const, state: 'open' as const, service: 'kerberos', version: 'Microsoft Kerberos' },
        { port: 445, protocol: 'tcp' as const, state: 'open' as const, service: 'microsoft-ds', version: 'Windows Server 2016' },
      ];
      const table = compilePortsMarkdownTable(ports);
      expect(table).toContain('| Port | State | Service | Version / Banner |');
      expect(table).toContain('| `88/tcp` | 🟢 `open` | kerberos | Microsoft Kerberos |');
      expect(table).toContain('| `445/tcp` | 🟢 `open` | microsoft-ds | Windows Server 2016 |');
    });
  });

  describe('Credentials Loot Desk Table', () => {
    it('generates formatted Markdown table distinguishing plaintexts from NTLM hashes', () => {
      const creds = [
        {
          username: 'svc-alfresco',
          secret: 's3rvic3',
          isHash: false,
          domain: 'htb.local',
          source: 'Kerberoasting',
          privilegeLevel: 'User' as const,
        },
        {
          username: 'Administrator',
          secret: '31d6cfe0d16ae931b73c59d7e0c089c0',
          isHash: true,
          domain: 'htb.local',
          source: 'DCSync / secretsdump',
          privilegeLevel: 'Domain Admin' as const,
        },
      ];
      const table = compileCredentialsMarkdownTable(creds);
      expect(table).toContain('| `htb.local\\svc-alfresco` | 🔑 `Plaintext` | `s3rvic3` | **User** | Kerberoasting |');
      expect(table).toContain('| `htb.local\\Administrator` | 🔐 `NTLM Hash` | `31d6cfe0d16ae931b73c59d7e0c089c0` | **Domain Admin** | DCSync / secretsdump |');
    });
  });

  describe('Findings & PoC Compilation', () => {
    it('generates callouts and PoC code blocks for vulnerability findings', () => {
      const findings = [
        {
          title: 'Kerberoasting Service Account (svc-alfresco)',
          severity: 'High' as const,
          cvssScore: 7.5,
          cveId: 'CWE-522',
          description: 'SPN configuration allows offline password cracking.',
          proofOfConcept: 'impacket-GetUserSPNs htb.local/user:pass -request -dc-ip 10.10.10.161',
          remediation: 'Configure managed service accounts (gMSA) with complex 128-character randomized passwords.',
        },
      ];
      const markdown = compileFindingsMarkdown(findings);
      expect(markdown).toContain('### 1. Kerberoasting Service Account (svc-alfresco) [🟠 **HIGH** (CVSS: `7.5`) - `CWE-522`]');
      expect(markdown).toContain('impacket-GetUserSPNs');
      expect(markdown).toContain('> [!TIP]');
    });
  });

  describe('Complete Machine Report Compilation', () => {
    it('assembles valid Markdown report with YAML frontmatter', () => {
      const reportData: MachineReportData = {
        machine: dummyMachine,
        executiveSummary: 'Full domain takeover of htb.local completed in 60 minutes.',
        ports: [{ port: 88, protocol: 'tcp', state: 'open', service: 'kerberos', version: 'MS Kerberos' }],
        credentials: [
          {
            username: 'Administrator',
            secret: '31d6cfe0d16ae931b73c59d7e0c089c0',
            isHash: true,
            domain: 'htb.local',
            source: 'DCSync',
            privilegeLevel: 'Domain Admin',
          },
        ],
        milestones: [
          {
            stage: 'Initial Access / Foothold',
            timestamp: '14:20 UTC',
            technique: 'Kerberoasting',
            notes: 'Cracked svc-alfresco password with rockyou.',
          },
        ],
      };

      const doc = compileCompleteMachineReport(reportData);
      expect(doc.startsWith('---')).toBe(true);
      expect(doc).toContain('title: "Penetration Testing Report: Forest"');
      expect(doc).toContain('## 1. Executive Summary');
      expect(doc).toContain('## 2. Reconnaissance & Port Enumeration');
      expect(doc).toContain('## 3. Compromised Credentials & Loot Desk');
      expect(doc).toContain('## 4. Attack Lifecycle & Killchain Progression');
      expect(doc).toContain('Full domain takeover of htb.local');
    });
  });
});
