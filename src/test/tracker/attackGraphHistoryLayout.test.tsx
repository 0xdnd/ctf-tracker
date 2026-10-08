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

function machine(id: string, name: string, ip: string): Machine {
  return {
    id,
    name,
    ip,
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: ['web'],
    certifications: ['OSCP'],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as Machine;
}

const machines: Machine[] = [
  machine('m-web', 'Web', '10.10.11.10'),
  machine('m-jump', 'Jump', '10.10.11.20'),
  machine('m-db', 'Db', '10.10.11.30'),
  machine('m-dc', 'Dc', '10.10.11.40'),
  machine('m-solo', 'Solo', '10.10.11.50'),
];

const renderGraph = () =>
  render(
    <MemoryRouter>
      <GraphView filteredMachines={machines} />
    </MemoryRouter>
  );

const store = () => useCtfStore.getState();

describe('GraphView undo/redo and auto layout', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    store().resetGraphLayout();
    store().clearGraphEdges();
    useCtfStore.setState({ machines, themePreset: 'zerobox' });
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    store().resetGraphLayout();
    store().clearGraphEdges();
  });

  it('renders undo, redo and auto layout buttons with aria-labels; undo/redo start disabled', () => {
    renderGraph();
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    const layout = screen.getByRole('button', { name: 'Auto layout' });
    expect(undo).toBeDisabled();
    expect(redo).toBeDisabled();
    expect(layout).toBeEnabled();
  });

  it('auto layout arranges nodes left-to-right by edge direction as one undoable step', () => {
    store().addGraphEdge({ sourceId: 'm-web', targetId: 'm-jump', type: 'pivot-ssh', status: 'potential' });
    store().addGraphEdge({ sourceId: 'm-jump', targetId: 'm-db', type: 'pivot-chisel', status: 'potential' });
    store().addGraphEdge({ sourceId: 'm-jump', targetId: 'm-dc', type: 'lateral-cred-reuse', status: 'potential' });
    renderGraph();

    act(() => {
      fireEvent.click(screen.getByTestId('graph-auto-layout'));
    });

    const pos = store().graphNodePositions;
    expect(pos['m-web'].x).toBeLessThan(pos['m-jump'].x);
    expect(pos['m-jump'].x).toBeLessThan(pos['m-db'].x);
    expect(pos['m-db'].x).toBe(pos['m-dc'].x);
    expect(pos['m-db'].y).not.toBe(pos['m-dc'].y);
    // the unconnected machine goes below the layered attack path
    expect(pos['m-solo'].y).toBeGreaterThan(Math.max(pos['m-db'].y, pos['m-dc'].y));
    // persisted like any other layout change
    const persisted = JSON.parse(safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY)!);
    expect(persisted.graphNodePositions['m-web']).toEqual(pos['m-web']);

    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeEnabled();
    act(() => {
      fireEvent.click(undo);
    });
    expect(store().graphNodePositions).toEqual({});
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    });
    expect(store().graphNodePositions['m-web']).toEqual(pos['m-web']);
    expect(store().graphNodePositions['m-dc']).toEqual(pos['m-dc']);
  });

  it('a node drag is a single history entry that Ctrl+Z reverts and Ctrl+Shift+Z re-applies', () => {
    renderGraph();
    const card = screen.getByTestId('attack-node-m-web');

    act(() => {
      fireEvent.pointerDown(card, { clientX: 200, clientY: 200, button: 0, pointerId: 1 });
      fireEvent.pointerMove(card, { clientX: 230, clientY: 215, button: 0, pointerId: 1 });
      fireEvent.pointerMove(card, { clientX: 260, clientY: 240, button: 0, pointerId: 1 });
      fireEvent.pointerUp(card, { clientX: 260, clientY: 240, button: 0, pointerId: 1 });
    });
    const dragged = store().graphNodePositions['m-web'];
    expect(dragged).toBeDefined();

    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    expect('m-web' in store().graphNodePositions).toBe(false);
    // one drag == one entry, so a single undo emptied the history
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();

    act(() => {
      fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
    });
    expect(store().graphNodePositions['m-web']).toEqual(dragged);
  });

  it('undoes and redoes a pivot link created in connection mode', () => {
    renderGraph();
    act(() => {
      fireEvent.click(screen.getByTestId('graph-connect-vector'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('attack-node-m-jump'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('attack-node-m-db'));
    });
    expect(store().graphEdges).toHaveLength(1);
    const edgeId = store().graphEdges[0].id;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });
    expect(store().graphEdges).toHaveLength(0);

    act(() => {
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    });
    expect(store().graphEdges.map((e) => e.id)).toEqual([edgeId]);
  });

  it('ignores Ctrl+Z typed in a text field', () => {
    renderGraph();
    act(() => {
      fireEvent.click(screen.getByTestId('graph-auto-layout'));
    });
    const positions = { ...store().graphNodePositions };
    expect(Object.keys(positions).length).toBeGreaterThan(0);

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    });
    expect(store().graphNodePositions).toEqual(positions);
    input.remove();
  });
});
