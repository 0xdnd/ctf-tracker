import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphView } from '../../components/tracker/GraphView';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine } from '../../types';
import { expandHubContaining, hubButtons, hubDotIds } from './graphHubTestUtils';
import {
  COLLAPSE_MIN_MACHINES,
  computeHubBlock,
  hubFootprint,
  hubRingRadius,
  rigFootprint,
  hubTextScale,
  portraitHubPosition,
  portraitRowBounds,
  computePortraitBlock,
} from '../../components/tracker/graph/hubLayout';
import { fitBoundsToSafeArea } from '../../components/tracker/graph/safeArea';
import { getClusterHub } from '../../components/tracker/graph/layout';
import type { WorldBounds } from '../../components/tracker/graph/types';

const boundsOverlap = (a: WorldBounds, b: WorldBounds, margin = 0): boolean =>
  a.minX < b.maxX + margin && b.minX < a.maxX + margin && a.minY < b.maxY + margin && b.minY < a.maxY + margin;

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

const machine = (i: number, over: Partial<Machine> = {}): Machine => ({
  id: `m${i}`,
  name: `Host${i}`,
  ip: `10.10.10.${(i % 250) + 1}`,
  os: i % 2 === 0 ? 'Linux' : 'Windows',
  platform: 'HTB',
  difficulty: 'Easy',
  status: i % 5 === 0 ? 'root' : i % 5 === 1 ? 'foothold' : 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const seed = (count: number) =>
  useCtfStore.setState({ machines: Array.from({ length: count }, (_, i) => machine(i)), themePreset: 'zerobox' });

const renderGraph = (filter?: (m: Machine) => boolean) => {
  const all = useCtfStore.getState().machines;
  return render(
    <MemoryRouter>
      <GraphView filteredMachines={filter ? all.filter(filter) : all} />
    </MemoryRouter>
  );
};

const cardIds = () =>
  Array.from(document.querySelectorAll('[data-node-id]')).map((e) => e.getAttribute('data-node-id') as string);

describe('collapsed subnet hubs', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    seed(48);
  });
  afterEach(() => cleanup());

  it('starts with every hub collapsed: count badge and one status dot per machine, no cards', () => {
    renderGraph();
    expect(cardIds()).toHaveLength(0);
    const hubs = hubButtons();
    expect(hubs.length).toBeGreaterThan(1);
    expect(hubDotIds()).toHaveLength(48);
    hubs.forEach((h) => expect(h).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.getAllByText('8 machines').length).toBe(hubs.length);
  });

  it('keeps small graphs fully drawn (nothing to declutter)', () => {
    seed(COLLAPSE_MIN_MACHINES);
    renderGraph();
    expect(hubButtons()).toHaveLength(0);
    expect(cardIds()).toHaveLength(COLLAPSE_MIN_MACHINES);
  });

  it('switches mode exactly at the threshold: 12 machines drawn, 13 folded into hubs', () => {
    seed(COLLAPSE_MIN_MACHINES);
    const first = renderGraph();
    expect(hubButtons()).toHaveLength(0);
    expect(cardIds()).toHaveLength(12);
    first.unmount();

    seed(COLLAPSE_MIN_MACHINES + 1);
    renderGraph();
    expect(hubButtons().length).toBeGreaterThan(0);
    expect(cardIds()).toHaveLength(0);
    expect(hubDotIds()).toHaveLength(13);
  });

  it('expands a hub on click and shows only its machines as cards; another hub folds the first', () => {
    renderGraph();
    const [first, second] = hubButtons();
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    const firstCards = cardIds();
    expect(firstCards).toHaveLength(8);
    // the open hub shows no dots (the cards carry the status)
    expect(hubDotIds()).toHaveLength(40);

    fireEvent.click(hubButtons()[1]);
    expect(hubButtons()[0]).toHaveAttribute('aria-expanded', 'false');
    expect(hubButtons()[1]).toHaveAttribute('aria-expanded', 'true');
    const secondCards = cardIds();
    expect(secondCards).toHaveLength(8);
    expect(secondCards.some((id) => firstCards.includes(id))).toBe(false);
    expect(second).toBeDefined();
  });

  it('opens and closes a hub from the keyboard (Enter and Space)', () => {
    renderGraph();
    const hub = hubButtons()[0];
    fireEvent.keyDown(hub, { key: 'Enter' });
    expect(cardIds()).toHaveLength(8);
    fireEvent.keyDown(hubButtons()[0], { key: ' ' });
    expect(cardIds()).toHaveLength(0);
    expect(hub.getAttribute('role')).toBe('button');
    expect(hub.getAttribute('tabindex')).toBe('0');
  });

  it('collapses with the HUD Collapse control and with Escape', () => {
    renderGraph();
    fireEvent.click(hubButtons()[0]);
    fireEvent.click(screen.getByTestId('graph-hub-collapse'));
    expect(cardIds()).toHaveLength(0);
    expect(screen.queryByTestId('graph-hub-collapse')).toBeNull();

    fireEvent.click(hubButtons()[2]);
    expect(cardIds()).toHaveLength(8);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cardIds()).toHaveLength(0);
  });

  it('closes the machine flyout when its hub folds or another hub opens', async () => {
    renderGraph();
    fireEvent.click(expandHubContaining('m3'));
    expect(screen.getByTestId('flyout-close-btn')).toBeInTheDocument();
    // opening another hub folds the one that owns the selected machine
    const other = hubButtons().find((h) => !h.querySelector('[data-hub-dot="m3"]') && h.getAttribute('aria-expanded') === 'false')!;
    fireEvent.click(other);
    await waitFor(() => expect(screen.queryByTestId('flyout-close-btn')).toBeNull());

    fireEvent.click(expandHubContaining('m3'));
    expect(screen.getByTestId('flyout-close-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('graph-hub-collapse'));
    await waitFor(() => expect(screen.queryByTestId('flyout-close-btn')).toBeNull());
  });

  it('puts keyboard focus on the hub after it folds (Escape, Collapse chip, hub toggle)', () => {
    renderGraph();
    const hubId = (i: number) => hubButtons()[i].getAttribute('data-testid') as string;

    // open from the keyboard: focus stays on the hub, not on a card that just mounted
    fireEvent.keyDown(hubButtons()[1], { key: 'Enter' });
    expect(document.activeElement).toBe(hubButtons()[1]);

    // Escape folds it and focus returns to that hub
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cardIds()).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByTestId(hubId(1)));

    // HUD Collapse chip
    fireEvent.click(hubButtons()[2]);
    (document.activeElement as HTMLElement).blur();
    fireEvent.click(screen.getByTestId('graph-hub-collapse'));
    expect(document.activeElement).toBe(screen.getByTestId(hubId(2)));

    // toggling the open hub folds it, focus stays on it
    fireEvent.keyDown(hubButtons()[0], { key: ' ' });
    fireEvent.keyDown(hubButtons()[0], { key: ' ' });
    expect(cardIds()).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByTestId(hubId(0)));
  });

  it('Escape inside a field, or with a modal open, leaves the hub open', () => {
    renderGraph();
    fireEvent.click(hubButtons()[0]);
    expect(cardIds()).toHaveLength(8);

    // the search box owns Escape (it clears itself)
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(cardIds()).toHaveLength(8);
    input.remove();

    // a modal / popup that marks itself as open keeps the key
    const modal = document.createElement('div');
    modal.setAttribute('data-escape-open', 'true');
    document.body.appendChild(modal);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cardIds()).toHaveLength(8);
    modal.remove();

    // a handler that already consumed the key
    const consumed = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    consumed.preventDefault();
    window.dispatchEvent(consumed);
    expect(cardIds()).toHaveLength(8);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cardIds()).toHaveLength(0);
  });

  it('Escape closes the machine flyout first and the open hub on the next press', async () => {
    renderGraph();
    fireEvent.click(expandHubContaining('m3'));
    expect(screen.getByTestId('flyout-close-btn')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('flyout-close-btn')).toBeNull());
    expect(cardIds()).toHaveLength(8);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cardIds()).toHaveLength(0);
  });

  it('never rewrites saved positions when hubs fold and unfold', () => {
    useCtfStore.getState().setGraphNodePosition('m3', { x: 123, y: 456 });
    const before = JSON.stringify(useCtfStore.getState().graphNodePositions);
    const { container } = renderGraph();
    // folded: the saved machine is not drawn, but its position stays in the store
    expect(container.querySelector('[data-node-id="m3"]')).toBeNull();
    expect(JSON.stringify(useCtfStore.getState().graphNodePositions)).toBe(before);

    expandHubContaining('m3');
    const rect = container.querySelector('[data-node-id="m3"] rect[width="180"]')!;
    // an expanded card honours its saved position
    expect([Number(rect.getAttribute('x')) + 90, Number(rect.getAttribute('y')) + 42]).toEqual([123, 456]);
    fireEvent.click(screen.getByTestId('graph-hub-collapse'));
    expect(JSON.stringify(useCtfStore.getState().graphNodePositions)).toBe(before);
  });

  it('keeps drawing links: both ends open, one end folded (docks on the hub), both folded in one hub (hidden)', () => {
    const edgeId = useCtfStore.getState().addGraphEdge({ sourceId: 'm3', targetId: 'm4', type: 'pivot-ssh', status: 'potential' }).id;
    renderGraph();
    // both ends folded: m3 and m4 may share a hub, or sit in two
    const owners = (id: string) => hubButtons().findIndex((h) => h.querySelector(`[data-hub-dot="${id}"]`));
    const sameHub = owners('m3') === owners('m4');
    expect(!!screen.queryByTestId(`attack-edge-${edgeId}`)).toBe(!sameHub);

    expandHubContaining('m3');
    // an open card with a folded partner (or both open when they share the hub) still draws the link
    expect(screen.getByTestId(`attack-edge-${edgeId}`)).toBeInTheDocument();
  });

  it('auto-opens the only hub with filter matches', () => {
    renderGraph((m) => m.id === 'm3');
    expect(cardIds()).toEqual(['m3']);
    const open = hubButtons().filter((h) => h.getAttribute('aria-expanded') === 'true');
    expect(open).toHaveLength(1);
    // the user can still fold it
    fireEvent.keyDown(window, { key: 'Escape' });
    // first Escape closes nothing selected, so the hub folds
    expect(cardIds()).toHaveLength(0);
  });

  it('highlights hubs with their match counts when matches span several hubs', () => {
    renderGraph((m) => Number(m.id.slice(1)) < 12);
    expect(cardIds()).toHaveLength(0);
    const labels = hubButtons().map((h) => h.getAttribute('aria-label') ?? '');
    expect(labels.some((l) => /\d+ of 8 match/.test(l))).toBe(true);
    expect(screen.getAllByText(/\d+ of 8 match/).length).toBeGreaterThan(1);
  });

  it('SHOW ALL keeps every card drawn with no collapsible hubs', () => {
    seed(60);
    renderGraph();
    fireEvent.click(screen.getByLabelText('Group all by subnet'));
    expect(hubButtons()).toHaveLength(0);
    expect(cardIds()).toHaveLength(60);
  });
});

describe('machine flyout Escape', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    seed(6);
  });
  afterEach(() => cleanup());

  it('closes the flyout when a selected machine is open and Escape is pressed', async () => {
    renderGraph();
    fireEvent.click(screen.getByTestId('attack-node-m2'));
    expect(screen.getByTestId('flyout-close-btn')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('flyout-close-btn')).toBeNull());
  });

  it('also closes it when Escape fires from the focused card', async () => {
    renderGraph();
    const card = screen.getByTestId('attack-node-m2');
    fireEvent.click(card);
    card.focus();
    fireEvent.keyDown(card, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('flyout-close-btn')).toBeNull());
  });
});

describe('mobile HUD summary', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    seed(48);
  });
  afterEach(() => cleanup());

  it('shows one summary pill whose details open on tap', () => {
    renderGraph();
    const pill = screen.getByTestId('graph-hud-summary');
    expect(pill).toHaveTextContent(/^48 machines · \d+ subnets?$/);
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('graph-hud-details')).toBeNull();
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('graph-hud-details')).toHaveTextContent('48 of 48 machines');
  });
});

describe('hub layout geometry', () => {
  const hubs = Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
    return { angle, pos: getClusterHub({ id: String(i), name: '', angle, radius: 300, color: '' }) };
  });

  it('never overlaps two cards inside an expanded hub block', () => {
    for (const cols of [4, 2]) {
      for (const count of [1, 3, 8, 14]) {
        for (const h of hubs) {
          const { positions } = computeHubBlock(h.pos, h.angle, count, cols);
          for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
              const dx = Math.abs(positions[i].x - positions[j].x);
              const dy = Math.abs(positions[i].y - positions[j].y);
              expect(dx >= 180 || dy >= 84).toBe(true);
            }
          }
        }
      }
    }
  });

  it('keeps all 6 collapsed hubs mutually disjoint at hubRingRadius across scaled viewports and preserves base radius at k=1', () => {
    expect(hubRingRadius(1)).toBe(300);
    for (const text of [1.4, 1.9, 2.1, 2.4]) {
      const r = hubRingRadius(text);
      const ring = Array.from({ length: 6 }, (_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        return hubFootprint(getClusterHub({ id: String(i), name: '', angle, radius: r, color: '' }), text);
      });
      for (let i = 0; i < ring.length; i++) {
        for (let j = i + 1; j < ring.length; j++) {
          expect(boundsOverlap(ring[i], ring[j])).toBe(false);
        }
      }
    }
  });

  it('keeps an expanded block clear of the rig and of every collapsed hub (own hub and neighbours)', () => {
    for (const cols of [4, 2]) {
      for (const text of [1, 1.4, 1.9]) {
        hubs.forEach((h) => {
          const { box } = computeHubBlock(h.pos, h.angle, 8, cols, text);
          expect(boundsOverlap(box, rigFootprint())).toBe(false);
          hubs.forEach((other) => {
            expect(boundsOverlap(box, hubFootprint(other.pos, text))).toBe(false);
          });
        });
      }
    }
  });

  it('frames content inside the safe area and prefers the larger of the two corner clearances', () => {
    const size = { w: 940, h: 720 };
    const insets = { top: 80, right: 80, bottom: 16, left: 16, corner: { width: 400, height: 210 } };
    const bounds = { minX: 400, maxX: 1200, minY: 240, maxY: 1010 };
    const r = fitBoundsToSafeArea(bounds, size, insets, { minScale: 0.2, maxScale: 1.8 });
    const a = Math.min(size.w / 1600, size.h / 1200);
    const ox = (size.w - 1600 * a) / 2;
    const oy = (size.h - 1200 * a) / 2;
    const toPx = (x: number, y: number) => ({ x: (r.x + x * r.scale) * a + ox, y: (r.y + y * r.scale) * a + oy });
    const tl = toPx(bounds.minX, bounds.minY);
    const br = toPx(bounds.maxX, bounds.maxY);
    expect(tl.y).toBeGreaterThanOrEqual(80 - 0.5);
    expect(br.x).toBeLessThanOrEqual(size.w - 80 + 0.5);
    // clear of the corner block either above it or to its right
    expect(br.y <= size.h - 210 + 0.5 || tl.x >= 400 - 0.5).toBe(true);
  });

  it('phone portrait: hub rows never overlap, and an open hub stacks its cards below its row', () => {
    const rows = Array.from({ length: 6 }, (_, i) => portraitHubPosition(i));
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i].x).toBe(800);
      for (let j = i + 1; j < rows.length; j++) {
        expect(boundsOverlap(portraitRowBounds(rows[i]), portraitRowBounds(rows[j]))).toBe(false);
      }
      // clear of the rig label
      expect(boundsOverlap(portraitRowBounds(rows[i]), { minX: 715, maxX: 885, minY: 636, maxY: 676 })).toBe(false);
      const { positions, box } = computePortraitBlock(rows[i], 8);
      expect(positions).toHaveLength(8);
      expect(box.minY).toBeGreaterThanOrEqual(portraitRowBounds(rows[i]).maxY);
      positions.forEach((p, k) => {
        if (k > 0) expect(p.y - positions[k - 1].y).toBeGreaterThanOrEqual(84);
        expect(p.x).toBe(positions[0].x);
      });
    }
  });

  it('phone portrait fit keeps the readable zoom floor and the top of a tall column in view', () => {
    const size = { w: 349, h: 718 };
    const a = Math.min(size.w / 1600, size.h / 1200);
    const floor = 0.8 / a;
    const insets = { top: 80, right: 90, bottom: 16, left: 16 };
    const tall = { minX: 766, maxX: 1044, minY: 770, maxY: 1700 };
    const r = fitBoundsToSafeArea(tall, size, insets, { minScale: floor, maxScale: 5, anchorTop: true });
    expect(r.scale).toBeCloseTo(floor, 5);
    // the top of the content sits at the top inset (px), the rest pans
    const oy = (size.h - 1200 * a) / 2;
    expect((r.y + tall.minY * r.scale) * a + oy).toBeCloseTo(80, 3);
    // a column that fits is centred and may zoom above the floor
    const short = { minX: 766, maxX: 1044, minY: 540, maxY: 1000 };
    const fits = fitBoundsToSafeArea(short, size, insets, { minScale: floor, maxScale: 5, anchorTop: true });
    expect(fits.scale).toBeGreaterThanOrEqual(floor);
  });

  it('enlarges collapsed-hub text more on small canvases', () => {
    expect(hubTextScale(null)).toBe(1);
    // The overview fits at ~0.7 of the canvas basis, so even the full basis needs a small boost to reach 12px.
    expect(hubTextScale({ w: 1600, h: 1200 })).toBeLessThanOrEqual(1.3);
    expect(hubTextScale({ w: 942, h: 718 })).toBeGreaterThan(1);
    expect(hubTextScale({ w: 349, h: 718 })).toBeGreaterThan(hubTextScale({ w: 942, h: 718 }));
  });
});
