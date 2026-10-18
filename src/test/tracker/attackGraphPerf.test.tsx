import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  GraphView,
  LARGE_GRAPH_NODE_COUNT,
  LOD_DOT_SCALE_THRESHOLD,
  isNodeCulled,
  nodeVisibility,
  computeShowAllLayout,
  SHOW_ALL_CELL_W,
  SHOW_ALL_CELL_H,
  ClusterTemplate,
} from '../../components/tracker/GraphView';
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

function makeMachines(count: number): Machine[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `perf-${i}`,
    name: `Perf${i}`,
    ip: `10.10.10.${i + 1}`,
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
  })) as Machine[];
}

// Varied machines so the real cluster templates spread them out
const VARIED_OS = ['Linux', 'Windows', 'Linux', 'Windows', 'Linux'];
const VARIED_DIFF = ['Easy', 'Medium', 'Hard', 'Insane', 'Very Easy'];
const VARIED_TAGS = [['web', 'sqli'], ['active directory'], ['rce', 'upload'], ['lfi'], ['privesc', 'suid'], ['kerberoast'], ['xss'], []];
function makeVariedMachines(count: number, prefix = 'snap'): Machine[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    name: `Snap${i}`,
    ip: i % 3 === 0 ? `10.10.11.${i}` : i % 3 === 1 ? `10.10.10.${i}` : `172.16.1.${i}`,
    os: VARIED_OS[i % 5],
    platform: i % 4 === 0 ? 'THM' : 'HTB',
    difficulty: VARIED_DIFF[i % 5],
    status: i % 7 === 0 ? 'root' : 'todo',
    tags: VARIED_TAGS[i % 8],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    openPorts: [22],
  })) as Machine[];
}

// Scoped (48 + overflow grid) default positions recorded from the layout before the SHOW ALL rework
const SCOPED_SNAPSHOT: Record<string, [number, number]> = {"snap-0":[747,121],"snap-1":[800,110],"snap-4":[853,121],"snap-5":[678,45],"snap-7":[754,15],"snap-10":[846,15],"snap-13":[922,45],"snap-15":[800,10],"snap-3":[1188,315],"snap-6":[1224,355],"snap-9":[1241,407],"snap-11":[1219,217],"snap-12":[1284,268],"snap-16":[1330,347],"snap-18":[1342,428],"snap-21":[1311,305],"snap-2":[1241,793],"snap-8":[1224,845],"snap-17":[1188,885],"snap-22":[1342,772],"snap-23":[1330,853],"snap-27":[1284,932],"snap-28":[1219,983],"snap-32":[1311,895],"snap-35":[853,1079],"snap-36":[800,1090],"snap-38":[747,1079],"snap-39":[922,1155],"snap-40":[846,1185],"snap-42":[754,1185],"snap-43":[678,1155],"snap-46":[800,1190],"snap-25":[412,885],"snap-29":[376,845],"snap-33":[359,793],"snap-37":[381,983],"snap-41":[316,932],"snap-45":[270,853],"snap-44":[258,772],"snap-47":[289,895],"snap-14":[359,407],"snap-19":[376,355],"snap-20":[412,315],"snap-24":[258,428],"snap-26":[270,347],"snap-30":[316,268],"snap-31":[381,217],"snap-34":[289,305],"snap-48":[120,140],"snap-49":[360,140],"snap-50":[600,140],"snap-51":[840,140],"snap-52":[1080,140],"snap-53":[1320,140],"snap-54":[120,250],"snap-55":[360,250],"snap-56":[600,250],"snap-57":[840,250],"snap-58":[1080,250],"snap-59":[1320,250]};

function cardCenters(container: HTMLElement): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  container.querySelectorAll('[data-node-id]').forEach((g) => {
    const r = g.querySelector('rect[width="180"][height="84"]')!;
    out.set(g.getAttribute('data-node-id')!, [Number(r.getAttribute('x')) + 90, Number(r.getAttribute('y')) + 42]);
  });
  return out;
}

function renderGraph(machines: Machine[]) {
  useCtfStore.setState({ machines, themePreset: 'zerobox' });
  return render(
    <MemoryRouter>
      <GraphView filteredMachines={machines} />
    </MemoryRouter>
  );
}

describe('Attack graph large-graph performance modes', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  it('keeps status-beacon pulses on small graphs', () => {
    const { container } = renderGraph(makeMachines(10));
    expect(container.querySelectorAll('[data-node-id] animate').length).toBeGreaterThan(0);
  });

  it('drops status-beacon pulses once the graph exceeds the large-graph threshold', () => {
    const machines = makeMachines(LARGE_GRAPH_NODE_COUNT + 10);
    const { container } = renderGraph(machines);
    fireEvent.click(screen.getByLabelText('Show all targets in topology graph'));
    expect(container.querySelectorAll('[data-node-id]').length).toBe(machines.length);
    expect(container.querySelectorAll('[data-node-id] animate').length).toBe(0);
  });

  it('renders compact cards below the LOD scale on large graphs and keeps every node interactive', () => {
    const machines = makeMachines(LARGE_GRAPH_NODE_COUNT + 10);
    const { container } = renderGraph(machines);
    fireEvent.click(screen.getByLabelText('Show all targets in topology graph'));

    // Full cards carry 4 docking anchors each
    expect(container.querySelectorAll('[data-node-id] circle[r="2.5"]').length).toBe(machines.length * 4);

    const zoomOut = screen.getByTestId('graph-zoom-out');
    for (let i = 0; i < 3; i++) {
      act(() => {
        fireEvent.click(zoomOut);
      });
    }

    expect(container.querySelectorAll('[data-node-id] circle[r="2.5"]').length).toBe(0);
    const card = screen.getByTestId('attack-node-perf-0');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.querySelector('rect[width="180"][height="84"]')).not.toBeNull();

    // Hovered node swaps to the full card
    fireEvent.mouseEnter(card);
    expect(card.querySelectorAll('circle[r="2.5"]').length).toBe(4);
  });

  it('does not cull cards when the container has no measurable size (jsdom)', () => {
    const machines = makeMachines(LARGE_GRAPH_NODE_COUNT + 10);
    const { container } = renderGraph(machines);
    fireEvent.click(screen.getByLabelText('Show all targets in topology graph'));
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('graph-zoom-in'));
      });
    }
    expect(container.querySelectorAll('[data-node-id]').length).toBe(machines.length);
  });

  it('commits an interrupted canvas pan on pointercancel so state and DOM transform match', () => {
    // rAF never fires: only a committed state change can move the viewport transform
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    try {
      const { container } = renderGraph(makeMachines(5));
      const root = container.firstChild as HTMLElement;
      const viewport = screen.getByTestId('canvas-viewport');

      act(() => {
        fireEvent.pointerDown(root, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
        fireEvent.pointerMove(root, { clientX: 150, clientY: 130, button: 0, pointerId: 1 });
      });
      expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');

      act(() => {
        fireEvent.pointerCancel(root, { pointerId: 1 });
      });
      expect(viewport.getAttribute('transform')).toBe('translate(50, 30) scale(1)');
      const rect = screen.getByTestId('minimap-viewport-rect');
      expect(rect.getAttribute('x')).toBe('-50');

      // Pan is over: further moves must not keep dragging
      act(() => {
        fireEvent.pointerMove(root, { clientX: 400, clientY: 400, button: 0, pointerId: 1 });
      });
      expect(viewport.getAttribute('transform')).toBe('translate(50, 30) scale(1)');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('truncates compact-card names so they stay inside the card', () => {
    const machines = makeMachines(LARGE_GRAPH_NODE_COUNT + 10);
    machines[0] = { ...machines[0], name: 'WWWWWWWWWWWWWWWW' };
    renderGraph(machines);
    fireEvent.click(screen.getByLabelText('Show all targets in topology graph'));
    for (let i = 0; i < 3; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId('graph-zoom-out'));
      });
    }
    const card = screen.getByTestId('attack-node-perf-0');
    expect(card.querySelector('text')?.textContent).toBe('WWWWWWWWW…');
  });

  it('never culls exempt (selected / hovered / focused / dragged) cards', () => {
    const rect = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    expect(isNodeCulled(null, 5000, 5000, false)).toBe(false);
    expect(isNodeCulled(rect, 50, 50, false)).toBe(false);
    expect(isNodeCulled(rect, 5000, 5000, false)).toBe(true);
    expect(isNodeCulled(rect, 5000, 5000, true)).toBe(false);
    // a card overlapping the rect edge is kept
    expect(isNodeCulled(rect, 189, 50, false)).toBe(false);
    expect(isNodeCulled(rect, 191, 50, false)).toBe(true);
  });

  it('nodeVisibility splits cards into culled / ring / visible and never culls exempt ones', () => {
    const outer = { minX: -1000, maxX: 2000, minY: -1000, maxY: 2000 };
    const inner = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
    expect(nodeVisibility(null, null, 9999, 9999, false)).toBe('visible');
    expect(nodeVisibility(outer, inner, 500, 500, false)).toBe('visible');
    // overlaps the visible rect edge by a few pixels -> still visible
    expect(nodeVisibility(outer, inner, 1085, 500, false)).toBe('visible');
    expect(nodeVisibility(outer, inner, 1100, 500, false)).toBe('ring');
    expect(nodeVisibility(outer, inner, -500, 500, false)).toBe('ring');
    expect(nodeVisibility(outer, inner, 5000, 500, false)).toBe('culled');
    expect(nodeVisibility(outer, inner, 5000, 5000, true)).toBe('visible');
    expect(nodeVisibility(outer, inner, -500, 500, true)).toBe('visible');
  });

  it('disables auto layout in SHOW ALL and keeps it enabled in the scoped view', () => {
    const machines = makeVariedMachines(70);
    renderGraph(machines);
    const btn = screen.getByTestId('graph-auto-layout') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('aria-disabled')).toBeNull();
    expect(btn.title).toContain('arrange nodes');

    fireEvent.click(screen.getByLabelText('Show all targets in topology graph'));
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.title).toBe('Auto layout is available in scoped view');
    const before = JSON.stringify(useCtfStore.getState().graphNodePositions);
    fireEvent.click(btn);
    expect(JSON.stringify(useCtfStore.getState().graphNodePositions)).toBe(before);

    fireEvent.click(screen.getByLabelText('Switch to scoped 48 targets'));
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('aria-disabled')).toBeNull();
  });

  describe('scoped / SHOW ALL position isolation', () => {
    const showAllBtn = () => screen.getByLabelText('Show all targets in topology graph');
    const scopedBtn = () => screen.getByLabelText('Switch to scoped 48 targets');

    it('keeps SHOW ALL drags out of the store and out of the scoped view', () => {
      const machines = makeVariedMachines(70);
      const { container } = renderGraph(machines);
      const storeBefore = JSON.stringify(useCtfStore.getState().graphNodePositions);
      const scopedBefore = cardCenters(container).get('snap-5')!;

      fireEvent.click(showAllBtn());
      const showAllBefore = cardCenters(container).get('snap-5')!;
      const card = screen.getByTestId('attack-node-snap-5');
      act(() => {
        fireEvent.pointerDown(card, { clientX: 200, clientY: 200, button: 0, pointerId: 1 });
        fireEvent.pointerMove(card, { clientX: 260, clientY: 240, button: 0, pointerId: 1 });
        fireEvent.pointerUp(card, { clientX: 260, clientY: 240, button: 0, pointerId: 1 });
      });
      const showAllAfter = cardCenters(container).get('snap-5')!;
      expect(showAllAfter).not.toEqual(showAllBefore);
      expect(JSON.stringify(useCtfStore.getState().graphNodePositions)).toBe(storeBefore);

      fireEvent.click(scopedBtn());
      const back = cardCenters(container).get('snap-5')!;
      expect(back).toEqual(scopedBefore);
      expect(back[0]).toBeGreaterThanOrEqual(0);
      expect(back[0]).toBeLessThanOrEqual(1600);
      expect(back[1]).toBeGreaterThanOrEqual(0);
      expect(back[1]).toBeLessThanOrEqual(1200);
      expect(JSON.stringify(useCtfStore.getState().graphNodePositions)).toBe(storeBefore);

      // and the local drag is gone: re-entering SHOW ALL shows the layout default again
      fireEvent.click(showAllBtn());
      expect(cardCenters(container).get('snap-5')).toEqual(showAllBefore);
    });

    it('ignores persisted scoped positions while SHOW ALL is on', () => {
      const machines = makeVariedMachines(70);
      const first = renderGraph(machines);
      fireEvent.click(showAllBtn());
      const layoutDefault = cardCenters(first.container).get('snap-5')!;
      cleanup();

      useCtfStore.getState().setGraphNodePosition('snap-5', { x: 333, y: 444 });
      const { container } = renderGraph(machines);
      expect(cardCenters(container).get('snap-5')).toEqual([333, 444]);

      fireEvent.click(showAllBtn());
      const inShowAll = cardCenters(container).get('snap-5')!;
      expect(inShowAll).toEqual(layoutDefault);
      expect(inShowAll).not.toEqual([333, 444]);

      fireEvent.click(scopedBtn());
      expect(cardCenters(container).get('snap-5')).toEqual([333, 444]);
    });
  });

  it('keeps the scoped layout positions identical to the pre-rework snapshot', () => {
    const machines = makeVariedMachines(60);
    const { container } = renderGraph(machines);
    const centers = cardCenters(container);
    expect(centers.size).toBe(60);
    for (const [id, pos] of Object.entries(SCOPED_SNAPSHOT)) {
      expect(centers.get(id)).toEqual(pos);
    }
  });

  describe('SHOW ALL packed layout', () => {
    const templates: ClusterTemplate[] = [
      { id: 'a', name: 'A', color: '#111111', matcher: (m) => m.os === 'Windows' },
      { id: 'b', name: 'B', color: '#222222', matcher: (m) => m.platform === 'THM' },
      { id: 'c', name: 'C', color: '#333333', matcher: () => true },
    ];

    it('places all 929 machines on unique, non-overlapping cells with deterministic output', () => {
      const machines = makeVariedMachines(929);
      const layout = computeShowAllLayout(machines, templates);
      const ids = Object.keys(layout.positions);
      expect(ids.length).toBe(929);

      const keys = new Set(ids.map((id) => `${layout.positions[id].x},${layout.positions[id].y}`));
      expect(keys.size).toBe(929);

      // Grid check: bucket by cell, then confirm 180x84 cards never intersect
      const rects = ids.map((id) => ({ x: layout.positions[id].x - 90, y: layout.positions[id].y - 42 }));
      const cells = new Map<string, number[]>();
      rects.forEach((r, i) => {
        const k = `${Math.floor(r.x / SHOW_ALL_CELL_W)},${Math.floor(r.y / SHOW_ALL_CELL_H)}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k)!.push(i);
      });
      let overlaps = 0;
      rects.forEach((a, i) => {
        const cx = Math.floor(a.x / SHOW_ALL_CELL_W);
        const cy = Math.floor(a.y / SHOW_ALL_CELL_H);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (const j of cells.get(`${cx + dx},${cy + dy}`) ?? []) {
              if (j <= i) continue;
              const b = rects[j];
              if (a.x < b.x + 180 && b.x < a.x + 180 && a.y < b.y + 84 && b.y < a.y + 84) overlaps++;
            }
          }
        }
      });
      expect(overlaps).toBe(0);

      // Every card sits inside the reported bounds; output is deterministic
      ids.forEach((id) => {
        const p = layout.positions[id];
        expect(p.x - 90).toBeGreaterThanOrEqual(layout.bounds.minX);
        expect(p.x + 90).toBeLessThanOrEqual(layout.bounds.maxX);
        expect(p.y - 42).toBeGreaterThanOrEqual(layout.bounds.minY);
        expect(p.y + 42).toBeLessThanOrEqual(layout.bounds.maxY);
      });
      expect(computeShowAllLayout(machines, templates)).toEqual(layout);
    });

    it('keeps cluster blocks apart from each other and from the operator rig', () => {
      const machines = makeVariedMachines(929);
      const layout = computeShowAllLayout(machines, templates);
      const boxes = layout.clusters.map((c) => {
        const pts = machines.filter((m) => layout.clusterOf[m.id] === c.id).map((m) => layout.positions[m.id]);
        return {
          l: Math.min(...pts.map((p) => p.x)) - 90,
          r: Math.max(...pts.map((p) => p.x)) + 90,
          t: Math.min(...pts.map((p) => p.y)) - 42,
          b: Math.max(...pts.map((p) => p.y)) + 42,
        };
      });
      let violations = 0;
      for (let i = 0; i < boxes.length; i++) {
        // rig occupies roughly 800,600 +- (130, 100)
        if (!(boxes[i].r < 670 || boxes[i].l > 930 || boxes[i].b < 500 || boxes[i].t > 700)) violations++;
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          if (!(a.r < b.l || b.r < a.l || a.b < b.t || b.b < a.t)) violations++;
        }
      }
      expect(violations).toBe(0);
      // Hub positions are explicit (not derived from angle/radius)
      layout.clusters.forEach((c) => {
        expect(typeof c.x).toBe('number');
        expect(typeof c.y).toBe('number');
      });
    });

    it('SHOW ALL in the component: unique cards, fit-to-world, dot tier, minimap viewBox, restore on exit', () => {
      const machines = makeVariedMachines(929);
      const { container } = renderGraph(machines);
      const viewport = screen.getByTestId('canvas-viewport');
      expect(screen.getByTestId('graph-minimap-svg').getAttribute('viewBox')).toBe('0 0 1600 1200');

      // Move the scoped view first so exit-restore is observable
      act(() => {
        fireEvent.click(screen.getByTestId('graph-zoom-in'));
      });
      const scopedTransform = viewport.getAttribute('transform');
      expect(scopedTransform).toContain('scale(1.2)');

      fireEvent.click(screen.getByLabelText('Show all targets in topology graph'));

      const centers = cardCenters(container);
      expect(centers.size).toBe(929);
      expect(new Set([...centers.values()].map((p) => p.join(','))).size).toBe(929);

      // Fitted: the whole world is zoomed out far below 0.3 -> dot tier (bare rects, no text)
      const scaleMatch = viewport.getAttribute('transform')!.match(/scale\(([0-9.e-]+)\)/)!;
      expect(parseFloat(scaleMatch[1])).toBeLessThan(LOD_DOT_SCALE_THRESHOLD);
      const card = screen.getByTestId('attack-node-snap-5');
      expect(card.querySelector('text')).toBeNull();
      expect(card.querySelector('rect[width="180"][height="84"]')).not.toBeNull();
      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('aria-label')).toBe('Target machine Snap5');

      // Minimap shows the whole (larger) world
      expect(screen.getByTestId('graph-minimap-svg').getAttribute('viewBox')).not.toBe('0 0 1600 1200');

      // Hover and focus swap to the full card
      fireEvent.mouseEnter(card);
      expect(card.querySelectorAll('circle[r="2.5"]').length).toBe(4);
      fireEvent.mouseLeave(card);
      expect(card.querySelectorAll('circle[r="2.5"]').length).toBe(0);
      const other = screen.getByTestId('attack-node-snap-6');
      act(() => {
        fireEvent.focus(other);
      });
      expect(other.querySelectorAll('circle[r="2.5"]').length).toBe(4);

      // Back to scoped: previous scoped view is restored
      fireEvent.click(screen.getByLabelText('Switch to scoped 48 targets'));
      expect(viewport.getAttribute('transform')).toBe(scopedTransform);
      expect(screen.getByTestId('graph-minimap-svg').getAttribute('viewBox')).toBe('0 0 1600 1200');
    });
  });
});
