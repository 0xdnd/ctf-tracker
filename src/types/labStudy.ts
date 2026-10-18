/**
 * Optional per-lab study data attached to a Machine (port triage, findings, timeline, spaced review).
 * Every field is optional on Machine, so older persisted rows and backups stay valid without a schema bump.
 */
import type { FindingSeverity } from './findings';

export type PortTriageStatus = 'untested' | 'checking' | 'key_vector' | 'dead_end';

export interface PortTriageEntry {
  status: PortTriageStatus;
  note?: string;
}

export interface LabFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  cvssScore?: number;
  cweCve?: string;
  affectedService?: string;
  repro?: string;
  remediation?: string;
  createdAt: number;
  updatedAt: number;
}

export type NewLabFindingInput = Omit<LabFinding, 'id' | 'createdAt' | 'updatedAt'>;
export type LabFindingPatch = Partial<Omit<LabFinding, 'id' | 'createdAt' | 'updatedAt'>>;

export type TimelineEventKind =
  | 'status_change'
  | 'user_pwned'
  | 'root_pwned'
  | 'finding_added'
  | 'review_scheduled'
  | 'note';

export interface TimelineEvent {
  id: string;
  at: number;
  kind: TimelineEventKind;
  label: string;
  meta?: Record<string, string>;
}

export type SolveIndependence = 'solo' | 'nudged' | 'assisted';

/** Oldest events are dropped beyond this many per machine. */
export const TIMELINE_CAP = 200;
