import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsView } from '../../components/analytics/AnalyticsView';
import { Sidebar } from '../../components/layout/Sidebar';
import { useCtfStore } from '../../store/useCtfStore';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
}

describe('Analytics icon', () => {
  it('uses the same icon in the sidebar item and the page header', () => {
    useCtfStore.setState({ soundEnabled: false, machines: [] });
    const { container: side } = render(<MemoryRouter><Sidebar /></MemoryRouter>);
    const item = screen.getByRole('button', { name: /Skill Radar & Analytics/ });
    expect(item.querySelector('svg.lucide-analytics-monitor')).not.toBeNull();
    side.remove();
    const { container: page } = render(<MemoryRouter><AnalyticsView /></MemoryRouter>);
    expect(page.querySelector('svg.lucide-analytics-monitor')).not.toBeNull();
  });
});
