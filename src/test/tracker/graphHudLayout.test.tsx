import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphView } from '../../components/tracker/GraphView';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine } from '../../types';

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

// Plain HTB boxes: every one belongs to a single subnet group, so any extra hub is filler.
const plain = (i: number): Machine => ({
  id: `m${i}`,
  name: `Host${i}`,
  ip: `10.10.10.${i % 250}`,
  os: i % 2 === 0 ? 'Linux' : 'Windows',
  platform: 'HTB',
  difficulty: i % 3 === 0 ? 'Easy' : i % 3 === 1 ? 'Medium' : 'Hard',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const renderGraph = () =>
  render(<MemoryRouter><GraphView filteredMachines={useCtfStore.getState().machines} /></MemoryRouter>);

describe('graph HUD: legend, toolbar and subnet count', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ machines: Array.from({ length: 120 }, (_, i) => plain(i)), themePreset: 'zerobox' });
  });
  afterEach(() => cleanup());

  it('names the third legend entry in plain words', () => {
    renderGraph();
    expect(screen.getByText('Backlog or recon')).toBeInTheDocument();
    expect(screen.queryByText('Scoped')).toBeNull();
  });

  it('puts the toolbar and the stats/legend in one wrapping row so they cannot overlap', () => {
    renderGraph();
    const toolbar = screen.getByTestId('canvas-nav-toolbar');
    const row = toolbar.parentElement as HTMLElement;
    expect(row.className).toMatch(/\bflex-wrap\b/);
    expect(toolbar.className).not.toMatch(/\babsolute\b/);
    expect(row.firstElementChild).not.toBe(toolbar);
    expect(row.firstElementChild?.className).not.toMatch(/\babsolute\b/);
  });

  it('counts only real subnets in the compact layout and labels the grid separately', () => {
    renderGraph();
    // Without the fix the 48 sampled boxes were spread over all six templates (6 subnets).
    expect(screen.getByText(/^\d+ subnets?$/)).toHaveTextContent('1 subnet');
    expect(screen.getByTestId('graph-grid-overflow')).toHaveTextContent('72 in grid');

    fireEvent.click(screen.getByRole('button', { name: 'Group all by subnet' }));
    expect(screen.queryByTestId('graph-grid-overflow')).toBeNull();
    expect(screen.getByText(/^\d+ subnets?$/)).toHaveTextContent('1 subnet');
  });
});
