/**
 * Undo / redo history for the attack graph.
 *
 * Snapshot pattern over `{ edges, positions }`: every entry stores the state
 * before and after one user-level change. The store never mutates its arrays or
 * objects in place, so snapshots simply keep references (no deep clones).
 *
 * Everything here is pure and immutable; `useGraphHistory` owns the React/store wiring.
 */
import type { AttackGraphEdge, AttackNodePosition } from '../types/graph';

export const MAX_GRAPH_HISTORY = 100;
export const DEFAULT_COALESCE_WINDOW_MS = 800;

export interface GraphSnapshot {
  edges: AttackGraphEdge[];
  positions: Record<string, AttackNodePosition>;
}

export interface GraphHistoryEntry {
  label: string;
  before: GraphSnapshot;
  after: GraphSnapshot;
  /** Consecutive changes sharing a key (within the window) merge into one entry. */
  coalesceKey?: string;
  /** Timestamp (ms) of the last change merged into this entry. */
  at: number;
}

export interface GraphHistory {
  /** Oldest first; the last item is the next undo. */
  past: GraphHistoryEntry[];
  /** Redo stack; the last item is the next redo. */
  future: GraphHistoryEntry[];
  limit: number;
}

export interface GraphChange {
  label: string;
  before: GraphSnapshot;
  after: GraphSnapshot;
  coalesceKey?: string;
  at?: number;
}

export interface GraphHistoryStep {
  history: GraphHistory;
  /** State the graph must be restored to. */
  snapshot: GraphSnapshot;
  label: string;
}

export function createGraphHistory(limit: number = MAX_GRAPH_HISTORY): GraphHistory {
  return { past: [], future: [], limit: Math.max(1, Math.floor(limit)) };
}

export const canUndoGraph = (h: GraphHistory): boolean => h.past.length > 0;
export const canRedoGraph = (h: GraphHistory): boolean => h.future.length > 0;

// ---------------------------------------------------------------------------
// Snapshot comparison
// ---------------------------------------------------------------------------
function edgesEqual(a: AttackGraphEdge, b: AttackGraphEdge): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a as unknown as Record<string, unknown>)[k] !== (b as unknown as Record<string, unknown>)[k]) return false;
  }
  return true;
}

function edgeListsEqual(a: AttackGraphEdge[], b: AttackGraphEdge[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((e) => [e.id, e]));
  for (const e of a) {
    const other = byId.get(e.id);
    if (!other || !edgesEqual(e, other)) return false;
  }
  return true;
}

function positionsEqual(a: Record<string, AttackNodePosition>, b: Record<string, AttackNodePosition>): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const k of aKeys) {
    const other = b[k];
    if (!other || other.x !== a[k].x || other.y !== a[k].y) return false;
  }
  return true;
}

/** Structural equality (edge order is irrelevant, edges match by id). */
export function snapshotsEqual(a: GraphSnapshot, b: GraphSnapshot): boolean {
  return a === b || (positionsEqual(a.positions, b.positions) && edgeListsEqual(a.edges, b.edges));
}

// ---------------------------------------------------------------------------
// History transitions
// ---------------------------------------------------------------------------
/**
 * Records a change. No-op changes are ignored. A new change clears the redo stack
 * and the oldest entries fall off once `limit` is exceeded.
 * Changes with the same `coalesceKey` within `coalesceWindowMs` merge into the
 * previous entry (first `before`, latest `after`); if the merge nets out to no
 * change the entry is dropped.
 */
export function recordGraphChange(
  history: GraphHistory,
  change: GraphChange,
  coalesceWindowMs: number = DEFAULT_COALESCE_WINDOW_MS
): GraphHistory {
  const at = change.at ?? Date.now();
  const top = history.past[history.past.length - 1];

  if (
    change.coalesceKey !== undefined &&
    top &&
    top.coalesceKey === change.coalesceKey &&
    at - top.at <= coalesceWindowMs &&
    snapshotsEqual(top.after, change.before)
  ) {
    const rest = history.past.slice(0, -1);
    if (snapshotsEqual(top.before, change.after)) {
      return { ...history, past: rest, future: [] };
    }
    const merged: GraphHistoryEntry = { ...top, after: change.after, at };
    return { ...history, past: [...rest, merged], future: [] };
  }

  if (snapshotsEqual(change.before, change.after)) return history;

  const entry: GraphHistoryEntry = {
    label: change.label,
    before: change.before,
    after: change.after,
    coalesceKey: change.coalesceKey,
    at,
  };
  const past = [...history.past, entry];
  const overflow = past.length - history.limit;
  return { ...history, past: overflow > 0 ? past.slice(overflow) : past, future: [] };
}

export function undoGraphHistory(history: GraphHistory): GraphHistoryStep | null {
  const entry = history.past[history.past.length - 1];
  if (!entry) return null;
  return {
    history: { ...history, past: history.past.slice(0, -1), future: [...history.future, entry] },
    snapshot: entry.before,
    label: entry.label,
  };
}

export function redoGraphHistory(history: GraphHistory): GraphHistoryStep | null {
  const entry = history.future[history.future.length - 1];
  if (!entry) return null;
  return {
    history: { ...history, past: [...history.past, entry], future: history.future.slice(0, -1) },
    snapshot: entry.after,
    label: entry.label,
  };
}

export function clearGraphHistory(history: GraphHistory): GraphHistory {
  return history.past.length === 0 && history.future.length === 0 ? history : { ...history, past: [], future: [] };
}

// ---------------------------------------------------------------------------
// Restoring a snapshot through the store's granular actions
// ---------------------------------------------------------------------------
export interface GraphRestorePlan {
  deleteEdgeIds: string[];
  addEdges: AttackGraphEdge[];
  updateEdges: Array<{ id: string; updates: Partial<AttackGraphEdge> }>;
  /** `reset` clears every stored position first (needed to drop keys), then `set` is applied. */
  positions: { reset: boolean; set: Record<string, AttackNodePosition> } | null;
}

/** Minimal set of store operations that turns `current` into `target`. */
export function planGraphRestore(current: GraphSnapshot, target: GraphSnapshot): GraphRestorePlan {
  const currentById = new Map(current.edges.map((e) => [e.id, e]));
  const targetById = new Map(target.edges.map((e) => [e.id, e]));

  const deleteEdgeIds = current.edges.filter((e) => !targetById.has(e.id)).map((e) => e.id);
  const addEdges = target.edges.filter((e) => !currentById.has(e.id));
  const updateEdges: GraphRestorePlan['updateEdges'] = [];
  for (const wanted of target.edges) {
    const existing = currentById.get(wanted.id);
    if (!existing || edgesEqual(existing, wanted)) continue;
    const updates: Record<string, unknown> = {};
    const w = wanted as unknown as Record<string, unknown>;
    const x = existing as unknown as Record<string, unknown>;
    for (const k of new Set([...Object.keys(w), ...Object.keys(x)])) {
      if (k !== 'id' && w[k] !== x[k]) updates[k] = w[k];
    }
    updateEdges.push({ id: wanted.id, updates: updates as Partial<AttackGraphEdge> });
  }

  let positions: GraphRestorePlan['positions'] = null;
  if (!positionsEqual(current.positions, target.positions)) {
    const reset = Object.keys(current.positions).some((k) => !(k in target.positions));
    if (reset) {
      positions = { reset: true, set: { ...target.positions } };
    } else {
      const set: Record<string, AttackNodePosition> = {};
      for (const [k, p] of Object.entries(target.positions)) {
        const cur = current.positions[k];
        if (!cur || cur.x !== p.x || cur.y !== p.y) set[k] = p;
      }
      positions = { reset: false, set };
    }
  }

  return { deleteEdgeIds, addEdges, updateEdges, positions };
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
export interface HistoryKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo. */
export function getHistoryShortcut(e: HistoryKeyEvent): 'undo' | 'redo' | null {
  if (e.altKey || !(e.ctrlKey || e.metaKey)) return null;
  const key = e.key.toLowerCase();
  if (key === 'z') return e.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && e.ctrlKey && !e.metaKey && !e.shiftKey) return 'redo';
  return null;
}
