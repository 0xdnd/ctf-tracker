import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ExamBurndownChart } from '../../components/exam/ExamBurndownChart';
import type { BurndownSeries } from '../../utils/examBurndown';

const START = Date.parse('2026-01-01T00:00:00.000Z');
const HOUR = 3600 * 1000;

const series: BurndownSeries = {
  startedAt: START,
  expiresAt: START + 24 * HOUR,
  passThreshold: 70,
  steps: [
    { t: START, points: 0, remainingToPass: 70 },
    { t: START + 2 * HOUR, points: 20, remainingToPass: 50 },
    { t: START + 6 * HOUR, points: 45, remainingToPass: 25 },
  ],
  ideal: [
    { t: START, points: 0 },
    { t: START + 24 * HOUR, points: 70 },
  ],
};

describe('ExamBurndownChart', () => {
  it('exposes an accessible img with title, desc and summary label', () => {
    render(<ExamBurndownChart series={series} nowMs={START + 15 * HOUR} currentPoints={45} remainingSeconds={9 * 3600} />);
    const img = screen.getByRole('img', { name: '45 of 70 points, 25 remaining, 9h left' });
    expect(img.querySelector('title')?.textContent).toMatch(/burn-down/i);
    expect(img.querySelector('desc')?.textContent).toContain('70-point pass threshold');
  });

  it('renders a visually-hidden data table with every step plus a now row', () => {
    render(<ExamBurndownChart series={series} nowMs={START + 15 * HOUR} currentPoints={45} remainingSeconds={9 * 3600} />);
    const table = screen.getByTestId('exam-burndown-table');
    expect(table.className).toContain('sr-only');
    const rows = within(table).getAllByRole('row');
    // header + 3 steps + now
    expect(rows).toHaveLength(5);
    expect(within(table).getByText(/^Now/)).toBeInTheDocument();
  });

  it('draws actual, ideal and threshold lines using token colors only', () => {
    const { container } = render(
      <ExamBurndownChart series={series} nowMs={START + 15 * HOUR} currentPoints={45} remainingSeconds={9 * 3600} />
    );
    const svg = screen.getByTestId('exam-burndown-svg');
    expect(svg.querySelector('path')).not.toBeNull();
    expect(svg.querySelectorAll('line[stroke-dasharray]').length).toBeGreaterThanOrEqual(2);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(container.innerHTML).toContain('var(--border-accent)');
  });

  it('keeps the step path identical across ticks while the now marker moves', () => {
    const { rerender } = render(
      <ExamBurndownChart series={series} nowMs={START + 15 * HOUR} currentPoints={45} remainingSeconds={9 * 3600} />
    );
    const pathBefore = screen.getByTestId('exam-burndown-svg').querySelector('path')!;
    const dBefore = pathBefore.getAttribute('d');
    const nowBefore = screen.getByTestId('exam-burndown-now').innerHTML;

    rerender(
      <ExamBurndownChart series={series} nowMs={START + 15 * HOUR + 1000} currentPoints={45} remainingSeconds={9 * 3600 - 1} />
    );
    const pathAfter = screen.getByTestId('exam-burndown-svg').querySelector('path')!;
    expect(pathAfter).toBe(pathBefore); // same DOM node: static layer not remounted
    expect(pathAfter.getAttribute('d')).toBe(dBefore);
    // 1s on a 24h window is sub-pixel at 480 wide; assert the layer still renders
    expect(screen.getByTestId('exam-burndown-now').innerHTML).toBeTruthy();
    expect(nowBefore).toBeTruthy();
  });

  it('moves the now marker when time advances materially', () => {
    const { rerender } = render(
      <ExamBurndownChart series={series} nowMs={START + 8 * HOUR} currentPoints={45} remainingSeconds={16 * 3600} />
    );
    const before = screen.getByTestId('exam-burndown-now').querySelector('circle')!.getAttribute('cx');
    rerender(
      <ExamBurndownChart series={series} nowMs={START + 16 * HOUR} currentPoints={45} remainingSeconds={8 * 3600} />
    );
    const after = screen.getByTestId('exam-burndown-now').querySelector('circle')!.getAttribute('cx');
    expect(Number(after)).toBeGreaterThan(Number(before));
  });
});
