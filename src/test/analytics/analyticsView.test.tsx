import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AnalyticsView } from '../../components/analytics/AnalyticsView';
import { useCtfStore } from '../../store/useCtfStore';
import { buildHeatmapWeeks, toLocalDateKey, WEEKDAY_SHORT } from '../../utils/analyticsHeatmap';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
}

// Timezone-independent weekday for a Y-M-D key (0 = Monday).
const weekdayOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};
const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

describe('buildHeatmapWeeks', () => {
  const zones = [undefined, 'Europe/Berlin', 'America/New_York'];
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  // today values straddling EU (2026-03-29) and US (2026-03-08, 2026-11-01) DST changes
  const todays = [
    new Date(2026, 2, 30, 12), new Date(2026, 2, 29, 0, 30), new Date(2026, 2, 8, 23, 30),
    new Date(2026, 10, 1, 12), new Date(2026, 10, 2, 0, 5), new Date(2026, 5, 15, 12),
  ];

  zones.forEach((tz) => {
    it(`produces consecutive days and correct weekday rows across DST (TZ=${tz ?? 'default'})`, () => {
      if (tz) process.env.TZ = tz;
      todays.forEach((today) => {
        const grid = buildHeatmapWeeks({}, today, 90);
        expect(grid.cells).toHaveLength(90);
        expect(grid.rows).toHaveLength(7);
        grid.cells.forEach((cell, i) => {
          if (i > 0) expect(dayNumber(cell.date) - dayNumber(grid.cells[i - 1].date)).toBe(1);
          expect(cell.row).toBe(weekdayOf(cell.date));
          expect(grid.rows[cell.row][cell.col]).toBe(cell);
        });
        expect(grid.cells[89].date).toBe(toLocalDateKey(today));
        // padding only before the first day / after today
        const real = grid.rows.flat().filter(Boolean).length;
        expect(real).toBe(90);
      });
    });
  });

  it('labels cells and maps counts to levels', () => {
    const today = new Date(2026, 8, 3, 10); // Thu 3 Sep 2026
    const grid = buildHeatmapWeeks({ '2026-09-03': 4, '2026-09-02': 1, '2026-09-01': 2 }, today, 90);
    const last = grid.cells[89];
    expect(last.label).toBe('Thu 3 Sep: 4 activities');
    expect(last.level).toBe(3);
    expect(grid.cells[88].label).toBe('Wed 2 Sep: 1 activity');
    expect(grid.cells[88].level).toBe(1);
    expect(grid.cells[87].level).toBe(2);
    expect(WEEKDAY_SHORT[last.row]).toBe('Thu');
  });
});

describe('AnalyticsView', () => {
  beforeEach(() => {
    // Wed 7 Oct 2026, local noon: last week column has Mon-Wed real, Thu-Sun padding
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    useCtfStore.setState({
      machines: [],
      activitySessions: [
        { id: 's1', machineId: 'm', machineName: 'M', date: '2026-10-06', durationSeconds: 60, type: 'root' },
        { id: 's2', machineId: 'm', machineName: 'M', date: '2026-10-06', durationSeconds: 60, type: 'root' },
      ] as never,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the radar as an image with an accessible name', () => {
    render(<AnalyticsView />);
    const radar = screen.getByRole('img', { name: /offensive skill radar/i });
    expect(radar).toBeInTheDocument();
    expect(radar.querySelector('title')).not.toBeNull();
    expect(radar.querySelector('desc')?.textContent).toMatch(/Web Exploitation \d+%/);
    expect(radar.hasAttribute('aria-label')).toBe(false);
    expect(radar.getAttribute('aria-labelledby')).toContain(radar.querySelector('title')!.id);
    expect(radar.querySelector('desc')?.textContent).toMatch(/Binary \/ BOF \d+%/);
    expect(radar).toHaveAccessibleName(/Binary \/ BOF \d+%/);
  });

  describe('pwn timestamps use the local calendar day', () => {
    const originalTz = process.env.TZ;
    afterEach(() => {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    });

    it.each([
      ['America/New_York', '2026-06-10'],
      ['Asia/Tokyo', '2026-06-11'],
    ])('maps 2026-06-10T23:30:00Z to the local key in %s', (tz, key) => {
      process.env.TZ = tz;
      expect(toLocalDateKey(new Date('2026-06-10T23:30:00Z'))).toBe(key);
    });

    it.each([
      ['America/New_York', 'Tue 6 Oct: 1 activity'],
      ['Asia/Tokyo', 'Wed 7 Oct: 1 activity'],
    ])('heatmap places a 2026-10-06T23:30:00Z root pwn on the local day in %s', (tz, label) => {
      process.env.TZ = tz;
      useCtfStore.setState({
        machines: [{ id: 'm1', rootPwnedAt: '2026-10-06T23:30:00Z' }] as never,
        activitySessions: [],
      });
      render(<AnalyticsView />);
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  it('renders the heatmap as a grid with roving tabindex and skips placeholders', () => {
    render(<AnalyticsView />);
    const grid = screen.getByRole('grid');
    expect(within(grid).getAllByRole('row')).toHaveLength(7);

    const cells = within(grid).getAllByRole('gridcell');
    expect(cells).toHaveLength(90);
    expect(grid.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    expect(grid.querySelectorAll('[role="gridcell"][tabindex="-1"]')).toHaveLength(89);
    expect(grid.querySelectorAll('[data-placeholder="true"][aria-hidden="true"]').length).toBeGreaterThan(0);

    // initial roving stop is today (Wed 7 Oct)
    const today = grid.querySelector<HTMLElement>('[tabindex="0"]')!;
    expect(today.getAttribute('aria-label')).toBe('Wed 7 Oct: 0 activities');
    expect(screen.getByLabelText('Tue 6 Oct: 2 activities')).toBeInTheDocument();

    // ArrowUp from Wed: Tue (real)
    today.focus();
    fireEvent.keyDown(today, { key: 'ArrowUp' });
    const tue = document.activeElement as HTMLElement;
    expect(tue.getAttribute('aria-label')).toBe('Tue 6 Oct: 2 activities');
    expect(tue.tabIndex).toBe(0);
    expect(today.tabIndex).toBe(-1);

    // ArrowRight from Tue in last column: next column is all padding -> stays
    fireEvent.keyDown(tue, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tue);

    // ArrowLeft goes to previous week, same weekday
    fireEvent.keyDown(tue, { key: 'ArrowLeft' });
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Tue 29 Sep: 0 activities');

    // ArrowDown from Wed (row below is padding: Thu 8 Oct is the future) -> stays
    const wed = screen.getByLabelText('Wed 7 Oct: 0 activities');
    wed.focus();
    fireEvent.keyDown(wed, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(wed);

    // ArrowDown from Tue 29 Sep moves to Wed 30 Sep
    const tue29 = screen.getByLabelText('Tue 29 Sep: 0 activities');
    tue29.focus();
    fireEvent.keyDown(tue29, { key: 'ArrowDown' });
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Wed 30 Sep: 0 activities');
    expect(grid.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
  });
});
