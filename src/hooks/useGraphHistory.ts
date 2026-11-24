/**
 * Undo / redo for the attack graph (edges + node positions).
 *
 * Returns drop-in replacements for the store's graph mutators that record one
 * history entry per user-level change, plus undo/redo controls and the
 * Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y shortcuts. Restoring a snapshot goes
 * through the store's existing granular actions so persistence stays intact.
 *
 * History is per mount and is dropped when the graph is changed behind its back
 * (profile switch, workspace import, ...), because older snapshots would be stale.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useCtfStore } from '../store/useCtfStore';
import type { AttackGraphEdge, AttackNodePosition } from '../types/graph';
import {
  GraphHistory,
  GraphSnapshot,
  canRedoGraph,
  canUndoGraph,
  clearGraphHistory,
  createGraphHistory,
  getHistoryShortcut,
  planGraphRestore,
  recordGraphChange,
  redoGraphHistory,
  undoGraphHistory,
} from '../utils/graphHistory';

export type NewGraphEdge = Omit<AttackGraphEdge, 'id' | 'createdAt'> & { id?: string; createdAt?: string };

export interface GraphHistoryBackend {
  getSnapshot: () => GraphSnapshot;
  addEdge: (edge: NewGraphEdge) => AttackGraphEdge;
  updateEdge: (id: string, updates: Partial<AttackGraphEdge>) => void;
  deleteEdge: (id: string) => void;
  setNodePosition: (id: string, pos: AttackNodePosition) => void;
  batchSetNodePositions: (positions: Record<string, AttackNodePosition>) => void;
  resetLayout: () => void;
}

export interface UseGraphHistoryOptions {
  /** Register the keyboard shortcuts on window. Default true. */
  shortcuts?: boolean;
  /** Optional custom store backend (e.g. Exam Pivot Graph). Defaults to useCtfStore. */
  backend?: GraphHistoryBackend;
  /** Reactive edges reference when using a custom backend. */
  edges?: AttackGraphEdge[];
  /** Reactive positions reference when using a custom backend. */
  positions?: Record<string, AttackNodePosition>;
}

const DEFAULT_CTF_BACKEND: GraphHistoryBackend = {
  getSnapshot: () => {
    const s = useCtfStore.getState();
    return { edges: s.graphEdges, positions: s.graphNodePositions };
  },
  addEdge: (edge) => useCtfStore.getState().addGraphEdge(edge),
  updateEdge: (id, updates) => useCtfStore.getState().updateGraphEdge(id, updates),
  deleteEdge: (id) => useCtfStore.getState().deleteGraphEdge(id),
  setNodePosition: (id, pos) => useCtfStore.getState().setGraphNodePosition(id, pos),
  batchSetNodePositions: (positions) => useCtfStore.getState().batchSetGraphNodePositions(positions),
  resetLayout: () => useCtfStore.getState().resetGraphLayout(),
};

function applySnapshot(backend: GraphHistoryBackend, target: GraphSnapshot): void {
  const plan = planGraphRestore(backend.getSnapshot(), target);
  plan.deleteEdgeIds.forEach((id) => backend.deleteEdge(id));
  plan.addEdges.forEach((edge) => backend.addEdge(edge));
  plan.updateEdges.forEach(({ id, updates }) => backend.updateEdge(id, updates));
  if (plan.positions) {
    if (plan.positions.reset) backend.resetLayout();
    if (Object.keys(plan.positions.set).length > 0) backend.batchSetNodePositions(plan.positions.set);
  }
}

/** True when the key event belongs to a text field, an editor or an open modal. */
function shouldIgnoreShortcutTarget(target: EventTarget | null): boolean {
  if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return true;
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((target as HTMLElement).isContentEditable) return true;
  return target.closest('[contenteditable]:not([contenteditable="false"]),[role="textbox"]') !== null;
}

export function useGraphHistory(options: UseGraphHistoryOptions = {}) {
  const shortcuts = options.shortcuts ?? true;
  const backend = options.backend ?? DEFAULT_CTF_BACKEND;
  const backendRef = useRef(backend);
  backendRef.current = backend;

  // Subscribing re-runs the external-change check below whenever the graph changes.
  const ctfEdges = useCtfStore((s) => s.graphEdges);
  const ctfPositions = useCtfStore((s) => s.graphNodePositions);
  const graphEdges = options.edges ?? ctfEdges;
  const graphNodePositions = options.positions ?? ctfPositions;

  const historyRef = useRef<GraphHistory>(createGraphHistory());
  const knownRef = useRef<GraphSnapshot | null>(null);
  if (knownRef.current === null) knownRef.current = backend.getSnapshot();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  /** Reads the live graph; drops history if it changed outside this hook. */
  const reconcile = useCallback((): GraphSnapshot => {
    const current = backendRef.current.getSnapshot();
    const known = knownRef.current!;
    if (current.edges !== known.edges || current.positions !== known.positions) {
      knownRef.current = current;
      const cleared = clearGraphHistory(historyRef.current);
      if (cleared !== historyRef.current) {
        historyRef.current = cleared;
        rerender();
      }
    }
    return current;
  }, []);

  useEffect(() => {
    reconcile();
  }, [graphEdges, graphNodePositions, reconcile]);

  /** Runs a store mutation and records it as ONE undoable entry. */
  const track = useCallback(
    <T>(label: string, mutate: () => T, coalesceKey?: string): T => {
      const before = reconcile();
      const result = mutate();
      const after = backendRef.current.getSnapshot();
      knownRef.current = after;
      const next = recordGraphChange(historyRef.current, { label, before, after, coalesceKey });
      if (next !== historyRef.current) {
        historyRef.current = next;
        rerender();
      }
      return result;
    },
    [reconcile]
  );

  const travel = useCallback(
    (direction: 'undo' | 'redo'): boolean => {
      reconcile();
      const step =
        direction === 'undo' ? undoGraphHistory(historyRef.current) : redoGraphHistory(historyRef.current);
      if (!step) return false;
      historyRef.current = step.history;
      applySnapshot(backendRef.current, step.snapshot);
      knownRef.current = backendRef.current.getSnapshot();
      rerender();
      return true;
    },
    [reconcile]
  );

  const undo = useCallback(() => travel('undo'), [travel]);
  const redo = useCallback(() => travel('redo'), [travel]);

  // Recorded drop-ins for the store's graph mutators.
  const addGraphEdge = useCallback(
    (edge: NewGraphEdge): AttackGraphEdge =>
      track('Add pivot link', () => backendRef.current.addEdge(edge)),
    [track]
  );
  const updateGraphEdge = useCallback(
    (id: string, updates: Partial<AttackGraphEdge>) =>
      track('Edit pivot link', () => backendRef.current.updateEdge(id, updates)),
    [track]
  );
  const deleteGraphEdge = useCallback(
    (id: string) => track('Delete pivot link', () => backendRef.current.deleteEdge(id)),
    [track]
  );
  /** Call once when a drag ends (never per mousemove), so a drag is one entry. */
  const setGraphNodePosition = useCallback(
    (id: string, pos: AttackNodePosition) =>
      track('Move node', () => backendRef.current.setNodePosition(id, pos)),
    [track]
  );
  /** Applies many positions (e.g. an auto layout) as one entry. */
  const applyNodePositions = useCallback(
    (positions: Record<string, AttackNodePosition>, label: string = 'Auto layout') =>
      track(label, () => backendRef.current.batchSetNodePositions(positions)),
    [track]
  );

  useEffect(() => {
    if (!shortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const action = getHistoryShortcut(e);
      if (!action || shouldIgnoreShortcutTarget(e.target)) return;
      if (travel(action)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, travel]);

  const history = historyRef.current;
  return {
    undo,
    redo,
    canUndo: canUndoGraph(history),
    canRedo: canRedoGraph(history),
    undoLabel: history.past[history.past.length - 1]?.label,
    redoLabel: history.future[history.future.length - 1]?.label,
    addGraphEdge,
    updateGraphEdge,
    deleteGraphEdge,
    setGraphNodePosition,
    applyNodePositions,
  };
}
