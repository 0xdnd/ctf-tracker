import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphView } from '../../components/tracker/GraphView';
import {
  SCOPED_CLUSTER_CAP,
  decideScopedVisibility,
  splitScopedOverflow,
  formatShowMoreLabel,
} from '../../components/tracker/graphScopedVisibility';
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

describe('decideScopedVisibility', () => {
  it.each([
    [20, { clusteredCount: 20, hiddenCount: 0, showMoreControl: false }],
    [48, { clusteredCount: 48, hiddenCount: 0, showMoreControl: false }],
    [200, { clusteredCount: 48, hiddenCount: 152, showMoreControl: true }],
    [1300, { clusteredCount: 48, hiddenCount: 1252, showMoreControl: true }],
  ])('%i machines', (total, expected) => {
    expect(decideScopedVisibility(total)).toMatchObject(expected);
  });

  it('keeps user-placed overflow machines out of the hidden count', () => {
    const v = decideScopedVisibility(200, 10);
    expect(v.pinnedOverflowCount).toBe(10);
    expect(v.hiddenCount).toBe(142);
    expect(decideScopedVisibility(60, 12).showMoreControl).toBe(false);
  });

  it('splits overflow by saved position without dropping anything', () => {
    const overflow = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const { shown, hidden } = splitScopedOverflow(overflow, { b: { x: 1, y: 2 } });
    expect(shown.map((n) => n.id)).toEqual(['b']);
    expect(hidden.map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('formats the control label', () => {
    expect(formatShowMoreLabel(1252)).toBe('+1,252 more · Show all');
  });
});

const plain = (i: number): Machine => ({
  id: `m${i}`,
  name: `Host${i}`,
  ip: `10.10.10.${i % 250}`,
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const renderFiltered = (pred: (m: Machine) => boolean) =>
  render(<MemoryRouter><GraphView filteredMachines={useCtfStore.getState().machines.filter(pred)} /></MemoryRouter>);

const renderGraph = () =>
  render(<MemoryRouter><GraphView filteredMachines={useCtfStore.getState().machines} /></MemoryRouter>);

describe('GraphView scoped overflow', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ themePreset: 'zerobox' });
  });
  afterEach(() => cleanup());

  it('draws only the clustered machines past the cap and offers Show all', () => {
    useCtfStore.setState({ machines: Array.from({ length: 200 }, (_, i) => plain(i)) });
    renderGraph();
    expect(screen.queryByTestId(`attack-node-m${SCOPED_CLUSTER_CAP - 1}`)).not.toBeNull();
    expect(screen.queryByTestId(`attack-node-m${SCOPED_CLUSTER_CAP}`)).toBeNull();
    expect(screen.queryByTestId('attack-node-m199')).toBeNull();
    const control = screen.getByTestId('graph-grid-overflow');
    expect(control).toHaveTextContent('+152 more · Show all');

    fireEvent.click(control);
    expect(screen.queryByTestId('graph-grid-overflow')).toBeNull();
    expect(screen.getByText('200 of 200 machines')).toBeInTheDocument();
  });

  it('shows no control at or below the cap', () => {
    useCtfStore.setState({ machines: Array.from({ length: SCOPED_CLUSTER_CAP }, (_, i) => plain(i)) });
    renderGraph();
    expect(screen.queryByTestId('graph-grid-overflow')).toBeNull();
    expect(screen.getByText(`${SCOPED_CLUSTER_CAP} of ${SCOPED_CLUSTER_CAP} machines`)).toBeInTheDocument();
  });

  it('keeps an overflow machine the user placed, and never drops saved positions', () => {
    useCtfStore.setState({ machines: Array.from({ length: 100 }, (_, i) => plain(i)) });
    useCtfStore.getState().setGraphNodePosition('m90', { x: 700, y: 500 });
    renderGraph();
    expect(screen.queryByTestId('attack-node-m90')).not.toBeNull();
    expect(screen.getByTestId('graph-grid-overflow')).toHaveTextContent('+51 more · Show all');
    expect(useCtfStore.getState().graphNodePositions.m90).toEqual({ x: 700, y: 500 });
  });

  it('draws a search match that sits beyond the first 48 machines', () => {
    useCtfStore.setState({ machines: Array.from({ length: 300 }, (_, i) => plain(i)) });
    renderFiltered((m) => m.id === 'm200');
    expect(screen.queryByTestId('attack-node-m200')).not.toBeNull();
    expect(screen.queryByTestId('graph-grid-overflow')).toBeNull();
  });

  it('counts only matching machines left out, labelled as matches', () => {
    useCtfStore.setState({ machines: Array.from({ length: 300 }, (_, i) => plain(i)) });
    renderFiltered((m) => Number(m.id.slice(1)) >= 100);
    expect(screen.queryByTestId('attack-node-m100')).not.toBeNull();
    expect(screen.queryByTestId('attack-node-m0')).toBeNull();
    expect(screen.getByTestId('graph-grid-overflow')).toHaveTextContent(`+${200 - SCOPED_CLUSTER_CAP} more matches · Show all`);
  });
});
