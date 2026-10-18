/**
 * reportCompilerUtils.ts
 * Tactical Pentest Report & Machine Writeup Markdown Compiler.
 * Transforms machine metadata, port scan results, credential loot, attack timelines,
 * and vulnerability findings into publication-ready Markdown blocks for Obsidian & Exam submissions.
 * 100% Client-Side, Deterministic, and Offline-First.
 */

import { Machine } from '../types';
import { ParsedPortInfo } from './multiHostScanParser';

export interface CredentialLootItem {
  username: string;
  secret: string; // Plaintext password or NTLM hash
  isHash?: boolean;
  domain?: string;
  source: string; // e.g. "Kerberoasting svc-alfresco", "SAM dump", "Config file"
  privilegeLevel: 'User' | 'Administrator' | 'SYSTEM' | 'Domain Admin';
}

export interface AttackMilestone {
  stage: 'Reconnaissance' | 'Initial Access / Foothold' | 'Privilege Escalation' | 'Root / Full Compromise';
  timestamp?: string;
  technique: string;
  notes: string;
}

export interface VulnerabilityFinding {
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  cvssVector?: string;
  cvssScore?: number;
  cveId?: string;
  description: string;
  proofOfConcept: string;
  remediation: string;
}

export interface MachineReportData {
  machine: Machine;
  executiveSummary?: string;
  ports?: ParsedPortInfo[];
  credentials?: CredentialLootItem[];
  milestones?: AttackMilestone[];
  findings?: VulnerabilityFinding[];
}

/**
 * Formats open ports into a clean Markdown table.
 */
export function compilePortsMarkdownTable(ports: ParsedPortInfo[]): string {
  if (!ports || ports.length === 0) {
    return '_No open ports recorded._\n';
  }

  const lines = [
    '| Port | State | Service | Version / Banner |',
    '| :--- | :--- | :--- | :--- |',
  ];

  for (const p of ports) {
    const portStr = `\`${p.port}/${p.protocol || 'tcp'}\``;
    const stateStr = p.state === 'open' ? '🟢 `open`' : `\`${p.state}\``;
    const servStr = p.service || 'unknown';
    const verStr = p.version ? p.version.replace(/\|/g, '\\|') : '-';
    lines.push(`| ${portStr} | ${stateStr} | ${servStr} | ${verStr} |`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Formats credential loot into a clean Markdown table.
 */
export function compileCredentialsMarkdownTable(creds: CredentialLootItem[]): string {
  if (!creds || creds.length === 0) {
    return '_No credentials compromised._\n';
  }

  const lines = [
    '| Identity | Secret Type | Secret / Hash | Privilege | Compromise Vector |',
    '| :--- | :--- | :--- | :--- | :--- |',
  ];

  for (const c of creds) {
    const identity = c.domain ? `\`${c.domain}\\${c.username}\`` : `\`${c.username}\``;
    const secType = c.isHash ? '🔐 `NTLM Hash`' : '🔑 `Plaintext`';
    const secret = `\`${c.secret}\``;
    const priv = `**${c.privilegeLevel}**`;
    const source = c.source.replace(/\|/g, '\\|');
    lines.push(`| ${identity} | ${secType} | ${secret} | ${priv} | ${source} |`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Formats attack timeline into a clean Markdown list.
 */
export function compileAttackTimelineMarkdown(milestones: AttackMilestone[]): string {
  if (!milestones || milestones.length === 0) {
    return '_No attack timeline milestones recorded._\n';
  }

  const lines: string[] = [];
  for (const m of milestones) {
    const timeStr = m.timestamp ? `\`${m.timestamp}\` - ` : '';
    lines.push(`- **${m.stage}**: ${timeStr}**${m.technique}**`);
    if (m.notes) {
      lines.push(`  > ${m.notes}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Formats vulnerability findings into structured Obsidian / CPTS exam report sections.
 */
export function compileFindingsMarkdown(findings: VulnerabilityFinding[]): string {
  if (!findings || findings.length === 0) {
    return '_No vulnerability findings documented._\n';
  }

  const sections: string[] = [];
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const severityBadge = {
      Critical: '🔴 **CRITICAL**',
      High: '🟠 **HIGH**',
      Medium: '🟡 **MEDIUM**',
      Low: '🔵 **LOW**',
      Informational: '⚪ **INFORMATIONAL**',
    }[f.severity];

    const cvssInfo = f.cvssScore !== undefined ? ` (CVSS: \`${f.cvssScore.toFixed(1)}\`)` : '';
    const cveInfo = f.cveId ? ` - \`${f.cveId}\`` : '';

    const lines = [
      `### ${i + 1}. ${f.title} [${severityBadge}${cvssInfo}${cveInfo}]`,
      '',
      `**Description:**`,
      f.description,
      '',
      `**Proof of Concept:**`,
      '```bash',
      f.proofOfConcept,
      '```',
      '',
      `**Remediation:**`,
      `> [!TIP]`,
      `> ${f.remediation}`,
      '',
    ];

    sections.push(lines.join('\n'));
  }

  return sections.join('\n---\n\n');
}

/**
 * Master Machine Writeup & Pentest Report Compiler.
 * Assembles an entire, production-grade Markdown document with YAML frontmatter.
 */
export function compileCompleteMachineReport(data: MachineReportData): string {
  const { machine, executiveSummary, ports, credentials, milestones, findings } = data;

  const now = new Date().toISOString().split('T')[0];
  const tagsStr = machine.tags.map((t) => `  - ${t}`).join('\n');

  const frontmatter = `---
title: "Penetration Testing Report: ${machine.name}"
target_ip: "${machine.ip}"
platform: "${machine.platform}"
os: "${machine.os}"
difficulty: "${machine.difficulty}"
status: "${machine.status}"
date: "${now}"
tags:
${tagsStr}
---`;

  const headerSection = `# Penetration Testing Report // Target: ${machine.name}

> [!NOTE]
> **Target IP:** \`${machine.ip}\` | **Platform:** ${machine.platform} | **OS:** ${machine.os} | **Difficulty:** ${machine.difficulty} | **Status:** \`${machine.status.toUpperCase()}\`

## 1. Executive Summary
${executiveSummary || `Target machine **${machine.name}** was successfully evaluated. Initial reconnaissance revealed exposed network services leading to remote code execution and subsequent privilege escalation.`}
`;

  const reconSection = `## 2. Reconnaissance & Port Enumeration
${compilePortsMarkdownTable(ports || [])}`;

  const lootSection = `## 3. Compromised Credentials & Loot Desk
${compileCredentialsMarkdownTable(credentials || [])}`;

  const timelineSection = `## 4. Attack Lifecycle & Killchain Progression
${compileAttackTimelineMarkdown(milestones || [])}`;

  const findingsSection = `## 5. Detailed Vulnerability Findings & PoCs
${compileFindingsMarkdown(findings || [])}`;

  return [
    frontmatter,
    '',
    headerSection,
    reconSection,
    lootSection,
    timelineSection,
    findingsSection,
  ].join('\n');
}
