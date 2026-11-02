import { create } from 'zustand';

/** Raw localStorage key. Deliberately outside every backup key list: a restore must not change it. */
export const BACKUP_REMINDER_KEY = 'zerobox_backup_v1';

export const DAY_MS = 86_400_000;
/** First reminder comes this long after the first real activity when no backup exists. */
export const FIRST_BACKUP_GRACE_DAYS = 3;
/** A backup older than this counts as stale. */
export const STALE_BACKUP_DAYS = 14;
export const SNOOZE_DAYS = 7;

export interface BackupReminderState {
  lastBackupAt?: string;
  snoozeUntil?: string;
  firstActivityAt?: string;
}

const validIso = (v: unknown): string | undefined =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : undefined;

/** Reads the saved state. Missing, corrupt or blocked storage yields an empty state. */
export function loadBackupReminder(): BackupReminderState {
  try {
    const raw = window.localStorage.getItem(BACKUP_REMINDER_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const p = parsed as Record<string, unknown>;
    const out: BackupReminderState = {};
    const last = validIso(p.lastBackupAt);
    const snooze = validIso(p.snoozeUntil);
    const first = validIso(p.firstActivityAt);
    if (last) out.lastBackupAt = last;
    if (snooze) out.snoozeUntil = snooze;
    if (first) out.firstActivityAt = first;
    return out;
  } catch {
    return {};
  }
}

/** Writes the saved state. Failures are ignored; the reminder just restarts next visit. */
export function saveBackupReminder(state: BackupReminderState): void {
  try {
    window.localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked or full */
  }
}

interface DataShape {
  machines: ReadonlyArray<{ status?: string }>;
  userNotes: ReadonlyArray<unknown>;
  customNotes: ReadonlyArray<unknown>;
}

/** Real progress exists: a machine past Backlog, or any imported or authored note. */
export function hasMeaningfulData(d: DataShape): boolean {
  return (
    d.machines.some((m) => m.status !== undefined && m.status !== 'backlog') ||
    (d.userNotes?.length ?? 0) > 0 ||
    (d.customNotes?.length ?? 0) > 0
  );
}

const ms = (iso: string | undefined): number => (iso ? Date.parse(iso) : NaN);

/** Overdue ignores snoozing: it drives the amber hint in Settings. */
export function isBackupOverdue(state: BackupReminderState, now: number, hasData: boolean): boolean {
  if (!hasData) return false;
  if (state.lastBackupAt) return now - ms(state.lastBackupAt) > STALE_BACKUP_DAYS * DAY_MS;
  return state.firstActivityAt ? now - ms(state.firstActivityAt) > FIRST_BACKUP_GRACE_DAYS * DAY_MS : false;
}

/** The card rule: overdue and not snoozed. */
export function isBackupDue(state: BackupReminderState, now: number, hasData: boolean): boolean {
  if (state.snoozeUntil && ms(state.snoozeUntil) > now) return false;
  return isBackupOverdue(state, now, hasData);
}

/** "today", "yesterday" or "N days ago". */
export function formatBackupAge(iso: string, now: number): string {
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

interface BackupReminderStore extends BackupReminderState {
  recordBackup: (now?: number) => void;
  snooze: (days?: number, now?: number) => void;
  markActivity: (now?: number) => void;
  hydrate: () => void;
}

const snapshot = (s: BackupReminderState): BackupReminderState => ({
  ...(s.lastBackupAt ? { lastBackupAt: s.lastBackupAt } : {}),
  ...(s.snoozeUntil ? { snoozeUntil: s.snoozeUntil } : {}),
  ...(s.firstActivityAt ? { firstActivityAt: s.firstActivityAt } : {}),
});

export const useBackupReminderStore = create<BackupReminderStore>((set, get) => ({
  ...loadBackupReminder(),

  recordBackup: (now = Date.now()) => {
    set({ lastBackupAt: new Date(now).toISOString(), snoozeUntil: undefined });
    saveBackupReminder(snapshot(get()));
  },

  snooze: (days = SNOOZE_DAYS, now = Date.now()) => {
    set({ snoozeUntil: new Date(now + days * DAY_MS).toISOString() });
    saveBackupReminder(snapshot(get()));
  },

  markActivity: (now = Date.now()) => {
    if (get().firstActivityAt) return;
    set({ firstActivityAt: new Date(now).toISOString() });
    saveBackupReminder(snapshot(get()));
  },

  hydrate: () =>
    set({ lastBackupAt: undefined, snoozeUntil: undefined, firstActivityAt: undefined, ...loadBackupReminder() }),
}));

/** Call when a full workspace export has succeeded, from any path. */
export const recordBackupSuccess = (): void => useBackupReminderStore.getState().recordBackup();
