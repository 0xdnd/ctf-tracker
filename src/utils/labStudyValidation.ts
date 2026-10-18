import { FINDING_SEVERITIES } from '../types/findings';
import { TIMELINE_CAP } from '../types/labStudy';
import type { LabFinding, PortTriageEntry, TimelineEvent } from '../types/labStudy';

/**
 * Import-time bounds for the optional per-lab study fields on a machine (backups and sync files).
 * Only keys that are present are touched, so rows from older builds pass through unchanged. Never throws.
 */
const MAX_HOST_LEN = 253;
const MAX_VHOSTS = 100;
const MAX_TRIAGE_PORTS = 1000;
const MAX_NOTE_LEN = 2000;
const MAX_FINDINGS = 500;
const MAX_TITLE_LEN = 300;
const MAX_TEXT_LEN = 20000;
const MAX_LABEL_LEN = 500;

const TRIAGE = new Set(['untested', 'checking', 'key_vector', 'dead_end']);
const KINDS = new Set(['status_change', 'user_pwned', 'root_pwned', 'finding_added', 'review_scheduled', 'note']);
const INDEPENDENCE = new Set(['solo', 'nudged', 'assisted']);

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' ? v.slice(0, max) : undefined);
const finite = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

function cleanFinding(raw: unknown): LabFinding | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const title = str(raw.title, MAX_TITLE_LEN)?.trim();
  const severity = (FINDING_SEVERITIES as readonly string[]).includes(raw.severity as string)
    ? (raw.severity as LabFinding['severity'])
    : 'info';
  const out: LabFinding = {
    id: raw.id.slice(0, 100),
    title: title || 'Untitled finding',
    severity,
    createdAt: finite(raw.createdAt) ?? 0,
    updatedAt: finite(raw.updatedAt) ?? 0,
  };
  const score = finite(raw.cvssScore);
  if (score !== undefined) out.cvssScore = Math.min(10, Math.max(0, score));
  for (const k of ['cweCve', 'affectedService', 'repro', 'remediation'] as const) {
    const v = str(raw[k], MAX_TEXT_LEN);
    if (v) out[k] = v;
  }
  return out;
}

function cleanEvent(raw: unknown): TimelineEvent | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const at = finite(raw.at);
  if (at === undefined || !KINDS.has(raw.kind as string)) return null;
  const out: TimelineEvent = {
    id: raw.id.slice(0, 100),
    at,
    kind: raw.kind as TimelineEvent['kind'],
    label: str(raw.label, MAX_LABEL_LEN) ?? '',
  };
  if (isObj(raw.meta)) {
    const meta: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.meta).slice(0, 20)) {
      if (typeof v === 'string') meta[k.slice(0, 50)] = v.slice(0, MAX_LABEL_LEN);
    }
    if (Object.keys(meta).length) out.meta = meta;
  }
  return out;
}

export function sanitizeLabStudyFields<T>(machine: T): T {
  if (!isObj(machine)) return machine;
  const m: Record<string, unknown> = { ...machine };

  if ('domain' in m) {
    const v = str(m.domain, MAX_HOST_LEN)?.trim();
    if (v) m.domain = v;
    else delete m.domain;
  }
  if ('vhosts' in m) {
    const list: string[] = [];
    if (Array.isArray(m.vhosts)) {
      for (const v of m.vhosts) {
        const host = str(v, MAX_HOST_LEN)?.trim().toLowerCase();
        if (host && !list.includes(host)) list.push(host);
        if (list.length >= MAX_VHOSTS) break;
      }
    }
    if (list.length) m.vhosts = list;
    else delete m.vhosts;
  }
  if ('portTriage' in m) {
    const out: Record<string, PortTriageEntry> = {};
    if (isObj(m.portTriage)) {
      for (const [port, entry] of Object.entries(m.portTriage).slice(0, MAX_TRIAGE_PORTS)) {
        if (!isObj(entry) || !TRIAGE.has(entry.status as string)) continue;
        const clean: PortTriageEntry = { status: entry.status as PortTriageEntry['status'] };
        const note = str(entry.note, MAX_NOTE_LEN);
        if (note) clean.note = note;
        out[port.slice(0, 32)] = clean;
      }
    }
    if (Object.keys(out).length) m.portTriage = out;
    else delete m.portTriage;
  }
  if ('findings' in m) {
    const list = Array.isArray(m.findings)
      ? m.findings.slice(0, MAX_FINDINGS).map(cleanFinding).filter((f): f is LabFinding => f !== null)
      : [];
    if (list.length) m.findings = list;
    else delete m.findings;
  }
  if ('timeline' in m) {
    const list = Array.isArray(m.timeline)
      ? m.timeline.slice(-TIMELINE_CAP).map(cleanEvent).filter((e): e is TimelineEvent => e !== null)
      : [];
    if (list.length) m.timeline = list;
    else delete m.timeline;
  }
  if ('solveIndependence' in m && !INDEPENDENCE.has(m.solveIndependence as string)) delete m.solveIndependence;
  if ('nextReviewAt' in m && finite(m.nextReviewAt) === undefined) delete m.nextReviewAt;
  if ('reviewCount' in m) {
    const c = finite(m.reviewCount);
    if (c !== undefined && c >= 0) m.reviewCount = Math.floor(c);
    else delete m.reviewCount;
  }
  return m as T;
}
