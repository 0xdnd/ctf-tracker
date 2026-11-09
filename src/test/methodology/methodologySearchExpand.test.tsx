import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { MethodologyPage } from '../../pages/MethodologyPage';
import { useCtfStore } from '../../store/useCtfStore';
import { MASTER_METHODOLOGY_FRAMEWORK } from '../../data/methodologyFramework';

beforeAll(() => {
  Object.assign(globalThis, {
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    },
  });
  Element.prototype.scrollIntoView = () => {};
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MethodologyPage />
    </MemoryRouter>
  );

// Phases 1 and 2 start expanded; pick a task that only lives in a later (collapsed) phase.
const openTitles = new Set(
  MASTER_METHODOLOGY_FRAMEWORK.slice(0, 2).flatMap((p) => p.subcategories.flatMap((s) => s.items.map((i) => i.title)))
);
const laterItem = MASTER_METHODOLOGY_FRAMEWORK.slice(3)
  .flatMap((p) => p.subcategories.flatMap((s) => s.items))
  .find((i) => !openTitles.has(i.title))!;

describe('MethodologyPage search and target summary', () => {
  beforeEach(() => {
    useCtfStore.setState({
      activeTargetId: null,
      globalVars: { lhost: '10.10.14.1', lport: '4444', targetIp: '10.10.10.5', interface: 'tun0', customVars: {} },
    } as never);
  });

  it('a search match inside a collapsed phase is visible without opening the phase', () => {
    renderPage();
    expect(screen.queryByText(laterItem.title)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Search methodology commands/i), { target: { value: laterItem.title } });
    expect(screen.getAllByText(laterItem.title).length).toBeGreaterThan(0);
  });

  it('no longer renders the duplicate raw TARGET/LHOST/LPORT summary', () => {
    renderPage();
    expect(screen.queryByText('TARGET', { selector: 'dt' })).not.toBeInTheDocument();
    expect(document.querySelector('dl')).toBeNull();
  });
});
