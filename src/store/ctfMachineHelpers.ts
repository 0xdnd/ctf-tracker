import {
  Machine,
  PortTriageStatus,
  LabFinding,
  LabFindingPatch,
  TimelineEvent,
  SolveIndependence,
  TIMELINE_CAP,
} from '../types';
import { FINDING_SEVERITIES } from '../types/findings';
import { scheduleNextReview } from '../utils/spacedRepetition';
import { DEFAULT_GLOBAL_VARS } from './ctfDefaults';
import { CtfStoreState } from './ctfStoreTypes';

/** Workspace store: pure machine helpers (timer folding, lab study fields, timeline). */

/** Timer flush: writes timeSpentSeconds and stamps updatedAt, but only when the value really changes. */
export function withTimeSpent(m: Machine, seconds: number, now: string = new Date().toISOString()): Machine {
  if (m.timeSpentSeconds === seconds) return m;
  return { ...m, timeSpentSeconds: seconds, updatedAt: now };
}

/** While the timer runs, the shown seconds are folded into the active machine (and saved) at least this often. */
export const TIMER_CHECKPOINT_SECONDS = 60;

export type TimerSlice = Pick<CtfStoreState, 'machines' | 'activeTargetId' | 'activeTimerSeconds'>;

/**
 * Folds the timer's seconds into the active machine (stamping updatedAt); returns the same array when nothing
 * would change. Never lowers the saved time: only resetTimer and an explicit time edit may do that.
 */
export function foldActiveTimer(state: TimerSlice, seconds: number = state.activeTimerSeconds): Machine[] {
  if (!state.activeTargetId || seconds <= 0) return state.machines;
  const active = state.machines.find((m) => m.id === state.activeTargetId);
  if (!active || seconds <= (active.timeSpentSeconds || 0)) return state.machines;
  return state.machines.map((m) => (m === active ? withTimeSpent(m, seconds) : m));
}

/**
 * Session fields to reset when a machine is deleted (here or in another tab). Only the active machine
 * stops the timer; the shared target IP is cleared only when it was that machine's.
 */
export function deletedMachineSessionReset(
  state: Pick<CtfStoreState, 'machines' | 'activeTargetId' | 'selectedMachineId' | 'globalVars'>,
  id: string
): Partial<CtfStoreState> {
  const out: Partial<CtfStoreState> = {};
  if (state.activeTargetId === id) {
    out.activeTargetId = null;
    out.isTimerRunning = false;
    out.activeTimerSeconds = 0;
    out.timerLastTick = null;
  }
  if (state.selectedMachineId === id) out.selectedMachineId = null;
  const ip = state.machines.find((m) => m.id === id)?.ip;
  if (ip && state.globalVars?.targetIp === ip) out.globalVars = { ...state.globalVars, targetIp: DEFAULT_GLOBAL_VARS.targetIp };
  return out;
}

/** Write-time overlay of the live timer (no updatedAt stamp, never lowers), for saves and exports. */
export function overlayActiveTimer(state: TimerSlice): Machine[] {
  const seconds = state.activeTimerSeconds;
  if (!state.activeTargetId || seconds <= 0) return state.machines;
  return state.machines.map((m) =>
    m.id === state.activeTargetId && seconds > (m.timeSpentSeconds || 0) ? { ...m, timeSpentSeconds: seconds } : m
  );
}

/** The paused timer shows the active machine's saved time (timer fields are transient and never persisted). */
export function timerSecondsFor(machines: Machine[], activeTargetId: string | null | undefined): number {
  if (!activeTargetId) return 0;
  return machines.find((m) => m.id === activeTargetId)?.timeSpentSeconds || 0;
}

export function sanitizeActiveMachine(m: Machine): Machine {
  if (!m.isActive) return m;
  return {
    ...m,
    ip: '',
    tags: [],
    writeupUrl: '',
    hint: '',
    officialWalkthrough: '',
    officialSynopsis: '',
    officialPdf: '',
    userFlag: '',
    rootFlag: '',
    userPwnedAt: undefined,
    rootPwnedAt: undefined,
    openPorts: [],
    services: [],
    scanSummary: '',
    rawScanOutput: '',
    quickNotes: '',
    writeupMarkdown: '',
    skillsLearned: [],
    checklist: undefined,
    // Per-lab study data is recon/progress too: never kept on an active machine.
    domain: undefined,
    vhosts: undefined,
    portTriage: undefined,
    findings: undefined,
    timeline: undefined,
    solveIndependence: undefined,
    nextReviewAt: undefined,
    reviewCount: undefined,
  };
}

export const newLabId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type TimelineEventInput = Omit<TimelineEvent, 'id' | 'at'> & Partial<Pick<TimelineEvent, 'id' | 'at'>>;

/**
 * The single place a timeline event is added: appends, drops the oldest beyond TIMELINE_CAP, and stamps updatedAt
 * (at the event time) so a cross-tab merge sees the change. Active machines never keep a timeline.
 */
export function appendTimeline(m: Machine, event: TimelineEventInput): Machine {
  if (m.isActive) return m;
  const at = typeof event.at === 'number' && Number.isFinite(event.at) ? event.at : Date.now();
  const full: TimelineEvent = {
    id: event.id || newLabId('evt'),
    at,
    kind: event.kind,
    label: event.label,
    ...(event.meta ? { meta: event.meta } : {}),
  };
  const next = [...(Array.isArray(m.timeline) ? m.timeline : []), full];
  return {
    ...m,
    timeline: next.length > TIMELINE_CAP ? next.slice(next.length - TIMELINE_CAP) : next,
    updatedAt: new Date(at).toISOString(),
  };
}

/** Logs status / user-pwn / root-pwn changes between two versions of a machine (used by the status and flag actions). */
export function logProgressTimeline(prev: Machine, next: Machine): Machine {
  if (next.isActive) return next;
  const parsed = Date.parse(next.updatedAt);
  const at = Number.isFinite(parsed) ? parsed : Date.now();
  let out = next;
  if (prev.status !== next.status) {
    const from = String(prev.status || 'backlog');
    const to = String(next.status);
    out = appendTimeline(out, { kind: 'status_change', label: `Status: ${from} -> ${to}`, meta: { from, to }, at });
  }
  if (!prev.userPwnedAt && next.userPwnedAt) out = appendTimeline(out, { kind: 'user_pwned', label: 'User flag captured', at });
  if (!prev.rootPwnedAt && next.rootPwnedAt) out = appendTimeline(out, { kind: 'root_pwned', label: 'Root flag captured', at });
  return out;
}

/**
 * Applies `fn` to one non-active machine and stamps updatedAt. Returns the same array when nothing changed
 * (unknown/active id, or `fn` returned the machine unchanged).
 */
export function patchLabMachine(
  machines: Machine[],
  id: string,
  fn: (m: Machine, nowMs: number) => Machine
): Machine[] {
  const nowMs = Date.now();
  let changed = false;
  const out = machines.map((m) => {
    if (m.id !== id || m.isActive) return m;
    const next = fn(m, nowMs);
    if (next === m) return m;
    changed = true;
    return { ...next, updatedAt: new Date(nowMs).toISOString() };
  });
  return changed ? out : machines;
}

const MAX_VHOSTS = 100;

export const MAX_FINDINGS = 500;

export const PORT_TRIAGE_STATUSES: readonly PortTriageStatus[] = ['untested', 'checking', 'key_vector', 'dead_end'];

export const SOLVE_INDEPENDENCE_VALUES: readonly SolveIndependence[] = ['solo', 'nudged', 'assisted'];

export const normalizeVhosts = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== 'string') continue;
    const host = v.trim().toLowerCase();
    if (host && !out.includes(host)) out.push(host);
    if (out.length >= MAX_VHOSTS) break;
  }
  return out;
};

export const sameList = (a: string[] | undefined, b: string[]): boolean =>
  (a || []).length === b.length && b.every((v, i) => (a || [])[i] === v);

const cleanSeverity = (v: unknown): LabFinding['severity'] =>
  (FINDING_SEVERITIES as readonly string[]).includes(v as string) ? (v as LabFinding['severity']) : 'info';

const cleanCvss = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(10, Math.max(0, Math.round(v * 10) / 10)) : undefined;

/** Normalizes the editable finding fields (title fallback, known severity, CVSS clamped to 0-10). */
export function cleanFindingFields(input: LabFindingPatch, base?: LabFinding): Omit<LabFinding, 'id' | 'createdAt' | 'updatedAt'> {
  const merged = { ...(base || {}), ...input } as Partial<LabFinding>;
  const title = typeof merged.title === 'string' && merged.title.trim() ? merged.title.trim() : 'Untitled finding';
  const out: Omit<LabFinding, 'id' | 'createdAt' | 'updatedAt'> = { title, severity: cleanSeverity(merged.severity) };
  const score = cleanCvss(merged.cvssScore);
  if (score !== undefined) out.cvssScore = score;
  for (const k of ['cweCve', 'affectedService', 'repro', 'remediation'] as const) {
    const v = merged[k];
    if (typeof v === 'string' && v.trim()) out[k] = v;
  }
  return out;
}

/** Sets the independence rating, schedules the next review and logs it. `reviewCount` is the count to schedule with. */
export function scheduleReview(m: Machine, value: SolveIndependence, reviewCount: number, nowMs: number): Machine {
  const nextReviewAt = scheduleNextReview(value, reviewCount, nowMs);
  const nextIso = new Date(nextReviewAt).toISOString();
  return appendTimeline(
    { ...m, solveIndependence: value, reviewCount, nextReviewAt },
    {
      kind: 'review_scheduled',
      label: `Review scheduled (${value}) for ${nextIso.slice(0, 10)}`,
      meta: { independence: value, reviewCount: String(reviewCount), nextReviewAt: nextIso },
      at: nowMs,
    }
  );
}
