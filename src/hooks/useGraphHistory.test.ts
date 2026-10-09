import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../store/useCtfStore';
import { useGraphHistory } from './useGraphHistory';

const store = () => useCtfStore.getState();

function resetGraph() {
  safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
  store().resetGraphLayout();
  store().clearGraphEdges();
}

function pressKey(init: KeyboardEventInit, target: EventTarget = window) {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
}

describe('useGraphHistory', () => {
  beforeEach(resetGraph);
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    resetGraph();
  });

  it('starts with nothing to undo or redo', () => {
    const { result } = renderHook(() => useGraphHistory());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undo()).toBe(false);
    expect(result.current.redo()).toBe(false);
  });

  it('undoes and redoes edge add, keeping the same edge id', () => {
    const { result } = renderHook(() => useGraphHistory());
    let id = '';
    act(() => {
      id = result.current.addGraphEdge({ sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' }).id;
    });
    expect(store().graphEdges.map((e) => e.id)).toEqual([id]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoLabel).toBe('Add pivot link');

    act(() => {
      result.current.undo();
    });
    expect(store().graphEdges).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(store().graphEdges.map((e) => e.id)).toEqual([id]);
    expect(result.current.canRedo).toBe(false);
  });

  it('undoes an edge delete and restores the full edge (id, createdAt, fields)', () => {
    const original = store().addGraphEdge({
      sourceId: 'a',
      targetId: 'b',
      type: 'pivot-chisel',
      status: 'compromised',
      port: 8000,
      notes: 'creds in vault',
    });
    const { result } = renderHook(() => useGraphHistory());

    act(() => {
      result.current.deleteGraphEdge(original.id);
    });
    expect(store().graphEdges).toHaveLength(0);

    act(() => {
      result.current.undo();
    });
    expect(store().graphEdges).toHaveLength(1);
    expect(store().graphEdges[0]).toEqual(original);
  });

  it('undoes an edge update, including clearing a newly set field', () => {
    const original = store().addGraphEdge({ sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' });
    const { result } = renderHook(() => useGraphHistory());

    act(() => {
      result.current.updateGraphEdge(original.id, { status: 'compromised', port: 2222, notes: 'pwned' });
    });
    expect(store().graphEdges[0].status).toBe('compromised');

    act(() => {
      result.current.undo();
    });
    const restored = store().graphEdges[0];
    expect(restored.status).toBe('potential');
    expect(restored.port).toBeUndefined();
    expect(restored.notes).toBeUndefined();

    act(() => {
      result.current.redo();
    });
    expect(store().graphEdges[0]).toMatchObject({ status: 'compromised', port: 2222, notes: 'pwned' });
  });

  it('records a node drag as one entry and undo removes a never-stored position', () => {
    const { result } = renderHook(() => useGraphHistory());
    act(() => {
      result.current.setGraphNodePosition('n1', { x: 400, y: 300 });
    });
    expect(store().graphNodePositions.n1).toEqual({ x: 400, y: 300 });

    act(() => {
      result.current.undo();
    });
    expect('n1' in store().graphNodePositions).toBe(false);

    act(() => {
      result.current.redo();
    });
    expect(store().graphNodePositions.n1).toEqual({ x: 400, y: 300 });
  });

  it('restores the previous position when a node is dragged twice', () => {
    const { result } = renderHook(() => useGraphHistory());
    act(() => {
      result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
    });
    act(() => {
      result.current.setGraphNodePosition('n1', { x: 500, y: 400 });
    });
    act(() => {
      result.current.undo();
    });
    expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });
    act(() => {
      result.current.undo();
    });
    expect(store().graphNodePositions).toEqual({});
  });

  it('applies many positions (auto layout) as ONE undoable entry', () => {
    store().setGraphNodePosition('n1', { x: 1, y: 1 });
    const before = { ...store().graphNodePositions };
    const { result } = renderHook(() => useGraphHistory());

    act(() => {
      result.current.applyNodePositions({ n1: { x: 130, y: 90 }, n2: { x: 400, y: 90 }, n3: { x: 670, y: 90 } });
    });
    expect(Object.keys(store().graphNodePositions).sort()).toEqual(['n1', 'n2', 'n3']);
    expect(result.current.undoLabel).toBe('Auto layout');

    act(() => {
      result.current.undo();
    });
    expect(store().graphNodePositions).toEqual(before);
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.redo();
    });
    expect(store().graphNodePositions.n3).toEqual({ x: 670, y: 90 });
  });

  it('does not record a no-op (same positions / unchanged edge)', () => {
    const e = store().addGraphEdge({ sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' });
    store().setGraphNodePosition('n1', { x: 5, y: 5 });
    const { result } = renderHook(() => useGraphHistory());
    act(() => {
      result.current.setGraphNodePosition('n1', { x: 5, y: 5 });
      result.current.updateGraphEdge(e.id, { status: 'potential' });
    });
    expect(result.current.canUndo).toBe(false);
  });

  it('clears the redo stack after a new change', () => {
    const { result } = renderHook(() => useGraphHistory());
    act(() => {
      result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.setGraphNodePosition('n2', { x: 200, y: 200 });
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('caps history at 100 entries', () => {
    const { result } = renderHook(() => useGraphHistory());
    for (let i = 1; i <= 130; i++) {
      act(() => {
        result.current.setGraphNodePosition('n1', { x: i, y: i });
      });
    }
    let undos = 0;
    while (result.current.canUndo && undos < 500) {
      act(() => {
        result.current.undo();
      });
      undos += 1;
    }
    expect(undos).toBe(100);
    // 130 moves, 100 undone -> back at move #30
    expect(store().graphNodePositions.n1).toEqual({ x: 30, y: 30 });
  });

  it('drops history when the graph is changed outside the hook', () => {
    const { result } = renderHook(() => useGraphHistory());
    act(() => {
      result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      store().addGraphEdge({ sourceId: 'x', targetId: 'y', type: 'pivot-ssh', status: 'potential' });
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.undo()).toBe(false);
    expect(store().graphEdges).toHaveLength(1);
  });

  describe('keyboard shortcuts', () => {
    it('Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo, Cmd+Z works too', () => {
      const { result } = renderHook(() => useGraphHistory());
      act(() => {
        result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
      });

      const undoEv = pressKey({ key: 'z', ctrlKey: true });
      expect(undoEv.defaultPrevented).toBe(true);
      expect('n1' in store().graphNodePositions).toBe(false);

      pressKey({ key: 'Z', ctrlKey: true, shiftKey: true });
      expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });

      pressKey({ key: 'z', metaKey: true });
      expect('n1' in store().graphNodePositions).toBe(false);

      pressKey({ key: 'y', ctrlKey: true });
      expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });
    });

    it('does not hijack Ctrl+Z when there is nothing to undo', () => {
      renderHook(() => useGraphHistory());
      const ev = pressKey({ key: 'z', ctrlKey: true });
      expect(ev.defaultPrevented).toBe(false);
    });

    it('ignores shortcuts while a text field has focus', () => {
      const { result } = renderHook(() => useGraphHistory());
      act(() => {
        result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
      });

      for (const tag of ['input', 'textarea', 'select']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);
        const ev = pressKey({ key: 'z', ctrlKey: true }, el);
        expect(ev.defaultPrevented).toBe(false);
        expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });
      }

      const editable = document.createElement('div');
      editable.setAttribute('contenteditable', 'true');
      document.body.appendChild(editable);
      pressKey({ key: 'z', ctrlKey: true }, editable);
      expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });
    });

    it('ignores shortcuts while a modal dialog is open', () => {
      const { result } = renderHook(() => useGraphHistory());
      act(() => {
        result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
      });
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);

      pressKey({ key: 'z', ctrlKey: true });
      expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });
    });

    it('does nothing when shortcuts are disabled or after unmount', () => {
      const disabled = renderHook(() => useGraphHistory({ shortcuts: false }));
      act(() => {
        disabled.result.current.setGraphNodePosition('n1', { x: 100, y: 100 });
      });
      pressKey({ key: 'z', ctrlKey: true });
      expect(store().graphNodePositions.n1).toEqual({ x: 100, y: 100 });
      disabled.unmount();

      const enabled = renderHook(() => useGraphHistory());
      act(() => {
        enabled.result.current.setGraphNodePosition('n2', { x: 5, y: 5 });
      });
      enabled.unmount();
      pressKey({ key: 'z', ctrlKey: true });
      expect(store().graphNodePositions.n2).toEqual({ x: 5, y: 5 });
    });
  });
});
