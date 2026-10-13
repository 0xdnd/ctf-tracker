import type { Machine } from '../types';
import type { PortTriageStatus } from '../types/labStudy';

export interface LabSummaryOptions {
  /** Markdown heading level for the section titles (findings use one level deeper). Default 2. */
  headingLevel?: number;
  includeTimeline?: boolean;
  /** Most recent timeline events to keep. Default 20. */
  timelineLimit?: number;
}

const TRIAGE_LABEL: Record<PortTriageStatus, string> = {
  untested: 'Untested',
  checking: 'Checking',
  key_vector: 'Key vector',
  dead_end: 'Dead end',
};

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const heading = (level: number, text: string) => `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${text}`;

/** Collapse newlines so a value stays on one Markdown list line. */
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const formatDate = (epochMs: number) => {
  const d = new Date(epochMs);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16).replace('T', ' ');
};

function portsSection(machine: Machine, level: number): string[] {
  const lines: string[] = [];
  const services = machine.services ?? [];
  if (services.length > 0) {
    for (const s of [...services].sort((a, b) => a.port - b.port)) {
      const detail = [s.state, s.service, s.version].filter(Boolean).join(' ');
      let line = `- **${s.port}/${s.protocol}** ${detail}`.trimEnd();
      if (s.cveNotes) line += ` (${oneLine(s.cveNotes)})`;
      lines.push(line);
    }
  } else if (machine.openPorts && machine.openPorts.length > 0) {
    for (const p of [...machine.openPorts].sort((a, b) => a - b)) lines.push(`- **${p}** open`);
  }
  return lines.length ? [heading(level, 'Open ports and services'), '', ...lines, ''] : [];
}

function triageSection(machine: Machine, level: number): string[] {
  const entries = Object.entries(machine.portTriage ?? {}).filter(
    ([, e]) => e && (e.status !== 'untested' || e.note)
  );
  if (entries.length === 0) return [];
  entries.sort((a, b) => Number(a[0]) - Number(b[0]));
  const lines = entries.map(([port, e]) => {
    const note = e.note ? `: ${oneLine(e.note)}` : '';
    return `- **${port}** [${TRIAGE_LABEL[e.status] ?? e.status}]${note}`;
  });
  return [heading(level, 'Port triage notes'), '', ...lines, ''];
}

function findingsSection(machine: Machine, level: number): string[] {
  const findings = machine.findings ?? [];
  if (findings.length === 0) return [];
  const sorted = [...findings].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) || (b.cvssScore ?? 0) - (a.cvssScore ?? 0)
  );
  const out: string[] = [heading(level, 'Findings'), ''];
  for (const f of sorted) {
    out.push(heading(level + 1, oneLine(f.title) || 'Untitled finding'), '');
    out.push(`- **Severity:** ${capitalize(f.severity)}`);
    if (f.cvssScore !== undefined) out.push(`- **CVSS:** ${f.cvssScore.toFixed(1)}`);
    if (f.cweCve) out.push(`- **CWE/CVE:** ${oneLine(f.cweCve)}`);
    if (f.affectedService) out.push(`- **Affected service:** ${oneLine(f.affectedService)}`);
    if (f.remediation) out.push(`- **Remediation:** ${oneLine(f.remediation)}`);
    out.push('');
  }
  return out;
}

function timelineSection(machine: Machine, level: number, limit: number): string[] {
  const events = [...(machine.timeline ?? [])].sort((a, b) => a.at - b.at).slice(-limit);
  if (events.length === 0) return [];
  const lines = events.map((e) => {
    const when = formatDate(e.at);
    return when ? `- ${when} ${oneLine(e.label)}` : `- ${oneLine(e.label)}`;
  });
  return [heading(level, 'Timeline'), '', ...lines, ''];
}

/**
 * Markdown summary of the per-lab study data: services, port triage, findings and timeline.
 * Empty sections are omitted; returns '' when there is nothing to report or the lab is an active
 * HTB machine (no writeup content for active targets).
 */
export function buildLabSummaryMarkdown(machine: Machine, opts: LabSummaryOptions = {}): string {
  if (machine.isActive) return '';
  const level = opts.headingLevel ?? 2;
  const sections = [
    ...portsSection(machine, level),
    ...triageSection(machine, level),
    ...findingsSection(machine, level),
    ...(opts.includeTimeline === false ? [] : timelineSection(machine, level, opts.timelineLimit ?? 20)),
  ];
  while (sections.length && sections[sections.length - 1] === '') sections.pop();
  return sections.join('\n');
}
