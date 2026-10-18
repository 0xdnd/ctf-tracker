import { describe, it, expect } from 'vitest';
import { buildLabSummaryMarkdown } from './labMarkdownSummary';
import type { Machine } from '../types';

const base = {
  id: 'm1',
  name: 'Lame',
  ip: '10.10.10.3',
  os: 'Linux',
  platform: 'HTB',
  tags: [],
} as unknown as Machine;

const full: Machine = {
  ...base,
  services: [
    { port: 445, protocol: 'tcp', state: 'open', service: 'smb', version: 'Samba 3.0.20', cveNotes: 'CVE-2007-2447' },
    { port: 22, protocol: 'tcp', state: 'open', service: 'ssh', version: 'OpenSSH 4.7p1' },
  ],
  portTriage: {
    '445': { status: 'key_vector', note: 'usermap_script\nworks' },
    '22': { status: 'dead_end', note: 'no creds' },
    '80': { status: 'untested' },
  },
  findings: [
    { id: 'f2', title: 'Weak SSH', severity: 'low', createdAt: 1, updatedAt: 1 },
    {
      id: 'f1',
      title: 'Samba usermap script RCE',
      severity: 'critical',
      cvssScore: 9.8,
      cweCve: 'CVE-2007-2447',
      affectedService: 'smb/445',
      remediation: 'Upgrade Samba',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  timeline: [
    { id: 't2', at: Date.UTC(2026, 0, 2, 10, 30), kind: 'root_pwned', label: 'Rooted' },
    { id: 't1', at: Date.UTC(2026, 0, 1, 9, 0), kind: 'user_pwned', label: 'User flag' },
  ],
} as Machine;

describe('buildLabSummaryMarkdown', () => {
  it('returns an empty string when the lab has no study data', () => {
    expect(buildLabSummaryMarkdown(base)).toBe('');
  });

  it('returns an empty string for active machines', () => {
    expect(buildLabSummaryMarkdown({ ...full, isActive: true })).toBe('');
  });

  it('lists services sorted by port, with version and CVE notes', () => {
    const md = buildLabSummaryMarkdown(full);
    expect(md).toContain('## Open ports and services');
    expect(md.indexOf('**22/tcp**')).toBeLessThan(md.indexOf('**445/tcp**'));
    expect(md).toContain('- **445/tcp** open smb Samba 3.0.20 (CVE-2007-2447)');
  });

  it('falls back to bare open ports when there is no service data', () => {
    const md = buildLabSummaryMarkdown({ ...base, openPorts: [80, 22] });
    expect(md).toBe('## Open ports and services\n\n- **22** open\n- **80** open');
  });

  it('includes triage entries with status and single-line notes, skipping untouched ports', () => {
    const md = buildLabSummaryMarkdown(full);
    expect(md).toContain('## Port triage notes');
    expect(md).toContain('- **22** [Dead end]: no creds');
    expect(md).toContain('- **445** [Key vector]: usermap_script works');
    expect(md).not.toContain('**80** [');
  });

  it('correctly sorts protocol-aware port triage keys without NaN sorting failures', () => {
    const machineWithProto: Machine = {
      ...base,
      portTriage: {
        '445/tcp': { status: 'key_vector', note: 'smb attack' },
        '53/udp': { status: 'dead_end', note: 'udp filtered' },
        '53/tcp': { status: 'checking', note: 'zone transfer' },
        '22/tcp': { status: 'checking', note: 'ssh banner' },
      },
    } as Machine;
    const md = buildLabSummaryMarkdown(machineWithProto);
    expect(md).toContain('## Port triage notes');
    const idx22 = md.indexOf('**22/tcp**');
    const idx53tcp = md.indexOf('**53/tcp**');
    const idx53udp = md.indexOf('**53/udp**');
    const idx445 = md.indexOf('**445/tcp**');
    expect(idx22).toBeLessThan(idx53tcp);
    expect(idx53tcp).toBeLessThan(idx53udp);
    expect(idx53udp).toBeLessThan(idx445);
  });

  it('renders findings by severity with CVSS, CWE/CVE, service and remediation', () => {
    const md = buildLabSummaryMarkdown(full);
    expect(md.indexOf('Samba usermap script RCE')).toBeLessThan(md.indexOf('Weak SSH'));
    expect(md).toContain('- **Severity:** Critical');
    expect(md).toContain('- **CVSS:** 9.8');
    expect(md).toContain('- **CWE/CVE:** CVE-2007-2447');
    expect(md).toContain('- **Affected service:** smb/445');
    expect(md).toContain('- **Remediation:** Upgrade Samba');
    // optional fields are omitted when absent
    const weak = md.slice(md.indexOf('### Weak SSH'));
    expect(weak).not.toContain('CVSS');
  });

  it('lists the timeline chronologically and honours the opt-outs', () => {
    const md = buildLabSummaryMarkdown(full);
    expect(md).toContain('## Timeline');
    expect(md.indexOf('User flag')).toBeLessThan(md.indexOf('Rooted'));
    expect(md).toContain('- 2026-01-02 10:30 Rooted');
    expect(buildLabSummaryMarkdown(full, { includeTimeline: false })).not.toContain('Timeline');
    expect(buildLabSummaryMarkdown(full, { timelineLimit: 1 })).not.toContain('User flag');
  });

  it('shifts heading levels', () => {
    const md = buildLabSummaryMarkdown(full, { headingLevel: 3 });
    expect(md).toContain('### Findings');
    expect(md).toContain('#### Samba usermap script RCE');
  });
});
