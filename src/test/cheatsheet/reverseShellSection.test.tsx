import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'Reverse shells' })).toBeInTheDocument();
    expect(screen.getByLabelText('Attacker Host LHOST')).toBeInTheDocument();
    expect(screen.getByLabelText('Attacker Port LPORT')).toBeInTheDocument();
    expect(screen.getByLabelText('Target IP Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter reverse shell payloads')).toBeInTheDocument();
  });

  it('shares LHOST with the store used by the Snippets page', () => {
    useCtfStore.getState().setGlobalVars({ lhost: '10.10.14.77' });
    renderApp('/reverse-shell');
    expect(screen.getByLabelText('Attacker Host LHOST')).toHaveValue('10.10.14.77');
  });

  it('old deep links into the removed category land on /reverse-shell', () => {
    renderApp('/cheatsheets?tab=revshell');
    expect(screen.getByRole('heading', { name: 'Reverse shells' })).toBeInTheDocument();
  });

  it('the Snippets page no longer has the generator category or card', () => {
    renderApp('/cheatsheets');
    expect(screen.queryByText('Reverse Shells Generator')).not.toBeInTheDocument();
    expect(screen.queryByText('Reverse shell generator')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Attacker Host LHOST')).toBeInTheDocument();
  });
});
