/**
 * Desktop notification logic. Loaded lazily (dynamic import) once the user has switched notifications on.
 * Web Notification API only: no push, no network.
 */
import { canNotify, readNotificationState, writeNotificationState } from './notificationPrefs';

/** Seconds left at which exam alerts fire. 0 = time is up. */
export const EXAM_ALERT_THRESHOLDS = [3600, 900, 0] as const;
/** A time-up alert older than this (for example after reopening the app much later) is skipped. */
export const TIME_UP_GRACE_MS = 10 * 60 * 1000;

export type Notifier = (title: string, body: string, tag: string) => void;

export function defaultNotifier(title: string, body: string, tag: string): void {
  try {
    const n = new Notification(title, { body, tag });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* some platforms throw when constructing Notification: skip quietly */
  }
}

/**
 * Pure. Given the exam end timestamp, which thresholds are due and which one to announce.
 * All due thresholds are marked fired, but only the most urgent one is announced (no burst after a reload).
 */
export function dueExamThreshold(
  expiresAt: number,
  now: number,
  fired: readonly number[],
): { announce: number | null; mark: number[] } {
  const remainingSec = (expiresAt - now) / 1000;
  const due = EXAM_ALERT_THRESHOLDS.filter((t) => remainingSec <= t && !fired.includes(t));
  if (due.length === 0) return { announce: null, mark: [] };
  let announce: number | null = Math.min(...due);
  if (announce === 0 && now - expiresAt > TIME_UP_GRACE_MS) announce = null;
  return { announce, mark: [...due] };
}

const EXAM_COPY: Record<number, string> = {
  3600: '1 hour left in your exam.',
  900: '15 minutes left in your exam.',
  0: 'Time is up. Your exam clock has run out.',
};

export function checkExamAlerts(
  exam: { status: string; startedAt: number | null; examExpiresAt: number | null },
  now: number = Date.now(),
  notify: Notifier = defaultNotifier,
): boolean {
  if (!canNotify()) return false;
  if (exam.status !== 'running' && exam.status !== 'completed') return false;
  if (exam.startedAt == null || exam.examExpiresAt == null) return false;
  const stored = readNotificationState().exam;
  const fired = stored && stored.startedAt === exam.startedAt ? stored.fired : [];
  const { announce, mark } = dueExamThreshold(exam.examExpiresAt, now, fired);
  if (mark.length === 0) return false;
  // Claim first so a second tab or a quick re-poll cannot fire the same alert twice.
  writeNotificationState({ exam: { startedAt: exam.startedAt, fired: [...fired, ...mark] } });
  if (announce == null) return false;
  notify('Exam timer', EXAM_COPY[announce], `exam-${exam.startedAt}-${announce}`);
  return true;
}

export function localDayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Pure. At most one review alert per local calendar day, and only if something is due. */
export function shouldNotifyReview(dueCount: number, now: number, lastDay: string | null): boolean {
  return dueCount > 0 && localDayKey(now) !== lastDay;
}

export function checkReviewAlert(
  dueCount: number,
  now: number = Date.now(),
  notify: Notifier = defaultNotifier,
): boolean {
  if (!canNotify()) return false;
  if (!shouldNotifyReview(dueCount, now, readNotificationState().lastReviewDay)) return false;
  writeNotificationState({ lastReviewDay: localDayKey(now) });
  const body =
    dueCount === 1 ? '1 machine is due for review today.' : `${dueCount} machines are due for review today.`;
  notify('Reviews due', body, 'review-due');
  return true;
}
