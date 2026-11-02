import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
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

const machines: Machine[] = [
  {
    id: 'box-linux-root',
    name: 'Sau',
    ip: '10.10.11.224',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'root',
    tags: ['web'],
    certifications: ['OSCP'],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    openPorts: [22, 80],
  } as Machine,
];

const IDENTITY = 'translate(0, 0) scale(1)';

function mount() {
  const { container } = render(
    <MemoryRouter>
      <GraphView filteredMachines={machines} />
    </MemoryRouter>
  );
  return {
    root: container.firstChild as HTMLElement,
    viewport: () => screen.getByTestId('canvas-viewport'),
  };
}

const touch = (pointerId: number, clientX: number, clientY: number) => ({
  pointerId,
  pointerType: 'touch',
  button: 0,
  clientX,
  clientY,
});

describe('GraphView touch gestures', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ machines, themePreset: 'zerobox' });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    useCtfStore.getState().resetGraphLayout();
  });

  it('lets the page scroll: the canvas no longer sets touch-action none', () => {
    const { root } = mount();
    expect(root.className).not.toContain('touch-none');
    expect(root.className).toContain('touch-pan-y');
  });

  it('a single touch pointer does not pan the graph and shows the two-finger hint', () => {
    const { root, viewport } = mount();
    expect(screen.queryByTestId('graph-touch-hint')).toBeNull();
    act(() => {
      fireEvent.pointerDown(root, touch(1, 100, 100));
      fireEvent.pointerMove(root, touch(1, 160, 150));
      fireEvent.pointerUp(root, touch(1, 160, 150));
    });
    expect(viewport().getAttribute('transform')).toBe(IDENTITY);
    expect(screen.getByTestId('graph-touch-hint')).toHaveTextContent('Use two fingers to move the graph');
  });

  it('the hint disappears after about 1.5 seconds', () => {
    vi.useFakeTimers();
    const { root } = mount();
    act(() => {
      fireEvent.pointerDown(root, touch(1, 100, 100));
      fireEvent.pointerMove(root, touch(1, 160, 150));
    });
    expect(screen.getByTestId('graph-touch-hint')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByTestId('graph-touch-hint')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId('graph-touch-hint')).toBeNull();
  });

  it('two touch pointers pan the graph', () => {
    const { root, viewport } = mount();
    act(() => {
      fireEvent.pointerDown(root, touch(1, 100, 100));
      fireEvent.pointerDown(root, touch(2, 200, 100));
      fireEvent.pointerMove(root, touch(1, 150, 140));
      fireEvent.pointerMove(root, touch(2, 250, 140));
      fireEvent.pointerUp(root, touch(2, 250, 140));
      fireEvent.pointerUp(root, touch(1, 150, 140));
    });
    expect(viewport().getAttribute('transform')).not.toBe(IDENTITY);
    expect(screen.queryByTestId('graph-touch-hint')).toBeNull();
  });

  it('mouse drag still pans the graph directly', () => {
    const { root, viewport } = mount();
    act(() => {
      fireEvent.pointerDown(root, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(root, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 150, clientY: 130 });
      fireEvent.pointerUp(root, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 150, clientY: 130 });
    });
    expect(viewport().getAttribute('transform')).not.toBe(IDENTITY);
    expect(screen.queryByTestId('graph-touch-hint')).toBeNull();
  });

  it('a touch card moved before the long press does not drag (the page scrolls instead)', () => {
    vi.useFakeTimers();
    mount();
    const card = screen.getByTestId('attack-node-box-linux-root');
    act(() => {
      fireEvent.pointerDown(card, touch(1, 200, 200));
      fireEvent.pointerMove(card, touch(1, 260, 240));
      fireEvent.pointerUp(card, touch(1, 260, 240));
    });
    expect(useCtfStore.getState().graphNodePositions['box-linux-root']).toBeUndefined();
  });

  it('a touch card drags after a long press', () => {
    vi.useFakeTimers();
    mount();
    const card = screen.getByTestId('attack-node-box-linux-root');
    act(() => {
      fireEvent.pointerDown(card, touch(1, 200, 200));
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      fireEvent.pointerMove(card, touch(1, 260, 240));
      fireEvent.pointerUp(card, touch(1, 260, 240));
    });
    expect(useCtfStore.getState().graphNodePositions['box-linux-root']).toBeDefined();
  });
});
