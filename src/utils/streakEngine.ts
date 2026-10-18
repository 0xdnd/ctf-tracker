/**
 * Pure streak helpers. Day keys are the same LOCAL YYYY-MM-DD keys the analytics heatmap
 * uses, and the "active day" sources are the same too (activity sessions plus machine
 * user/root pwn stamps), so the streak always agrees with the heatmap.
 *
 * Legacy `ActivitySession.date` values may be UTC date-only strings; like the heatmap we use
 * them as-is and never rewrite stored data.
 */
import { toLocalDateKey } from './analyticsHeatmap';

export interface StreakResult {
  current: number;
  longest: number;
  lastActiveDay: string | null;
  activeToday: boolean;
}

export interface PwnStamps {
  rootPwnedAt?: string | null;
  userPwnedAt?: string | null;
}

export interface SessionDate {
  date: string;
}

export interface WeeklyProgress {
  rootedThisWeek: number;
  flagsThisWeek: number;
}

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Local-midnight Date for a YYYY-MM-DD key, or null when malformed. */
function parseKey(key: string): Date | null {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Previous/next calendar day key, stepping by setDate so DST days cannot skip or repeat. */
function shiftKey(key: string, delta: number): string {
  const d = parseKey(key) as Date;
  d.setDate(d.getDate() + delta);
  return toLocalDateKey(d);
}

/** Per-day activity counts: sessions plus machine user/root pwn dates (same as the heatmap). */
export function buildActivityCounts(
  sessions: readonly SessionDate[],
  machines: readonly PwnStamps[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    if (!s || !s.date) continue;
    let key = s.date;
    // If the stored session date has a time/ISO component (T/Z/:), compute the operator's
    // local calendar day at read time without mutating the stored UTC record.
    // Plain YYYY-MM-DD date strings remain untouched to avoid UTC-midnight rollback.
    if (s.date.includes('T') || s.date.includes('Z') || s.date.includes(':')) {
      const parsed = new Date(s.date);
      if (!Number.isNaN(parsed.getTime())) {
        key = toLocalDateKey(parsed);
      }
    }
    counts[key] = (counts[key] || 0) + 1;
  }
  for (const m of machines) {
    for (const stamp of [m.rootPwnedAt, m.userPwnedAt]) {
      if (!stamp) continue;
      const parsed = new Date(stamp);
      if (Number.isNaN(parsed.getTime())) continue;
      const k = toLocalDateKey(parsed);
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  return counts;
}

export function computeStreaks(
  days: Record<string, number> | Iterable<string>,
  today: Date = new Date(),
): StreakResult {
  const todayKey = toLocalDateKey(today);
  const entries: [string, number][] =
    Symbol.iterator in Object(days)
      ? Array.from(days as Iterable<string>, (k): [string, number] => [k, 1])
      : Object.entries(days as Record<string, number>);

  // Only valid, non-future days with activity; normalise to the YYYY-MM-DD prefix.
  const active = new Set<string>();
  for (const [k, n] of entries) {
    if (!(n > 0)) continue;
    const m = KEY_RE.exec(k);
    if (!m) continue;
    const key = `${m[1]}-${m[2]}-${m[3]}`;
    if (key <= todayKey) active.add(key);
  }

  if (active.size === 0) {
    return { current: 0, longest: 0, lastActiveDay: null, activeToday: false };
  }

  const sorted = Array.from(active).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    run = prev !== null && shiftKey(prev, 1) === key ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = key;
  }

  const activeToday = active.has(todayKey);
  // Grace window: a streak ending yesterday is still alive until local midnight passes today.
  let cursor: string | null = activeToday ? todayKey : active.has(shiftKey(todayKey, -1)) ? shiftKey(todayKey, -1) : null;
  let current = 0;
  while (cursor && active.has(cursor)) {
    current++;
    cursor = shiftKey(cursor, -1);
  }

  return { current, longest, lastActiveDay: sorted[sorted.length - 1], activeToday };
}

/** Local midnight of the first day of the week containing `date` (Monday by default). */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

/** Roots and flags captured from `weekStart` (inclusive) through the following 6 days. */
export function weeklyProgress(machines: readonly PwnStamps[], weekStart: Date): WeeklyProgress {
  const startKey = toLocalDateKey(weekStart);
  const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
  end.setDate(end.getDate() + 6);
  const endKey = toLocalDateKey(end);

  const inWeek = (stamp?: string | null) => {
    if (!stamp) return false;
    const parsed = new Date(stamp);
    if (Number.isNaN(parsed.getTime())) return false;
    const k = toLocalDateKey(parsed);
    return k >= startKey && k <= endKey;
  };

  let rootedThisWeek = 0;
  let flagsThisWeek = 0;
  for (const m of machines) {
    if (inWeek(m.rootPwnedAt)) {
      rootedThisWeek++;
      flagsThisWeek++;
    }
    if (inWeek(m.userPwnedAt)) flagsThisWeek++;
  }
  return { rootedThisWeek, flagsThisWeek };
}
