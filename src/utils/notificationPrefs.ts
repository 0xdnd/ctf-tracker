/**
 * Opt-in desktop notifications: preference + bookkeeping (tiny, statically imported).
 * Uses its own localStorage key so no persisted store schema changes. The permission prompt is only
 * ever triggered by enableDesktopNotifications(), which the Settings toggle calls.
 */
const KEY = 'zerobox_notifications_v1';
export const NOTIF_PREF_EVENT = 'zerobox:notification-pref';

export interface NotificationState {
  enabled: boolean;
  /** Local calendar day (YYYY-MM-DD) the review-due alert last fired. */
  lastReviewDay: string | null;
  /** Exam alert thresholds (seconds left) already fired for the exam started at `startedAt`. */
  exam: { startedAt: number; fired: number[] } | null;
}

const EMPTY: NotificationState = { enabled: false, lastReviewDay: null, exam: null };

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function readNotificationState(): NotificationState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<NotificationState>;
    return {
      enabled: p.enabled === true,
      lastReviewDay: typeof p.lastReviewDay === 'string' ? p.lastReviewDay : null,
      exam:
        p.exam && typeof p.exam.startedAt === 'number' && Array.isArray(p.exam.fired)
          ? { startedAt: p.exam.startedAt, fired: p.exam.fired.filter((n) => typeof n === 'number') }
          : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeNotificationState(patch: Partial<NotificationState>): NotificationState {
  const next = { ...readNotificationState(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the alert may repeat, never throws */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIF_PREF_EVENT));
  return next;
}

/** True only when supported, switched on and the browser permission is granted. */
export function canNotify(): boolean {
  return notificationsSupported() && Notification.permission === 'granted' && readNotificationState().enabled;
}

export type EnableResult = 'enabled' | 'denied' | 'unsupported';

/** Called only from the Settings toggle. Asks for permission if it has not been decided yet. */
export async function enableDesktopNotifications(): Promise<EnableResult> {
  if (!notificationsSupported()) return 'unsupported';
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = 'denied';
    }
  }
  if (permission !== 'granted') {
    writeNotificationState({ enabled: false });
    return 'denied';
  }
  writeNotificationState({ enabled: true });
  return 'enabled';
}

export function disableDesktopNotifications(): void {
  writeNotificationState({ enabled: false });
}
