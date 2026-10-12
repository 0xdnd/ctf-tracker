import { describe, it, expect } from 'vitest';
import {
  MAX_GRAPH_HISTORY,
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
  snapshotsEqual,
  undoGraphHistory,
} from './graphHistory';
import type { AttackGraphEdge } from '../types/graph';

const edge = (id: string, extra: Partial<AttackGraphEdge> = {}): AttackGraphEdge => ({
  id,
  sourceId: 'a',
  targetId: 'b',
  type: 'pivot-ssh',
  status: 'potential',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
});

const snap = (
  edges: AttackGraphEdge[] = [],
  positions: GraphSnapshot['positions'] = {}
): GraphSnapshot => ({ edges, positions });

/** Records `n` distinct node moves (each its own entry). */
function recordMoves(h: GraphHistory, n: number): { history: GraphHistory; last: GraphSnapshot } {
  let history = h;
  let current = snap([], {});
  for (let i = 0; i < n; i++) {
    const next = snap([], { n1: { x: i + 1, y: i + 1 } });
    history = recordGraphChange(history, { label: `move ${i}`, before: current, after: next, at: i * 10_000 });
    current = next;
  }
  return { history, last: current };
}

describe('snapshotsEqual', () => {
  it('compares structurally, ignoring edge order', () => {
    const e1 = edge('1');
    const e2 = edge('2', { port: 22 });
    expect(snapshotsEqual(snap([e1, e2]), snap([{ ...e2 }, { ...e1 }]))).toBe(true);
    expect(snapshotsEqual(snap([e1]), snap([edge('1', { status: 'compromised' })]))).toBe(false);
    expect(snapshotsEqual(snap([e1]), snap([e1, e2]))).toBe(false);
    expect(snapshotsEqual(snap([], { a: { x: 1, y: 2 } }), snap([], { a: { x: 1, y: 2 } }))).toBe(true);
    expect(snapshotsEqual(snap([], { a: { x: 1, y: 2 } }), snap([], { a: { x: 1, y: 3 } }))).toBe(false);
    expect(snapshotsEqual(snap([], { a: { x: 1, y: 2 } }), snap([], {}))).toBe(false);
  });

  it('treats an explicitly undefined field like a missing one', () => {
    expect(snapshotsEqual(snap([edge('1', { port: undefined })]), snap([edge('1')]))).toBe(true);
  });
});

describe('graph history: push / undo / redo', () => {
  it('starts empty', () => {
    const h = createGraphHistory();
    expect(canUndoGraph(h)).toBe(false);
    expect(canRedoGraph(h)).toBe(false);
    expect(undoGraphHistory(h)).toBeNull();
    expect(redoGraphHistory(h)).toBeNull();
  });

  it('undo returns the before snapshot and redo returns the after snapshot', () => {
    const before = snap([]);
    const after = snap([edge('e1')]);
    let h = recordGraphChange(createGraphHistory(), { label: 'Add pivot link', before, after, at: 1 });
    expect(canUndoGraph(h)).toBe(true);

    const undone = undoGraphHistory(h)!;
    expect(undone.snapshot).toBe(before);
    expect(undone.label).toBe('Add pivot link');
    expect(canUndoGraph(undone.history)).toBe(false);
    expect(canRedoGraph(undone.history)).toBe(true);

    const redone = redoGraphHistory(undone.history)!;
    expect(redone.snapshot).toBe(after);
    expect(canUndoGraph(redone.history)).toBe(true);
    expect(canRedoGraph(redone.history)).toBe(false);
    h = redone.history;
    expect(h.past).toHaveLength(1);
  });

  it('walks several steps back and forth in order', () => {
    const s0 = snap([]);
    const s1 = snap([edge('1')]);
    const s2 = snap([edge('1'), edge('2')]);
    const s3 = snap([edge('1'), edge('2')], { a: { x: 5, y: 5 } });
    let h = createGraphHistory();
    h = recordGraphChange(h, { label: 'one', before: s0, after: s1, at: 1 });
    h = recordGraphChange(h, { label: 'two', before: s1, after: s2, at: 2 });
    h = recordGraphChange(h, { label: 'three', before: s2, after: s3, at: 3 });

    const u3 = undoGraphHistory(h)!;
    const u2 = undoGraphHistory(u3.history)!;
    const u1 = undoGraphHistory(u2.history)!;
    expect([u3.snapshot, u2.snapshot, u1.snapshot]).toEqual([s2, s1, s0]);
    expect(undoGraphHistory(u1.history)).toBeNull();

    const r1 = redoGraphHistory(u1.history)!;
    const r2 = redoGraphHistory(r1.history)!;
    expect([r1.snapshot, r2.snapshot]).toEqual([s1, s2]);
  });

  it('clears the redo stack when a new change is recorded', () => {
    const a = snap([]);
    const b = snap([edge('1')]);
    const c = snap([edge('1'), edge('2')]);
    let h = recordGraphChange(createGraphHistory(), { label: 'add 1', before: a, after: b, at: 1 });
    h = undoGraphHistory(h)!.history;
    expect(canRedoGraph(h)).toBe(true);

    h = recordGraphChange(h, { label: 'add other', before: a, after: c, at: 2 });
    expect(canRedoGraph(h)).toBe(false);
    expect(h.past.map((e) => e.label)).toEqual(['add other']);
  });

  it('does not record no-op changes and keeps the redo stack for them', () => {
    const a = snap([edge('1')]);
    let h = recordGraphChange(createGraphHistory(), { label: 'x', before: snap([]), after: a, at: 1 });
    h = undoGraphHistory(h)!.history;
    const same = recordGraphChange(h, { label: 'noop', before: a, after: snap([edge('1')]), at: 2 });
    expect(same).toBe(h);
    expect(canRedoGraph(same)).toBe(true);
  });

  it('does not mutate previous history values (immutable)', () => {
    const h0 = createGraphHistory();
    const h1 = recordGraphChange(h0, { label: 'x', before: snap([]), after: snap([edge('1')]), at: 1 });
    expect(h0.past).toHaveLength(0);
    const u = undoGraphHistory(h1)!;
    expect(h1.past).toHaveLength(1);
    expect(u.history.past).toHaveLength(0);
  });

  it('clearGraphHistory empties both stacks', () => {
    const { history } = recordMoves(createGraphHistory(), 3);
    const undone = undoGraphHistory(history)!.history;
    const cleared = clearGraphHistory(undone);
    expect(cleared.past).toHaveLength(0);
    expect(cleared.future).toHaveLength(0);
    expect(clearGraphHistory(cleared)).toBe(cleared);
  });
});

describe('graph history: cap', () => {
  it('defaults to a cap of 100 entries and drops the oldest first', () => {
    expect(MAX_GRAPH_HISTORY).toBe(100);
    const { history } = recordMoves(createGraphHistory(), 130);
    expect(history.past).toHaveLength(100);
    expect(history.past[0].label).toBe('move 30');
    expect(history.past[99].label).toBe('move 129');

    // 100 undos succeed, the 101st finds nothing
    let h = history;
    let undos = 0;
    for (;;) {
      const step = undoGraphHistory(h);
      if (!step) break;
      h = step.history;
      undos += 1;
    }
    expect(undos).toBe(100);
  });

  it('honours a custom limit', () => {
    const { history } = recordMoves(createGraphHistory(3), 10);
    expect(history.past.map((e) => e.label)).toEqual(['move 7', 'move 8', 'move 9']);
  });
});

describe('graph history: coalescing (drag)', () => {
  it('merges a burst of same-key changes into ONE entry (first before, last after)', () => {
    const start = snap([], {});
    let current = start;
    let h = createGraphHistory();
    for (let i = 1; i <= 25; i++) {
      const next = snap([], { n1: { x: i * 3, y: i * 2 } });
      h = recordGraphChange(h, { label: 'Move node', before: current, after: next, coalesceKey: 'drag:n1', at: 1000 + i * 16 });
      current = next;
    }
    expect(h.past).toHaveLength(1);
    expect(h.past[0].before).toBe(start);
    expect(h.past[0].after).toBe(current);

    const undone = undoGraphHistory(h)!;
    expect(undone.snapshot).toBe(start);
    expect(canUndoGraph(undone.history)).toBe(false);
  });

  it('does not merge when the key differs, the window elapsed, or a coalescing change is not contiguous', () => {
    const s0 = snap([], {});
    const s1 = snap([], { n1: { x: 1, y: 1 } });
    const s2 = snap([], { n1: { x: 2, y: 2 } });
    const s3 = snap([], { n2: { x: 3, y: 3 } });

    let h = recordGraphChange(createGraphHistory(), { label: 'm', before: s0, after: s1, coalesceKey: 'drag:n1', at: 0 });
    h = recordGraphChange(h, { label: 'm', before: s1, after: s2, coalesceKey: 'drag:n2', at: 10 });
    expect(h.past).toHaveLength(2);

    h = recordGraphChange(h, { label: 'm', before: s2, after: s1, coalesceKey: 'drag:n2', at: 10_000 });
    expect(h.past).toHaveLength(3);

    h = recordGraphChange(h, { label: 'm', before: s0, after: s3, coalesceKey: 'drag:n2', at: 10_010 });
    expect(h.past).toHaveLength(4);
  });

  it('never merges changes without a coalesce key', () => {
    const s0 = snap([], {});
    const s1 = snap([], { n1: { x: 1, y: 1 } });
    const s2 = snap([], { n1: { x: 2, y: 2 } });
    let h = recordGraphChange(createGraphHistory(), { label: 'm', before: s0, after: s1, at: 0 });
    h = recordGraphChange(h, { label: 'm', before: s1, after: s2, at: 1 });
    expect(h.past).toHaveLength(2);
  });

  it('drops the entry when a coalesced burst nets out to no change', () => {
    const s0 = snap([], { n1: { x: 10, y: 10 } });
    const s1 = snap([], { n1: { x: 50, y: 50 } });
    let h = recordGraphChange(createGraphHistory(), { label: 'm', before: s0, after: s1, coalesceKey: 'drag:n1', at: 0 });
    h = recordGraphChange(h, { label: 'm', before: s1, after: snap([], { n1: { x: 10, y: 10 } }), coalesceKey: 'drag:n1', at: 10 });
    expect(h.past).toHaveLength(0);
  });

  it('clears redo when coalescing into the previous entry', () => {
    const s0 = snap([], {});
    const s1 = snap([], { n1: { x: 1, y: 1 } });
    const s2 = snap([], { n1: { x: 2, y: 2 } });
    let h = recordGraphChange(createGraphHistory(), { label: 'm', before: s0, after: s1, coalesceKey: 'k', at: 0 });
    h = recordGraphChange(h, { label: 'other', before: s1, after: s2, at: 5 });
    h = undoGraphHistory(h)!.history;
    expect(canRedoGraph(h)).toBe(true);
    h = recordGraphChange(h, { label: 'm', before: s1, after: s2, coalesceKey: 'k', at: 10 });
    expect(canRedoGraph(h)).toBe(false);
  });
});

describe('planGraphRestore', () => {
  it('plans deletes, adds and field updates by edge id', () => {
    const keep = edge('keep');
    const drop = edge('drop');
    const bring = edge('bring', { port: 1080 });
    const current = snap([keep, drop, edge('upd', { status: 'compromised', port: 22 })]);
    const target = snap([keep, bring, edge('upd', { status: 'potential' })]);

    const plan = planGraphRestore(current, target);
    expect(plan.deleteEdgeIds).toEqual(['drop']);
    expect(plan.addEdges).toEqual([bring]);
    expect(plan.updateEdges).toEqual([{ id: 'upd', updates: { status: 'potential', port: undefined } }]);
    expect(plan.positions).toBeNull();
  });

  it('is a no-op for equal snapshots', () => {
    const s = snap([edge('1')], { a: { x: 1, y: 1 } });
    const plan = planGraphRestore(s, snap([edge('1')], { a: { x: 1, y: 1 } }));
    expect(plan).toEqual({ deleteEdgeIds: [], addEdges: [], updateEdges: [], positions: null });
  });

  it('sets only changed positions when no key has to be removed', () => {
    const plan = planGraphRestore(
      snap([], { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } }),
      snap([], { a: { x: 1, y: 1 }, b: { x: 9, y: 9 }, c: { x: 3, y: 3 } })
    );
    expect(plan.positions).toEqual({ reset: false, set: { b: { x: 9, y: 9 }, c: { x: 3, y: 3 } } });
  });

  it('requests a reset (with the full target) when a stored position must disappear', () => {
    const plan = planGraphRestore(
      snap([], { a: { x: 1, y: 1 }, dragged: { x: 7, y: 7 } }),
      snap([], { a: { x: 1, y: 1 } })
    );
    expect(plan.positions).toEqual({ reset: true, set: { a: { x: 1, y: 1 } } });
  });
});

describe('getHistoryShortcut', () => {
  const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  });

  it('maps Ctrl/Cmd+Z to undo', () => {
    expect(getHistoryShortcut(key('z', { ctrlKey: true }))).toBe('undo');
    expect(getHistoryShortcut(key('Z', { metaKey: true }))).toBe('undo');
  });

  it('maps Ctrl/Cmd+Shift+Z and Ctrl+Y to redo', () => {
    expect(getHistoryShortcut(key('z', { ctrlKey: true, shiftKey: true }))).toBe('redo');
    expect(getHistoryShortcut(key('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(getHistoryShortcut(key('y', { ctrlKey: true }))).toBe('redo');
  });

  it('ignores plain keys, Alt combos and other modified keys', () => {
    expect(getHistoryShortcut(key('z'))).toBeNull();
    expect(getHistoryShortcut(key('y'))).toBeNull();
    expect(getHistoryShortcut(key('z', { ctrlKey: true, altKey: true }))).toBeNull();
    expect(getHistoryShortcut(key('y', { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(getHistoryShortcut(key('y', { metaKey: true }))).toBeNull();
    expect(getHistoryShortcut(key('k', { ctrlKey: true }))).toBeNull();
  });
});
