import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { ReverseShellsPage } from '../../pages/ReverseShellsPage';
import { useCtfStore } from '../../store/useCtfStore';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
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
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

const renderApp = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/cheatsheets" element={<CheatsheetView />} />
        <Route path="/reverse-shell" element={<ReverseShellsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Reverse shells section', () => {
  afterEach(() => cleanup());

  it('renders the page with details fields and the generator', () => {
    renderApp('/reverse-shell');
    expect(screen.getByRole('heading', { name: 'Reverse Shells' })).toBeInTheDocument();
    // Filled details collapse to a one-line summary until Edit is pressed.
    expect(screen.queryByLabelText('Attacker Host LHOST')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Attacker Host LHOST')).toBeInTheDocument();
    expect(screen.getByLabelText('Attacker Port LPORT')).toBeInTheDocument();
    expect(screen.getByLabelText('Target IP Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter reverse shell payloads')).toBeInTheDocument();
  });

  it('shares LHOST with the store used by the Snippets page', () => {
    useCtfStore.getState().setGlobalVars({ lhost: '10.10.14.77' });
    renderApp('/reverse-shell');
    expect(screen.getByText('10.10.14.77')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Attacker Host LHOST')).toHaveValue('10.10.14.77');
  });

  it('old deep links into the removed category land on /reverse-shell', () => {
    renderApp('/cheatsheets?tab=revshell');
    expect(screen.getByRole('heading', { name: 'Reverse Shells' })).toBeInTheDocument();
  });

  it('the Snippets page no longer has the generator category or card', () => {
    renderApp('/cheatsheets');
    expect(screen.queryByText('Reverse Shells Generator')).not.toBeInTheDocument();
    expect(screen.queryByText('Reverse shell generator')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Attacker Host LHOST')).toBeInTheDocument();
  });

  it('pages the payload chips 20 at a time, grouped by language, and resets on filter change', () => {
    renderApp('/reverse-shell');
    const list = document.querySelector('[data-tour="rs-payloads"]') as HTMLElement;
    const chipCount = () => list.querySelectorAll('button[aria-pressed]').length;
    expect(chipCount()).toBe(20);
    expect(list.querySelectorAll('[role="group"]').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Show more/ }));
    expect(chipCount()).toBe(40);
    fireEvent.change(screen.getByLabelText('Filter reverse shell payloads'), { target: { value: 'bash' } });
    expect(chipCount()).toBeLessThanOrEqual(20);
  });
});

describe('Snippets list paging', () => {
  afterEach(() => cleanup());

  it('shows 30 snippets then more on request, and labels the second tab Notes', () => {
    renderApp('/cheatsheets');
    expect(screen.getByRole('button', { name: /^Notes/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Field manual/ })).not.toBeInTheDocument();
    const total = useCtfStore.getState().cheatsheets.length;
    expect(total).toBeGreaterThan(30);
    const more = screen.getByRole('button', { name: /Show more/ });
    expect(more).toHaveTextContent(`${total - 30} left`);
    fireEvent.click(more);
    const next = screen.queryByRole('button', { name: /Show more/ });
    if (total > 60) expect(next).toHaveTextContent(`${total - 60} left`);
    else expect(next).toBeNull();
  });
});
