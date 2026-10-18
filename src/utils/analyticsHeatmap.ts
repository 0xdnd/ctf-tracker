/**
 * Pure helpers for the analytics activity heatmap.
 *
 * The grid is weekday rows (Monday first) by week columns. Day keys are built from
 * LOCAL calendar dates by stepping `setDate(getDate() - 1)`, never by subtracting
 * 86 400 000 ms, so a 23h / 25h daylight-saving day cannot skip or repeat a date.
 */

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type HeatLevel = 0 | 1 | 2 | 3;

export interface HeatmapCell {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  count: number;
  level: HeatLevel;
  /** Row index, 0 = Monday ... 6 = Sunday. */
  row: number;
  /** Column index (week), 0 = oldest. */
  col: number;
  /** Accessible label, e.g. "Mon 3 Sep: 4 activities". */
  label: string;
}

export interface HeatmapGrid {
  /** rows[weekday][week]; null marks a padding slot outside the requested range. */
  rows: (HeatmapCell | null)[][];
  weekCount: number;
  /** Real cells, oldest first. */
  cells: HeatmapCell[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

export function describeDay(date: Date, count: number): string {
  const weekday = WEEKDAY_SHORT[(date.getDay() + 6) % 7];
  return `${weekday} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}: ${count} ${count === 1 ? 'activity' : 'activities'}`;
}

export function buildHeatmapWeeks(
  counts: Record<string, number>,
  today: Date = new Date(),
  days = 90,
): HeatmapGrid {
  // Local-midnight copy of "today"; walk backwards one calendar day at a time.
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const stamped: { date: Date; key: string }[] = [];
  for (let i = 0; i < days; i++) {
    stamped.push({ date: new Date(cursor), key: toLocalDateKey(cursor) });
    cursor.setDate(cursor.getDate() - 1);
  }
  stamped.reverse();

  const offset = (stamped[0].date.getDay() + 6) % 7; // padding slots before the first day
  const weekCount = Math.ceil((offset + stamped.length) / 7);
  const rows: (HeatmapCell | null)[][] = Array.from({ length: 7 }, () => Array<HeatmapCell | null>(weekCount).fill(null));
  const cells: HeatmapCell[] = [];

  stamped.forEach(({ date, key }, i) => {
    const count = counts[key] || 0;
    const cell: HeatmapCell = {
      date: key,
      count,
      level: heatLevel(count),
      row: (offset + i) % 7,
      col: Math.floor((offset + i) / 7),
      label: describeDay(date, count),
    };
    rows[cell.row][cell.col] = cell;
    cells.push(cell);
  });

  return { rows, weekCount, cells };
}
