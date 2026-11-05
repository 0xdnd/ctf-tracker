/**
 * "I passed" share card: pure data, summary text and canvas drawing.
 *
 * Everything here runs locally. The card and the summary carry the product name and site as plain
 * text; nothing is fetched or uploaded.
 */
import { buildActivityCounts, computeStreaks, type PwnStamps, type SessionDate } from './streakEngine';

export const PASS_EXAMS = ['OSCP', 'CPTS', 'CRTO', 'OSWE'] as const;
export type PassExam = (typeof PASS_EXAMS)[number];

export const PASS_EXAM_NAMES: Record<PassExam, string> = {
  OSCP: 'OffSec Certified Professional',
  CPTS: 'Certified Penetration Testing Specialist',
  CRTO: 'Certified Red Team Operator',
  OSWE: 'OffSec Web Expert',
};

export type PassStatKey = 'machines' | 'streak' | 'hours';
export const PASS_STAT_KEYS: readonly PassStatKey[] = ['machines', 'streak', 'hours'];
export const PASS_STAT_LABELS: Record<PassStatKey, string> = {
  machines: 'Machines completed',
  streak: 'Longest streak',
  hours: 'Hours tracked',
};

export type PassStatToggles = Record<PassStatKey, boolean>;
export const DEFAULT_PASS_STAT_TOGGLES: PassStatToggles = { machines: true, streak: true, hours: false };

export const PASS_CARD_BRAND = 'ZeroBox';
export const PASS_CARD_SITE = 'ctftracker.com';
export const PASS_CARD_WIDTH = 1200;
export const PASS_CARD_HEIGHT = 630;

export interface PassStatsMachine extends PwnStamps {
  status?: string;
  timeSpentSeconds?: number;
}

export interface PassLocalStats {
  machinesCompleted: number;
  longestStreak: number;
  hoursTracked: number;
}

export interface PassCardOptions {
  exam: PassExam;
  /** YYYY-MM-DD from a date input, or empty. */
  passDate: string;
  stats: PassStatToggles;
}

export interface PassCardStat {
  key: PassStatKey;
  label: string;
  value: string;
}

export interface PassCardData {
  exam: PassExam;
  examName: string;
  headline: string;
  dateLabel: string | null;
  stats: PassCardStat[];
  brand: string;
  site: string;
}

/** Map any exam simulator track to a card exam, falling back to OSCP. */
export function defaultPassExam(track: unknown): PassExam {
  return typeof track === 'string' && (PASS_EXAMS as readonly string[]).includes(track) ? (track as PassExam) : 'OSCP';
}

/** Same derivations as the analytics page: completed = root or completed, streak from sessions + pwn stamps, time summed. */
export function computePassLocalStats(
  machines: readonly PassStatsMachine[],
  sessions: readonly SessionDate[],
  today: Date = new Date(),
): PassLocalStats {
  const machinesCompleted = machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
  const streak = computeStreaks(buildActivityCounts(sessions, machines), today);
  const seconds = machines.reduce((acc, m) => acc + (m.timeSpentSeconds || 0), 0);
  return { machinesCompleted, longestStreak: streak.longest, hoursTracked: Math.floor(seconds / 3600) };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Formats a YYYY-MM-DD string without going through UTC, so the day never shifts. Null when empty or invalid. */
export function formatPassDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export function formatPassStatValues(local: PassLocalStats): Record<PassStatKey, string> {
  return {
    machines: plural(local.machinesCompleted, 'machine', 'machines'),
    streak: plural(local.longestStreak, 'day', 'days'),
    hours: plural(local.hoursTracked, 'hour', 'hours'),
  };
}

export function buildPassCardData(options: PassCardOptions, local: PassLocalStats): PassCardData {
  const exam = defaultPassExam(options.exam);
  const values = formatPassStatValues(local);
  const stats = PASS_STAT_KEYS.filter((k) => options.stats[k]).map((key) => ({
    key,
    label: PASS_STAT_LABELS[key],
    value: values[key],
  }));
  return {
    exam,
    examName: PASS_EXAM_NAMES[exam],
    headline: `I passed ${exam}`,
    dateLabel: formatPassDate(options.passDate),
    stats,
    brand: PASS_CARD_BRAND,
    site: PASS_CARD_SITE,
  };
}

/** Short plain-text summary for the "Copy text" button. */
export function buildPassSummaryText(data: PassCardData): string {
  const lines = [`${data.headline} (${data.examName})${data.dateLabel ? ` on ${data.dateLabel}` : ''}.`];
  if (data.stats.length > 0) {
    lines.push(`Prep: ${data.stats.map((s) => `${s.label.toLowerCase()}: ${s.value}`).join(', ')}.`);
  }
  lines.push(`Tracked with ${data.brand} (${data.site}).`);
  return lines.join('\n');
}

/** Accessible description of the card image. */
export function describePassCard(data: PassCardData): string {
  const parts = [`${data.headline}, ${data.examName}`];
  if (data.dateLabel) parts.push(`passed ${data.dateLabel}`);
  for (const s of data.stats) parts.push(`${s.label} ${s.value}`);
  parts.push(`${data.brand}, ${data.site}`);
  return parts.join('. ');
}

export interface PassCardPalette {
  bg: string;
  panel: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
}

const SANS = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';

/** Shrinks a font size until the text fits the width. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, min: number, family: string, maxWidth: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

/** Draws the 1200x630 card. Smallest text is 22px so it stays readable when scaled down in a feed. */
export function drawPassCard(ctx: CanvasRenderingContext2D, data: PassCardData, C: PassCardPalette): void {
  const W = PASS_CARD_WIDTH;
  const H = PASS_CARD_HEIGHT;
  const PAD = 72;

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Accent rail and hairline frame
  ctx.fillStyle = C.accent;
  ctx.fillRect(0, 0, 14, H);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // Exam code pill
  ctx.font = `700 26px ${MONO}`;
  const pillText = data.exam;
  const pillW = ctx.measureText(pillText).width + 44;
  ctx.fillStyle = C.panel;
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PAD, 72, pillW, 48, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.accent;
  ctx.fillText(pillText, PAD + 22, 106);

  if (data.dateLabel) {
    ctx.fillStyle = C.muted;
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText(`Passed ${data.dateLabel}`, PAD + pillW + 24, 106);
  }

  // Headline and full exam name
  ctx.fillStyle = C.text;
  fitFont(ctx, data.headline, 700, 104, 64, SANS, W - PAD * 2);
  ctx.fillText(data.headline, PAD, 245);

  ctx.fillStyle = C.muted;
  fitFont(ctx, data.examName, 500, 34, 24, SANS, W - PAD * 2);
  ctx.fillText(data.examName, PAD, 300);

  // Stat tiles
  const n = data.stats.length;
  if (n > 0) {
    const gap = 24;
    const top = 340;
    const tileH = 142;
    const tileW = (W - PAD * 2 - gap * (n - 1)) / n;
    data.stats.forEach((s, i) => {
      const x = PAD + i * (tileW + gap);
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, top, tileW, tileH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.text;
      fitFont(ctx, s.value, 700, 52, 30, MONO, tileW - 48);
      ctx.fillText(s.value, x + 24, top + 72);

      ctx.fillStyle = C.muted;
      fitFont(ctx, s.label, 500, 24, 22, SANS, tileW - 48);
      ctx.fillText(s.label, x + 24, top + 116);
    });
  }

  // Footer: product name and site, static text only
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 520);
  ctx.lineTo(W - PAD, 520);
  ctx.stroke();

  ctx.fillStyle = C.text;
  ctx.font = `700 32px ${SANS}`;
  ctx.fillText(data.brand, PAD, 570);

  ctx.fillStyle = C.muted;
  ctx.font = `500 26px ${MONO}`;
  const siteW = ctx.measureText(data.site).width;
  ctx.fillText(data.site, W - PAD - siteW, 568);
}
