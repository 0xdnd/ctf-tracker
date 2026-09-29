import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { 
  GraphView, 
  computeCanvasDelta,
  GraphNode,
  getCanvasThemeTokens 
} from '../../components/tracker/GraphView';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine } from '../../types';

// Mock window.matchMedia for headless JSDOM environment
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

function createTestMachine(id: string, name: string, ip: string, x?: number, y?: number): Machine {
  return {
    id,
    name,
    ip,
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
  };
}

describe('Challenger M2 Stress Harness: Canvas Engine & Mathematical Invariants', () => {
  const baseMachines: Machine[] = [
    createTestMachine('node-alpha', 'AlphaHost', '10.10.10.1'),
    createTestMachine('node-beta', 'BetaHost', '10.10.10.2'),
    createTestMachine('node-gamma', 'GammaHost', '10.10.10.3'),
  ];

  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ machines: baseMachines, themePreset: 'zerobox' });
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  // ---------------------------------------------------------------------------
  // 1. Extreme Zoom Bounds & Clamping Stress
  // ---------------------------------------------------------------------------
  describe('1. Extreme Zoom Bounds & Clamping', () => {
    it('empirical evaluation of zoom in clamping bound with sequential flushes', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const zoomInBtn = screen.getByTestId('graph-zoom-in');

      // Click Zoom In sequentially with act flushes between clicks
      for (let i = 0; i < 20; i++) {
        act(() => {
          fireEvent.click(zoomInBtn);
        });
      }

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      expect(transform).not.toBeNull();

      const match = transform?.match(/scale\(([0-9.]+)\)/);
      expect(match).not.toBeNull();
      const currentScale = parseFloat(match![1]);

      // EMPIRICAL FINDING: Clamped at 3.0x max bound
      expect(currentScale).toBe(3);
      expect(screen.getByText('300%')).toBeInTheDocument();
    });

    it('empirical evaluation of zoom out clamping bound with sequential flushes', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const zoomOutBtn = screen.getByTestId('graph-zoom-out');

      // Click Zoom Out sequentially with act flushes between clicks
      for (let i = 0; i < 20; i++) {
        act(() => {
          fireEvent.click(zoomOutBtn);
        });
      }

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      const match = transform?.match(/scale\(([0-9.]+)\)/);
      expect(match).not.toBeNull();
      const currentScale = parseFloat(match![1]);

      // EMPIRICAL FINDING: Clamped at 0.2x min bound
      expect(currentScale).toBe(0.2);
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('wheel event zoom clamping with sequential flushes reaches 3.0x max and 0.2x min', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const canvasContainer = container.querySelector('#graph-canvas')?.parentElement;
      expect(canvasContainer).not.toBeNull();

      // Sequential wheel zoom in events with act flushes
      for (let i = 0; i < 20; i++) {
        act(() => {
          canvasContainer?.dispatchEvent(new WheelEvent('wheel', {
            deltaY: -100,
            clientX: 800,
            clientY: 600,
            bubbles: true,
            cancelable: true,
          }));
        });
      }

      const viewport = screen.getByTestId('canvas-viewport');
      let match = viewport.getAttribute('transform')?.match(/scale\(([0-9.]+)\)/);
      let scaleVal = parseFloat(match![1]);
      expect(scaleVal).toBe(3);

      // Sequential wheel zoom out events with act flushes
      for (let i = 0; i < 30; i++) {
        act(() => {
          canvasContainer?.dispatchEvent(new WheelEvent('wheel', {
            deltaY: 100,
            clientX: 800,
            clientY: 600,
            bubbles: true,
            cancelable: true,
          }));
        });
      }

      match = viewport.getAttribute('transform')?.match(/scale\(([0-9.]+)\)/);
      scaleVal = parseFloat(match![1]);
      expect(scaleVal).toBe(0.2);
    });

    it('vulnerability demonstration: rapid unbatched click events close over stale scale state', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const zoomInBtn = screen.getByTestId('graph-zoom-in');

      // Firing 10 clicks synchronously in a single execution tick before re-render
      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(zoomInBtn);
        }
      });

      const viewport = screen.getByTestId('canvas-viewport');
      const match = viewport.getAttribute('transform')?.match(/scale\(([0-9.]+)\)/);
      const scaleVal = parseFloat(match![1]);

      // All 10 clicks read the initial scale = 1.0, advancing to only 1.2 instead of progressing
      expect(scaleVal).toBe(1.2);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Rapid Pan and Zoom Sequences (Numerical Invariants)
  // ---------------------------------------------------------------------------
  describe('2. Rapid Pan and Zoom Sequences (Numerical Invariants)', () => {
    it('rapid alternating zoom in and zoom out cycles do not drift or produce NaN', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const zoomInBtn = screen.getByTestId('graph-zoom-in');
      const zoomOutBtn = screen.getByTestId('graph-zoom-out');

      // 20 sequential alternating zoom cycles
      for (let i = 0; i < 20; i++) {
        act(() => {
          fireEvent.click(zoomInBtn);
        });
        act(() => {
          fireEvent.click(zoomOutBtn);
        });
      }

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      expect(transform).not.toContain('NaN');
      expect(transform).not.toContain('Infinity');

      const match = transform?.match(/scale\(([0-9.]+)\)/);
      const scaleVal = parseFloat(match![1]);
      // Scale should return to 1.0 within numerical precision tolerance (1.0 * 1.2 / 1.2 = 1.0)
      expect(Math.abs(scaleVal - 1.0)).toBeLessThan(0.01);
    });

    it('zoom-to-cursor mathematical invariant: world coordinate under cursor remains invariant', () => {
      // Analytical proof test of formula: newPan = cursor - (cursor - pan) * (newScale / scale)
      const cursorX = 500;
      const cursorY = 400;
      const initialPan = { x: 100, y: 50 };
      const scale0 = 1.0;
      const scale1 = 2.0;

      // World point at cursor under initial transform:
      // X_world = (cursorX - panX) / scale
      const worldX = (cursorX - initialPan.x) / scale0; // (500 - 100) / 1 = 400
      const worldY = (cursorY - initialPan.y) / scale0; // (400 - 50) / 1 = 350

      // Apply zoom-to-cursor formula:
      const newPanX = cursorX - (cursorX - initialPan.x) * (scale1 / scale0); // 500 - 400 * 2 = -300
      const newPanY = cursorY - (cursorY - initialPan.y) * (scale1 / scale0); // 400 - 350 * 2 = -300

      // Verify that after transform, world point (worldX, worldY) maps back to exact cursor (cursorX, cursorY):
      const reprojectedScreenX = newPanX + worldX * scale1; // -300 + 400 * 2 = 500
      const reprojectedScreenY = newPanY + worldY * scale1; // -300 + 350 * 2 = 400

      expect(reprojectedScreenX).toBe(cursorX);
      expect(reprojectedScreenY).toBe(cursorY);

      // Now zoom back to scale0:
      const revertPanX = cursorX - (cursorX - newPanX) * (scale0 / scale1);
      const revertPanY = cursorY - (cursorY - newPanY) * (scale0 / scale1);

      expect(revertPanX).toBe(initialPan.x);
      expect(revertPanY).toBe(initialPan.y);
    });

    it('rapid background pan cycles maintain position without state corruption', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const rootDiv = container.firstChild as HTMLElement;

      act(() => {
        // Start pan
        fireEvent.pointerDown(rootDiv, { clientX: 200, clientY: 200, button: 0, pointerId: 1 });

        // 20 rapid back-and-forth moves
        for (let i = 0; i < 20; i++) {
          fireEvent.pointerMove(rootDiv, { clientX: 250, clientY: 250, button: 0, pointerId: 1 });
          fireEvent.pointerMove(rootDiv, { clientX: 200, clientY: 200, button: 0, pointerId: 1 });
        }

        fireEvent.pointerUp(rootDiv, { clientX: 200, clientY: 200, button: 0, pointerId: 1 });
      });

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      expect(transform).not.toContain('NaN');
      // After returning to start client coordinate, pan delta should be 0
      expect(transform).toBe('translate(0, 0) scale(1)');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Fast Pointer Dragging & Boundary Conditions
  // ---------------------------------------------------------------------------
  describe('3. Fast Pointer Dragging & Boundary Conditions', () => {
    it('extreme high-velocity pointer drag clamps node strictly inside canvas boundary [90, 1510] and [50, 1150]', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const targetCard = screen.getByTestId('attack-node-node-alpha');

      // 1. Extreme positive velocity (+10000px right and down)
      act(() => {
        fireEvent.pointerDown(targetCard, { clientX: 500, clientY: 500, button: 0, pointerId: 1 });
        fireEvent.pointerMove(targetCard, { clientX: 10500, clientY: 10500, button: 0, pointerId: 1 });
        fireEvent.pointerUp(targetCard, { clientX: 10500, clientY: 10500, button: 0, pointerId: 1 });
      });

      const posMax = useCtfStore.getState().graphNodePositions['node-alpha'];
      expect(posMax).toBeDefined();
      expect(posMax.x).toBe(1510);
      expect(posMax.y).toBe(1150);

      // 2. Extreme negative velocity (-20000px left and up)
      act(() => {
        fireEvent.pointerDown(targetCard, { clientX: 500, clientY: 500, button: 0, pointerId: 1 });
        fireEvent.pointerMove(targetCard, { clientX: -20000, clientY: -20000, button: 0, pointerId: 1 });
        fireEvent.pointerUp(targetCard, { clientX: -20000, clientY: -20000, button: 0, pointerId: 1 });
      });

      const posMin = useCtfStore.getState().graphNodePositions['node-alpha'];
      expect(posMin).toBeDefined();
      expect(posMin.x).toBe(90);
      expect(posMin.y).toBe(50);
    });

    it('micro-jitter dragging (< 4px) suppresses drag mode and preserves selection click behavior', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const targetCard = screen.getByTestId('attack-node-node-alpha');
      const initialPos = useCtfStore.getState().graphNodePositions['node-alpha'];

      act(() => {
        fireEvent.pointerDown(targetCard, { clientX: 400, clientY: 400, button: 0, pointerId: 1 });
        // 2px jitter: less than 4px threshold
        fireEvent.pointerMove(targetCard, { clientX: 402, clientY: 401, button: 0, pointerId: 1 });
        fireEvent.pointerUp(targetCard, { clientX: 402, clientY: 401, button: 0, pointerId: 1 });
      });

      // Position in store must NOT be modified
      expect(useCtfStore.getState().graphNodePositions['node-alpha']).toEqual(initialPos);

      // Node selection should be active (flyout opens)
      expect(screen.getByText('Engage Target')).toBeInTheDocument();
    });

    it('computeCanvasDelta scales correctly across zoom scales 0.2x to 3.0x', () => {
      const containerRect = { width: 1600, height: 1200 };

      // At scale 0.2: 20px screen delta = 100px canvas delta
      const d02 = computeCanvasDelta(20, 20, 0.2, containerRect);
      expect(d02.dx).toBe(100);
      expect(d02.dy).toBe(100);

      // At scale 3.0: 30px screen delta = 10px canvas delta
      const d30 = computeCanvasDelta(30, 30, 3.0, containerRect);
      expect(d30.dx).toBe(10);
      expect(d30.dy).toBe(10);

      // Default container fallback when containerRect is missing
      const dFallback = computeCanvasDelta(50, 50, 1.0);
      expect(dFallback.dx).toBe(50);
      expect(dFallback.dy).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Fit-To-Screen Bounding Box Math
  // ---------------------------------------------------------------------------
  describe('4. Fit-To-Screen Bounding Box Math', () => {
    it('fit-to-screen with empty nodes array safely resets view without NaN', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={[]} />
        </MemoryRouter>
      );

      const fitBtn = screen.getByTestId('graph-fit-screen');
      act(() => {
        fireEvent.click(fitBtn);
      });

      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');
    });

    it('fit-to-screen clamps tightly clustered nodes to maximum 1.8x zoom', () => {
      // Place all nodes tightly around (800, 600)
      useCtfStore.getState().setGraphNodePosition('node-alpha', { x: 790, y: 590 });
      useCtfStore.getState().setGraphNodePosition('node-beta', { x: 810, y: 610 });
      useCtfStore.getState().setGraphNodePosition('node-gamma', { x: 800, y: 600 });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const fitBtn = screen.getByTestId('graph-fit-screen');
      act(() => {
        fireEvent.click(fitBtn);
      });

      const viewport = screen.getByTestId('canvas-viewport');
      const match = viewport.getAttribute('transform')?.match(/scale\(([0-9.]+)\)/);
      expect(match).not.toBeNull();
      const fitScale = parseFloat(match![1]);

      // Tightly clustered nodes must not zoom infinitely, capped at 1.8x
      expect(fitScale).toBe(1.8);
    });

    it('fit-to-screen computes proper enclosing bounds when nodes are widely dispersed', () => {
      // Place nodes far apart on the canvas boundaries
      useCtfStore.getState().setGraphNodePosition('node-alpha', { x: 100, y: 80 });
      useCtfStore.getState().setGraphNodePosition('node-beta', { x: 1500, y: 1100 });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const fitBtn = screen.getByTestId('graph-fit-screen');
      act(() => {
        fireEvent.click(fitBtn);
      });

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      const match = transform?.match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)\s*scale\(([0-9.]+)\)/);
      expect(match).not.toBeNull();

      const panX = parseFloat(match![1]);
      const panY = parseFloat(match![2]);
      const scaleVal = parseFloat(match![3]);

      expect(Number.isFinite(panX)).toBe(true);
      expect(Number.isFinite(panY)).toBe(true);
      expect(Number.isFinite(scaleVal)).toBe(true);
      // Scale should be scaled down (< 1.0) to frame the wide span
      expect(scaleVal).toBeLessThan(1.0);
      expect(scaleVal).toBeGreaterThanOrEqual(0.2);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Minimap Coordinate Projection Accuracy
  // ---------------------------------------------------------------------------
  describe('5. Minimap Coordinate Projection Accuracy', () => {
    it('minimap viewport rect accurately projects canvas frustum under normal and zoomed states', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      // Default 1:1 scale
      let viewportRect = screen.getByTestId('minimap-viewport-rect');
      expect(viewportRect.getAttribute('x')).toBe('0');
      expect(viewportRect.getAttribute('y')).toBe('0');
      expect(viewportRect.getAttribute('width')).toBe('1600');
      expect(viewportRect.getAttribute('height')).toBe('1200');

      // Zoom in
      const zoomInBtn = screen.getByTestId('graph-zoom-in');
      act(() => {
        fireEvent.click(zoomInBtn);
      });

      viewportRect = screen.getByTestId('minimap-viewport-rect');
      const widthVal = parseFloat(viewportRect.getAttribute('width')!);
      const heightVal = parseFloat(viewportRect.getAttribute('height')!);

      // At scale 1.2: width = 1600 / 1.2 = 1333.33, height = 1200 / 1.2 = 1000
      expect(Math.abs(widthVal - 1600 / 1.2)).toBeLessThan(1);
      expect(Math.abs(heightVal - 1200 / 1.2)).toBeLessThan(1);
    });

    it('minimap projection under extreme pan offset maintains exact mathematical frustum coordinates', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const rootDiv = container.firstChild as HTMLElement;

      // Pan canvas background by +800px horizontally
      act(() => {
        fireEvent.pointerDown(rootDiv, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
        fireEvent.pointerMove(rootDiv, { clientX: 900, clientY: 100, button: 0, pointerId: 1 });
        fireEvent.pointerUp(rootDiv, { clientX: 900, clientY: 100, button: 0, pointerId: 1 });
      });

      const viewportRect = screen.getByTestId('minimap-viewport-rect');
      const xVal = parseFloat(viewportRect.getAttribute('x')!);
      expect(Number.isFinite(xVal)).toBe(true);

      // Viewport group pan and minimap rect x must satisfy: x = -pan.x / scale
      const viewport = screen.getByTestId('canvas-viewport');
      const match = viewport.getAttribute('transform')?.match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)/);
      const panX = parseFloat(match![1]);

      expect(xVal).toBeCloseTo(-panX, 1);
    });

    it('clicking minimap recenters clicked world coordinates to canvas center (800, 600)', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={baseMachines} />
        </MemoryRouter>
      );

      const minimapSvg = screen.getByTestId('graph-minimap-svg');

      act(() => {
        // Mock getBoundingClientRect: 200w x 150h at (0, 0)
        vi.spyOn(minimapSvg, 'getBoundingClientRect').mockReturnValue({
          width: 200,
          height: 150,
          left: 0,
          top: 0,
          right: 200,
          bottom: 150,
          x: 0,
          y: 0,
          toJSON: () => {},
        });

        // Click at exact center of minimap (100, 75) -> corresponds to world (800, 600)
        fireEvent.pointerDown(minimapSvg, { clientX: 100, clientY: 75, pointerId: 1 });
        fireEvent.pointerUp(minimapSvg, { pointerId: 1 });
      });

      const viewport = screen.getByTestId('canvas-viewport');
      // At scale 1, clicking (800, 600) produces pan: 800 - 800*1 = 0, 600 - 600*1 = 0
      expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');
    });
  });
});
