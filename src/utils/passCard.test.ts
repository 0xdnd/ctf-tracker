import { describe, expect, it, vi } from 'vitest';
import {
  PASS_CARD_SITE,
  buildPassCardData,
  buildPassSummaryText,
  computePassLocalStats,
  defaultPassExam,
  describePassCard,
  drawPassCard,
  formatPassDate,
  type PassLocalStats,
} from './passCard';
import { buildActivityCounts, computeStreaks } from './streakEngine';

const local: PassLocalStats = { machinesCompleted: 42, longestStreak: 9, hoursTracked: 1 };
const allOn = { machines: true, streak: true, hours: true };
const allOff = { machines: false, streak: false, hours: false };

describe('defaultPassExam', () => {
  it('keeps supported tracks and falls back to OSCP', () => {
    expect(defaultPassExam('CPTS')).toBe('CPTS');
    expect(defaultPassExam('OSWE')).toBe('OSWE');
    expect(defaultPassExam('OSEP')).toBe('OSCP');
    expect(defaultPassExam(undefined)).toBe('OSCP');
  });
});

describe('formatPassDate', () => {
  it('formats the day as entered, with no time zone shift', () => {
    expect(formatPassDate('2026-11-05')).toBe('November 5, 2026');
    expect(formatPassDate('2026-01-01')).toBe('January 1, 2026');
  });

  it('returns null for empty or impossible dates', () => {
    expect(formatPassDate('')).toBeNull();
    expect(formatPassDate('2026-02-30')).toBeNull();
    expect(formatPassDate('11/05/2026')).toBeNull();
  });
});

describe('computePassLocalStats', () => {
  it('matches the analytics derivations', () => {
    const today = new Date(2026, 10, 5, 12);
    const machines = [
      { status: 'root', timeSpentSeconds: 3600, rootPwnedAt: new Date(2026, 10, 3, 10).toISOString() },
      { status: 'completed', timeSpentSeconds: 1800, rootPwnedAt: new Date(2026, 10, 4, 10).toISOString() },
      { status: 'foothold', timeSpentSeconds: 1900 },
      { status: 'recon' },
    ];
    const sessions = [{ date: '2026-11-05' }, { date: '2026-10-01' }];
    const stats = computePassLocalStats(machines, sessions, today);
    expect(stats.machinesCompleted).toBe(2);
    expect(stats.hoursTracked).toBe(2); // 7300 s, rounded down
    expect(stats.longestStreak).toBe(computeStreaks(buildActivityCounts(sessions, machines), today).longest);
    expect(stats.longestStreak).toBe(3);
  });
});

describe('buildPassCardData', () => {
  it('builds the headline, exam name, date and only the chosen stats', () => {
    const data = buildPassCardData({ exam: 'CPTS', passDate: '2026-11-05', stats: { machines: true, streak: false, hours: true } }, local);
    expect(data.headline).toBe('I passed CPTS');
    expect(data.examName).toBe('Certified Penetration Testing Specialist');
    expect(data.dateLabel).toBe('November 5, 2026');
    expect(data.stats.map((s) => s.key)).toEqual(['machines', 'hours']);
    expect(data.stats[0].value).toBe('42 machines');
    expect(data.stats[1].value).toBe('1 hour');
    expect(data.brand).toBe('ZeroBox');
    expect(data.site).toBe(PASS_CARD_SITE);
  });
});

describe('buildPassSummaryText', () => {
  it('writes a short plain-text summary with the chosen stats', () => {
    const data = buildPassCardData({ exam: 'OSCP', passDate: '2026-11-05', stats: allOn }, local);
    expect(buildPassSummaryText(data)).toBe(
      [
        'I passed OSCP (OffSec Certified Professional) on November 5, 2026.',
        'Prep: machines completed: 42 machines, longest streak: 9 days, hours tracked: 1 hour.',
        'Tracked with ZeroBox (ctftracker.com).',
      ].join('\n'),
    );
  });

  it('drops the date and stats lines when they are off', () => {
    const data = buildPassCardData({ exam: 'CRTO', passDate: '', stats: allOff }, local);
    expect(buildPassSummaryText(data)).toBe(
      'I passed CRTO (Certified Red Team Operator).\nTracked with ZeroBox (ctftracker.com).',
    );
  });

  it('has no links other than the plain site name', () => {
    const text = buildPassSummaryText(buildPassCardData({ exam: 'OSWE', passDate: '', stats: allOn }, local));
    expect(text).not.toMatch(/https?:\/\//);
  });
});

describe('describePassCard', () => {
  it('describes everything on the image', () => {
    const data = buildPassCardData({ exam: 'OSCP', passDate: '2026-11-05', stats: { machines: true, streak: false, hours: false } }, local);
    expect(describePassCard(data)).toBe(
      'I passed OSCP, OffSec Certified Professional. passed November 5, 2026. Machines completed 42 machines. ZeroBox, ctftracker.com',
    );
  });
});

describe('drawPassCard', () => {
  it('draws the text it was given and keeps every font at 22px or more', () => {
    const texts: string[] = [];
    const fonts: string[] = [];
    let font = '';
    const ctx = {
      set font(v: string) { font = v; fonts.push(v); },
      get font() { return font; },
      fillStyle: '', strokeStyle: '', lineWidth: 1, textBaseline: '',
      fillRect: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(),
      measureText: (t: string) => ({ width: t.length * 10 }),
      fillText: (t: string) => { texts.push(t); },
    } as unknown as CanvasRenderingContext2D;
    const palette = { bg: '#000', panel: '#111', line: '#222', text: '#fff', muted: '#aaa', accent: '#0af' };
    drawPassCard(ctx, buildPassCardData({ exam: 'OSCP', passDate: '2026-11-05', stats: allOn }, local), palette);
    expect(texts).toEqual(expect.arrayContaining([
      'OSCP', 'Passed November 5, 2026', 'I passed OSCP', 'OffSec Certified Professional',
      '42 machines', 'Machines completed', '9 days', 'Longest streak', '1 hour', 'Hours tracked', 'ZeroBox', 'ctftracker.com',
    ]));
    const sizes = fonts.map((f) => Number(/(\d+)px/.exec(f)?.[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(22);
  });
});
