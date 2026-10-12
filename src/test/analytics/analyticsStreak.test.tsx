import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AnalyticsView } from '../../components/analytics/AnalyticsView';
import { useCtfStore } from '../../store/useCtfStore';
import { useGoalsStore } from '../../store/useGoalsStore';

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

const session = (id: string, date: string) =>
  ({ id, machineId: 'm', machineName: 'M', date, durationSeconds: 60, type: 'session' }) as const;

const renderView = () =>
  render(
    <MemoryRouter initialEntries={['/analytics']}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsView />} />
        <Route path="/tracker" element={<div>tracker page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('AnalyticsView streak and goals', () => {
  beforeEach(() => {
    // Wed 7 Oct 2026, local noon; the week started Mon 5 Oct.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    useGoalsStore.setState({ weeklyRootTarget: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the empty state with no data and navigates to the tracker', () => {
    useCtfStore.setState({ machines: [], activitySessions: [] });
    renderView();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.queryByText('N/A')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /open tracker/i }));
    expect(screen.getByText('tracker page')).toBeInTheDocument();
  });

  it('shows streak numbers for a seeded fixture (grace window, longest 3)', () => {
    useCtfStore.setState({
      machines: [],
      activitySessions: [
        session('a', '2026-09-20'), session('b', '2026-09-21'), session('c', '2026-09-22'),
        session('d', '2026-10-05'), session('e', '2026-10-06'),
      ] as never,
    });
    renderView();
    expect(screen.queryByText('No activity yet')).toBeNull();
    const card = screen.getByText('Streak').closest('div')!.parentElement!;
    expect(card).toHaveTextContent('2 days');
    expect(card).toHaveTextContent('Longest 3 days');
    expect(card).not.toHaveTextContent('Active today');
  });

  it('marks the streak active today and tracks the weekly goal', () => {
    useCtfStore.setState({
      machines: [
        { id: 'm1', status: 'root', rootPwnedAt: new Date(2026, 9, 7, 9).toISOString(), userPwnedAt: new Date(2026, 9, 6, 9).toISOString() },
        { id: 'm2', status: 'root', rootPwnedAt: new Date(2026, 9, 1, 9).toISOString() },
      ] as never,
      activitySessions: [],
    });
    useGoalsStore.setState({ weeklyRootTarget: 5 });
    renderView();
    const card = screen.getByText('Streak').closest('div')!.parentElement!;
    expect(card).toHaveTextContent('2 days');
    expect(card).toHaveTextContent('Active today');
    expect(screen.getByTestId('weekly-goal-value')).toHaveTextContent('1 / 5');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('sets and clears the weekly target', () => {
    useCtfStore.setState({ machines: [], activitySessions: [session('a', '2026-10-07')] as never });
    renderView();
    fireEvent.change(screen.getByLabelText(/boxes to root per week/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /set goal/i }));
    expect(useGoalsStore.getState().weeklyRootTarget).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(useGoalsStore.getState().weeklyRootTarget).toBeNull();
  });
});
