import { describe, it, expect } from 'vitest';
import { computeAutoLayout, AUTO_LAYOUT_DEFAULTS } from './graphAutoLayout';

const e = (sourceId: string, targetId: string) => ({ sourceId, targetId });
const { nodeWidth: W, nodeHeight: H } = AUTO_LAYOUT_DEFAULTS;

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }, w = W, h = H): boolean {
  return Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < h;
}

function assertNoOverlap(layout: Record<string, { x: number; y: number }>, w = W, h = H) {
  const ids = Object.keys(layout);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (overlaps(layout[ids[i]], layout[ids[j]], w, h)) {
        throw new Error(`nodes ${ids[i]} and ${ids[j]} overlap: ${JSON.stringify([layout[ids[i]], layout[ids[j]]])}`);
      }
    }
  }
}

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('computeAutoLayout', () => {
  it('returns an empty layout for no nodes', () => {
    expect(computeAutoLayout([], [])).toEqual({});
    expect(computeAutoLayout([], [e('a', 'b')])).toEqual({});
  });

  it('puts a chain A -> B -> C in strictly increasing x layers', () => {
    const l = computeAutoLayout(['C', 'A', 'B'], [e('A', 'B'), e('B', 'C')]);
    expect(l.A.x).toBeLessThan(l.B.x);
    expect(l.B.x).toBeLessThan(l.C.x);
    // card width + gap between layers, so cards never touch
    expect(l.B.x - l.A.x).toBeGreaterThanOrEqual(W);
    expect(l.A.y).toBe(l.B.y);
    expect(l.B.y).toBe(l.C.y);
  });

  it('uses longest-path layering (A->B->C plus A->C keeps C after B)', () => {
    const l = computeAutoLayout(['A', 'B', 'C'], [e('A', 'B'), e('B', 'C'), e('A', 'C')]);
    expect(l.C.x).toBeGreaterThan(l.B.x);
    expect(l.B.x).toBeGreaterThan(l.A.x);
  });

  it('gives nodes in the same layer the same x and distinct y without overlap', () => {
    const l = computeAutoLayout(['A', 'B', 'C', 'D'], [e('A', 'B'), e('A', 'C'), e('A', 'D')]);
    expect(l.B.x).toBe(l.C.x);
    expect(l.C.x).toBe(l.D.x);
    const ys = [l.B.y, l.C.y, l.D.y];
    expect(new Set(ys).size).toBe(3);
    assertNoOverlap(l);
    // parent is vertically centered between its children
    expect(l.A.y).toBe(Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) / 2);
  });

  it('places every source (no incoming edge) in layer 0', () => {
    const l = computeAutoLayout(['S1', 'S2', 'M', 'T'], [e('S1', 'M'), e('S2', 'M'), e('M', 'T')]);
    expect(l.S1.x).toBe(AUTO_LAYOUT_DEFAULTS.originX);
    expect(l.S2.x).toBe(AUTO_LAYOUT_DEFAULTS.originX);
    expect(l.M.x).toBeGreaterThan(l.S1.x);
    // join node sits between its two parents
    expect(l.M.y).toBe((l.S1.y + l.S2.y) / 2);
  });

  it('keeps independent chains on separate, straight rows', () => {
    const l = computeAutoLayout(
      ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'],
      [e('A1', 'A2'), e('B1', 'B2'), e('A2', 'A3'), e('B2', 'B3')]
    );
    expect(l.A1.y).toBe(l.A2.y);
    expect(l.A2.y).toBe(l.A3.y);
    expect(l.B1.y).toBe(l.B2.y);
    expect(l.B2.y).toBe(l.B3.y);
    expect(l.A1.y).not.toBe(l.B1.y);
  });

  it('terminates on cycles and still places every node on a distinct slot', () => {
    const ids = ['A', 'B', 'C', 'D'];
    const l = computeAutoLayout(ids, [e('A', 'B'), e('B', 'C'), e('C', 'A'), e('C', 'D'), e('D', 'B')]);
    expect(Object.keys(l).sort()).toEqual(ids);
    assertNoOverlap(l);
    for (const p of Object.values(l)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    // the cycle is flattened into left-to-right layers: A (entry) stays leftmost
    expect(l.A.x).toBeLessThan(l.B.x);
  });

  it('handles mutual edges, self loops, duplicate edges and unknown endpoints', () => {
    const l = computeAutoLayout(
      ['A', 'B', 'C'],
      [e('A', 'B'), e('B', 'A'), e('A', 'A'), e('A', 'B'), e('B', 'ghost'), e('ghost', 'C')]
    );
    expect(Object.keys(l).sort()).toEqual(['A', 'B', 'C']);
    expect(l.A.x).not.toBe(l.B.x);
    // C only touched an unknown node, so it is disconnected and goes to the grid below
    expect(l.C.y).toBeGreaterThan(Math.max(l.A.y, l.B.y));
  });

  it('handles a pure cycle with no source node', () => {
    const l = computeAutoLayout(['A', 'B', 'C'], [e('A', 'B'), e('B', 'C'), e('C', 'A')]);
    expect(l.A.x).toBeLessThan(l.B.x);
    expect(l.B.x).toBeLessThan(l.C.x);
  });

  it('places disconnected nodes in a grid below the layered nodes', () => {
    const ids = ['A', 'B', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7'];
    const l = computeAutoLayout(ids, [e('A', 'B')]);
    const connectedBottom = Math.max(l.A.y, l.B.y);
    const isolated = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7'];
    for (const id of isolated) expect(l[id].y).toBeGreaterThan(connectedBottom + H - 1);
    expect(Object.keys(l)).toHaveLength(ids.length);
    assertNoOverlap(l);
    // 6 columns then wraps to a second row
    expect(l.x1.y).toBe(l.x6.y);
    expect(l.x7.y).toBeGreaterThan(l.x1.y);
    expect(l.x7.x).toBe(l.x1.x);
  });

  it('lays out a graph with no edges as a grid starting at the origin', () => {
    const l = computeAutoLayout(['a', 'b', 'c'], []);
    expect(l.a).toEqual({ x: AUTO_LAYOUT_DEFAULTS.originX, y: AUTO_LAYOUT_DEFAULTS.originY });
    expect(l.b.y).toBe(l.a.y);
    expect(l.c.y).toBe(l.a.y);
    expect(new Set([l.a.x, l.b.x, l.c.x]).size).toBe(3);
  });

  it('ignores duplicate node ids', () => {
    const l = computeAutoLayout(['a', 'a', 'b'], [e('a', 'b')]);
    expect(Object.keys(l).sort()).toEqual(['a', 'b']);
  });

  it('is deterministic and does not mutate its inputs', () => {
    const ids = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
    const edges = [e('n1', 'n2'), e('n1', 'n3'), e('n3', 'n4'), e('n2', 'n4'), e('n4', 'n1'), e('n5', 'n6')];
    const idsCopy = [...ids];
    const edgesCopy = edges.map((x) => ({ ...x }));
    const first = computeAutoLayout(ids, edges);
    const second = computeAutoLayout(ids, edges);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(ids).toEqual(idsCopy);
    expect(edges).toEqual(edgesCopy);
  });

  it('only returns integer coordinates', () => {
    const l = computeAutoLayout(['A', 'B', 'C', 'D', 'E'], [e('A', 'B'), e('A', 'C'), e('A', 'D'), e('B', 'E')]);
    for (const p of Object.values(l)) {
      expect(Number.isInteger(p.x)).toBe(true);
      expect(Number.isInteger(p.y)).toBe(true);
    }
  });

  it('honours custom node size, gaps and origin', () => {
    const l = computeAutoLayout(['A', 'B'], [e('A', 'B')], {
      nodeWidth: 100,
      nodeHeight: 50,
      gapX: 20,
      gapY: 10,
      originX: 10,
      originY: 20,
    });
    expect(l.A).toEqual({ x: 10, y: 20 });
    expect(l.B).toEqual({ x: 130, y: 20 });
  });

  it('compresses layer spacing to fit maxX', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `n${i}`);
    const edges = ids.slice(1).map((id, i) => e(ids[i], id));
    const natural = computeAutoLayout(ids, edges);
    const fitted = computeAutoLayout(ids, edges, { maxX: 1510 });
    expect(natural.n6.x).toBeGreaterThan(1510);
    expect(fitted.n6.x).toBeLessThanOrEqual(1510);
    assertNoOverlap(fitted);
  });

  it('never shrinks layer spacing below card width + clearance, even if maxX cannot be met', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `n${i}`);
    const edges = ids.slice(1).map((id, i) => e(ids[i], id));
    const fitted = computeAutoLayout(ids, edges, { maxX: 1510 });
    assertNoOverlap(fitted);
    for (let i = 1; i < ids.length; i++) {
      expect(fitted[ids[i]].x - fitted[ids[i - 1]].x).toBe(W + 16);
    }
  });

  it('compresses row spacing to fit maxY but never lets cards overlap', () => {
    const ids = ['root', ...Array.from({ length: 14 }, (_, i) => `leaf${i}`)];
    const edges = ids.slice(1).map((id) => e('root', id));
    const fitted = computeAutoLayout(ids, edges, { maxY: 1150 });
    assertNoOverlap(fitted);
    const ys = Object.values(fitted).map((p) => p.y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(AUTO_LAYOUT_DEFAULTS.originY);
  });

  it('stays finite, overlap-free and complete on a large random cyclic graph', () => {
    const rand = seededRandom(1337);
    const ids = Array.from({ length: 60 }, (_, i) => `m${i}`);
    const edges = Array.from({ length: 110 }, () => e(ids[Math.floor(rand() * 60)], ids[Math.floor(rand() * 60)]));
    const l = computeAutoLayout(ids, edges, { maxX: 1510, maxY: 1150 });
    expect(Object.keys(l)).toHaveLength(60);
    assertNoOverlap(l);
    for (const p of Object.values(l)) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
    expect(computeAutoLayout(ids, edges, { maxX: 1510, maxY: 1150 })).toEqual(l);
  });

  it('copes with a long chain without recursion limits', () => {
    const ids = Array.from({ length: 5000 }, (_, i) => `c${i}`);
    const edges = ids.slice(1).map((id, i) => e(ids[i], id));
    const l = computeAutoLayout(ids, edges);
    expect(l.c4999.x).toBeGreaterThan(l.c0.x);
    expect(Object.keys(l)).toHaveLength(5000);
  });
});
