import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkExamAlerts,
  checkReviewAlert,
  dueExamThreshold,
  localDayKey,
  shouldNotifyReview,
} from './notificationEngine';
import {
  enableDesktopNotifications,
  readNotificationState,
  writeNotificationState,
} from './notificationPrefs';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function stubNotification(permission: NotificationPermission) {
  const requestPermission = vi.fn(async () => permission);
  vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission, requestPermission }));
  Object.defineProperty(window, 'Notification', { value: globalThis.Notification, configurable: true, writable: true });
  return requestPermission;
}

describe('notification thresholds from the end timestamp', () => {
  const end = 10 * HOUR;
  it('is quiet before the 1 hour mark', () => {
    expect(dueExamThreshold(end, end - HOUR - 1000, [])).toEqual({ announce: null, mark: [] });
  });
  it('announces 1 hour, then 15 minutes, then time up', () => {
    expect(dueExamThreshold(end, end - HOUR, []).announce).toBe(3600);
    expect(dueExamThreshold(end, end - 15 * MIN, [3600]).announce).toBe(900);
    expect(dueExamThreshold(end, end, [3600, 900]).announce).toBe(0);
  });
  it('announces only the most urgent threshold after a late reload but marks all as fired', () => {
    const r = dueExamThreshold(end, end - 10 * MIN, []);
    expect(r.announce).toBe(900);
    expect(r.mark.sort((a, b) => b - a)).toEqual([3600, 900]);
  });
  it('skips a stale time-up alert but still marks it', () => {
    const r = dueExamThreshold(end, end + 3 * HOUR, [3600, 900]);
    expect(r.announce).toBeNull();
    expect(r.mark).toEqual([0]);
  });
});

describe('once-only firing', () => {
  beforeEach(() => {
    localStorage.clear();
    stubNotification('granted');
    writeNotificationState({ enabled: true });
  });

  it('fires each threshold once per exam, including across a reload (persisted state)', () => {
    const notify = vi.fn();
    const exam = { status: 'running', startedAt: 1000, examExpiresAt: 1000 + 8 * HOUR };
    const t = exam.examExpiresAt - 30 * MIN;
    expect(checkExamAlerts(exam, t, notify)).toBe(true);
    expect(checkExamAlerts(exam, t + 5000, notify)).toBe(false);
    // "reload": module state is gone, only localStorage remains
    expect(checkExamAlerts(exam, t + 10_000, notify)).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(checkExamAlerts(exam, exam.examExpiresAt - 14 * MIN, notify)).toBe(true);
    expect(checkExamAlerts(exam, exam.examExpiresAt + 1000, notify)).toBe(true);
    expect(notify).toHaveBeenCalledTimes(3);
  });

  it('starts fresh for a new exam session', () => {
    const notify = vi.fn();
    checkExamAlerts({ status: 'running', startedAt: 1, examExpiresAt: 1 + 3 * HOUR }, 1 + 2.5 * HOUR, notify);
    checkExamAlerts({ status: 'running', startedAt: 2, examExpiresAt: 2 + 3 * HOUR }, 2 + 2.5 * HOUR, notify);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('does nothing when paused, idle, toggled off or permission is not granted', () => {
    const notify = vi.fn();
    const base = { startedAt: 1, examExpiresAt: 1 + HOUR };
    expect(checkExamAlerts({ ...base, status: 'paused', examExpiresAt: null }, 1 + HOUR, notify)).toBe(false);
    expect(checkExamAlerts({ ...base, status: 'idle' }, 1 + HOUR, notify)).toBe(false);
    writeNotificationState({ enabled: false });
    expect(checkExamAlerts({ ...base, status: 'running' }, 1 + HOUR, notify)).toBe(false);
    writeNotificationState({ enabled: true });
    stubNotification('default');
    expect(checkExamAlerts({ ...base, status: 'running' }, 1 + HOUR, notify)).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('review-due alert gating', () => {
  beforeEach(() => {
    localStorage.clear();
    stubNotification('granted');
    writeNotificationState({ enabled: true });
  });

  it('needs something due and a new local day', () => {
    const now = new Date(2026, 10, 9, 10, 0).getTime();
    expect(shouldNotifyReview(0, now, null)).toBe(false);
    expect(shouldNotifyReview(3, now, null)).toBe(true);
    expect(shouldNotifyReview(3, now, localDayKey(now))).toBe(false);
    expect(shouldNotifyReview(3, now + 24 * HOUR, localDayKey(now))).toBe(true);
  });

  it('fires at most once per day with plural copy', () => {
    const notify = vi.fn();
    const now = new Date(2026, 10, 9, 10, 0).getTime();
    expect(checkReviewAlert(3, now, notify)).toBe(true);
    expect(notify).toHaveBeenCalledWith('Reviews due', '3 machines are due for review today.', 'review-due');
    expect(checkReviewAlert(5, now + HOUR, notify)).toBe(false);
    expect(readNotificationState().lastReviewDay).toBe(localDayKey(now));
    expect(checkReviewAlert(1, now + 24 * HOUR, notify)).toBe(true);
    expect(notify).toHaveBeenLastCalledWith('Reviews due', '1 machine is due for review today.', 'review-due');
  });
});

describe('permission handling', () => {
  beforeEach(() => localStorage.clear());

  it('never requests permission on its own (importing and checking is silent)', () => {
    const request = stubNotification('default');
    expect(checkReviewAlert(2, Date.now(), vi.fn())).toBe(false);
    expect(checkExamAlerts({ status: 'running', startedAt: 1, examExpiresAt: 2 }, 5, vi.fn())).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('requests permission only through the toggle action, and stays off when denied', async () => {
    const request = stubNotification('default');
    request.mockResolvedValueOnce('denied');
    await expect(enableDesktopNotifications()).resolves.toBe('denied');
    expect(request).toHaveBeenCalledTimes(1);
    expect(readNotificationState().enabled).toBe(false);
    request.mockResolvedValueOnce('granted');
    await expect(enableDesktopNotifications()).resolves.toBe('enabled');
    expect(readNotificationState().enabled).toBe(true);
  });
});
