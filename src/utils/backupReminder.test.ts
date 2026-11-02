import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_REMINDER_KEY,
  DAY_MS,
  formatBackupAge,
  hasMeaningfulData,
  isBackupDue,
  isBackupOverdue,
  loadBackupReminder,
  saveBackupReminder,
  useBackupReminderStore,
} from './backupReminder';
import { captureRawStorage, isBackedUpStorageKey } from '../store/preMigrationBackup';
import { useCtfStore } from '../store/useCtfStore';

const NOW = Date.parse('2026-11-01T12:00:00.000Z');
const ago = (days: number) => new Date(NOW - days * DAY_MS).toISOString();
const ahead = (days: number) => new Date(NOW + days * DAY_MS).toISOString();

describe('hasMeaningfulData', () => {
  it('is false for all-backlog machines and no notes', () => {
    expect(hasMeaningfulData({ machines: [{ status: 'backlog' }], userNotes: [], customNotes: [] })).toBe(false);
    expect(hasMeaningfulData({ machines: [], userNotes: [], customNotes: [] })).toBe(false);
  });
  it('is true for a machine past backlog, a user note or a custom note', () => {
    expect(hasMeaningfulData({ machines: [{ status: 'backlog' }, { status: 'recon' }], userNotes: [], customNotes: [] })).toBe(true);
    expect(hasMeaningfulData({ machines: [], userNotes: [{}], customNotes: [] })).toBe(true);
    expect(hasMeaningfulData({ machines: [], userNotes: [], customNotes: [{}] })).toBe(true);
  });
});

describe('backup reminder rule', () => {
  it('never shows without meaningful data', () => {
    expect(isBackupDue({ firstActivityAt: ago(30) }, NOW, false)).toBe(false);
    expect(isBackupDue({ lastBackupAt: ago(90) }, NOW, false)).toBe(false);
  });
  it('waits when there is no backup and activity is 3 days old or less, or unknown', () => {
    expect(isBackupDue({ firstActivityAt: ago(3) }, NOW, true)).toBe(false);
    expect(isBackupDue({ firstActivityAt: ago(1) }, NOW, true)).toBe(false);
    expect(isBackupDue({}, NOW, true)).toBe(false);
  });
  it('shows with no backup once activity is more than 3 days old', () => {
    expect(isBackupDue({ firstActivityAt: ago(3.01) }, NOW, true)).toBe(true);
    expect(isBackupDue({ firstActivityAt: ago(10) }, NOW, true)).toBe(true);
  });
  it('shows when the last backup is more than 14 days old, not before', () => {
    expect(isBackupDue({ lastBackupAt: ago(14) }, NOW, true)).toBe(false);
    expect(isBackupDue({ lastBackupAt: ago(14.01) }, NOW, true)).toBe(true);
    expect(isBackupDue({ lastBackupAt: ago(2), firstActivityAt: ago(30) }, NOW, true)).toBe(false);
  });
  it('a snooze in the future hides it, an expired snooze does not', () => {
    expect(isBackupDue({ lastBackupAt: ago(20), snoozeUntil: ahead(3) }, NOW, true)).toBe(false);
    expect(isBackupDue({ lastBackupAt: ago(20), snoozeUntil: ago(1) }, NOW, true)).toBe(true);
  });
  it('overdue ignores the snooze (used for the Settings hint)', () => {
    expect(isBackupOverdue({ lastBackupAt: ago(20), snoozeUntil: ahead(3) }, NOW, true)).toBe(true);
    expect(isBackupOverdue({ lastBackupAt: ago(5) }, NOW, true)).toBe(false);
  });
});

describe('formatBackupAge', () => {
  it('formats today, yesterday and days', () => {
    expect(formatBackupAge(ago(0.2), NOW)).toBe('today');
    expect(formatBackupAge(ago(1.2), NOW)).toBe('yesterday');
    expect(formatBackupAge(ago(9), NOW)).toBe('9 days ago');
  });
});

describe('storage', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('round-trips and drops invalid fields', () => {
    saveBackupReminder({ lastBackupAt: ago(2), snoozeUntil: ahead(1) });
    expect(loadBackupReminder()).toEqual({ lastBackupAt: ago(2), snoozeUntil: ahead(1) });
    window.localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify({ lastBackupAt: 'nope', snoozeUntil: 5, firstActivityAt: ago(1) }));
    expect(loadBackupReminder()).toEqual({ firstActivityAt: ago(1) });
  });
  it('returns an empty state for missing or corrupt data', () => {
    expect(loadBackupReminder()).toEqual({});
    window.localStorage.setItem(BACKUP_REMINDER_KEY, '{oops');
    expect(loadBackupReminder()).toEqual({});
    window.localStorage.setItem(BACKUP_REMINDER_KEY, '[1]');
    expect(loadBackupReminder()).toEqual({});
  });
  it('does not throw when reading or writing is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(loadBackupReminder()).toEqual({});
    expect(() => saveBackupReminder({ lastBackupAt: ago(1) })).not.toThrow();
  });
});

describe('store actions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useBackupReminderStore.setState({ lastBackupAt: undefined, snoozeUntil: undefined, firstActivityAt: undefined });
  });

  it('markActivity sets firstActivityAt once', () => {
    useBackupReminderStore.getState().markActivity(NOW);
    useBackupReminderStore.getState().markActivity(NOW + DAY_MS);
    expect(useBackupReminderStore.getState().firstActivityAt).toBe(new Date(NOW).toISOString());
    expect(loadBackupReminder().firstActivityAt).toBe(new Date(NOW).toISOString());
  });
  it('snooze sets snoozeUntil 7 days ahead', () => {
    useBackupReminderStore.getState().snooze(undefined, NOW);
    expect(useBackupReminderStore.getState().snoozeUntil).toBe(new Date(NOW + 7 * DAY_MS).toISOString());
  });
  it('recordBackup sets lastBackupAt and clears the snooze', () => {
    useBackupReminderStore.getState().snooze(7, NOW);
    useBackupReminderStore.getState().recordBackup(NOW);
    const s = useBackupReminderStore.getState();
    expect(s.lastBackupAt).toBe(new Date(NOW).toISOString());
    expect(s.snoozeUntil).toBeUndefined();
    expect(loadBackupReminder()).toEqual({ lastBackupAt: new Date(NOW).toISOString() });
  });
});

describe('not part of backups', () => {
  it('is excluded from the backed-up storage keys and from captured storage', () => {
    expect(isBackedUpStorageKey(BACKUP_REMINDER_KEY)).toBe(false);
    window.localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify({ lastBackupAt: ago(1) }));
    expect(Object.keys(captureRawStorage())).not.toContain(BACKUP_REMINDER_KEY);
    window.localStorage.removeItem(BACKUP_REMINDER_KEY);
  });
});

describe('export records the backup', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useBackupReminderStore.setState({ lastBackupAt: undefined, snoozeUntil: undefined, firstActivityAt: undefined });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('a successful workspace export sets lastBackupAt', async () => {
    expect(useBackupReminderStore.getState().lastBackupAt).toBeUndefined();
    await useCtfStore.getState().exportWorkspace();
    const at = useBackupReminderStore.getState().lastBackupAt;
    expect(at).toBeDefined();
    expect(Date.now() - Date.parse(at as string)).toBeLessThan(5000);
    expect(loadBackupReminder().lastBackupAt).toBe(at);
  });
});
