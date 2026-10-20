import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AnalyticsView } from '../../components/analytics/AnalyticsView';
import { Sidebar } from '../../components/layout/Sidebar';
import { useCtfStore } from '../../store/useCtfStore';
import { countDueReviews } from '../../utils/spacedRepetition';

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

const box = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, name: `Box ${id}`, tags: ['smb'], status: 'root', difficulty: 'Easy', platform: 'HTB', ...extra }) as never;

const past = Date.now() - 60_000;
const future = Date.now() + 86_400_000;

describe('countDueReviews', () => {
  it('counts only machines whose review time has passed', () => {
    expect(countDueReviews([{ nextReviewAt: past }, { nextReviewAt: future }, {}], Date.now())).toBe(1);
  });
});

describe('Readiness on the Analytics page', () => {
  beforeEach(() => {
    useCtfStore.getState().resetFilters();
    useCtfStore.setState({
      machines: [box('a', { nextReviewAt: past }), box('b', { nextReviewAt: past }), box('c', { nextReviewAt: future })],
      activitySessions: [],
      soundEnabled: false,
    });
  });

  it('renders the readiness score and the review queue under id="review"', () => {
    render(<MemoryRouter><AnalyticsView /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Readiness' })).toBeInTheDocument();
    expect(screen.getByTestId('readiness-score')).toHaveTextContent('%');
    const review = document.getElementById('review');
    expect(review).not.toBeNull();
    expect(review).toHaveTextContent('2 machines are due for review');
  });

  it('"Show due in tracker" sets the review:due filter and opens the tracker', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <Routes>
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/tracker" element={<div>tracker page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show due in tracker' }));
    expect(useCtfStore.getState().filters.searchQuery).toContain('review:due');
    expect(screen.getByText('tracker page')).toBeInTheDocument();
  });

  it('disables the queue button when nothing is due', () => {
    useCtfStore.setState({ machines: [box('a'), box('c', { nextReviewAt: future })] });
    render(<MemoryRouter><AnalyticsView /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Show due in tracker' })).toBeDisabled();
  });

  it('scrolls to #review when opened with the sidebar scroll state', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <MemoryRouter initialEntries={[{ pathname: '/analytics', state: { scrollTo: 'review' } }]}>
        <AnalyticsView />
      </MemoryRouter>,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar review badge', () => {
  beforeEach(() => {
    useCtfStore.setState({ soundEnabled: false, machines: [] });
  });

  it('shows the number of reviews due on the Analytics item', () => {
    useCtfStore.setState({ machines: [box('a', { nextReviewAt: past }), box('b', { nextReviewAt: past }), box('c')] });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getByTestId('review-due-badge')).toHaveTextContent(/^2/);
  });

  it('is hidden when no review is due', () => {
    useCtfStore.setState({ machines: [box('a'), box('b', { nextReviewAt: future })] });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.queryByTestId('review-due-badge')).toBeNull();
  });

  it('opens Analytics with the review scroll target when reviews are due', () => {
    useCtfStore.setState({ machines: [box('a', { nextReviewAt: past })] });
    let seen: unknown = null;
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <Sidebar />
        <Routes>
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="*" element={<div />} />
        </Routes>
      </MemoryRouter>,
    );
    const scrollIntoView = vi.fn(function (this: Element) { seen = this.id; });
    Element.prototype.scrollIntoView = scrollIntoView;
    fireEvent.click(screen.getByRole('button', { name: /Skill Radar & Analytics/ }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(seen).toBe('review');
  });
});
