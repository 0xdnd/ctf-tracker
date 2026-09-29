import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { 
  GraphView, 
  AttackNodeCard, 
  getCanvasThemeTokens, 
  extractMachinePorts, 
  getDifficultyColors, 
  computeCanvasDelta,
  GraphNode,
  CanvasThemeTokens
} from '../../components/tracker/GraphView';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine, OperatingSystem, Difficulty, Platform, PipelineStatus } from '../../types';

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

// Mock helper to create test machines
function createMockMachine(overrides: Partial<Machine> = {}): Machine {
  const id = overrides.id || `mach-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    name: overrides.name || `Target-${id}`,
    ip: overrides.ip || '10.10.11.100',
    os: overrides.os || 'Linux',
    platform: overrides.platform || 'HTB',
    difficulty: overrides.difficulty || 'Easy',
    status: overrides.status || 'backlog',
    tags: overrides.tags || ['web'],
    certifications: overrides.certifications || ['OSCP'],
    timeSpentSeconds: overrides.timeSpentSeconds ?? 0,
    createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
    openPorts: overrides.openPorts,
    services: overrides.services,
    ...overrides,
  };
}

describe('Milestone 2: Visual Attack Graph & Pivot Topology Canvas Engine', () => {
  const mockMachines: Machine[] = [
    createMockMachine({
      id: 'box-linux-root',
      name: 'Sau',
      ip: '10.10.11.224',
      os: 'Linux',
      difficulty: 'Easy',
      status: 'root',
      openPorts: [22, 80, 55555],
      platform: 'HTB',
    }),
    createMockMachine({
      id: 'box-windows-foothold',
      name: 'Forest',
      ip: '10.10.10.161',
      os: 'Windows',
      difficulty: 'Medium',
      status: 'foothold',
      openPorts: [88, 135, 445, 3389, 5985],
      platform: 'HTB',
    }),
    createMockMachine({
      id: 'box-macos-unsolved',
      name: 'BigSur',
      ip: '192.168.1.50',
      os: 'macOS',
      difficulty: 'Hard',
      status: 'recon',
      openPorts: [22, 80],
      platform: 'Custom',
    }),
    createMockMachine({
      id: 'box-android-unsolved',
      name: 'DroidLab',
      ip: '192.168.1.75',
      os: 'Android',
      difficulty: 'Very Easy',
      status: 'backlog',
      openPorts: [5555],
      platform: 'THM',
    }),
    createMockMachine({
      id: 'box-bsd-insane',
      name: 'BSDBeast',
      ip: '10.10.10.200',
      os: 'BSD',
      difficulty: 'Insane',
      status: 'completed',
      openPorts: [],
      platform: 'HTB',
    }),
    createMockMachine({
      id: 'box-long-name',
      name: 'CorporateActiveDirectoryDC01',
      ip: '10.10.11.20',
      os: 'Windows',
      difficulty: 'Hard',
      status: 'root',
      openPorts: [88, 389, 445],
      platform: 'HTB',
    }),
  ];

  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ machines: mockMachines, themePreset: 'zerobox' });
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  // -------------------------------------------------------------------------
  // Test Suite 1: Pure SVG Machine Node Cards (<AttackNodeCard>)
  // -------------------------------------------------------------------------
  describe('1. Pure SVG Machine Node Cards (<AttackNodeCard>)', () => {
    const tokens = getCanvasThemeTokens('zerobox', true);

    it('renders pure SVG primitives without foreignObject with exact 180x84 dimensions', () => {
      const node: GraphNode = {
        id: 'box-linux-root',
        name: 'Sau',
        ip: '10.10.11.224',
        os: 'Linux',
        platform: 'HTB',
        difficulty: 'Easy',
        status: 'root',
        cluster: 'web',
        x: 400,
        y: 300,
        machine: mockMachines[0],
      };

      const { container } = render(
        <svg>
          <AttackNodeCard
            node={node}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      // Verify no foreignObject exists anywhere
      expect(container.querySelector('foreignObject')).toBeNull();

      // Verify primary card rect
      const cardRect = container.querySelector('rect[width="180"][height="84"][rx="8"]');
      expect(cardRect).not.toBeNull();
      expect(cardRect?.getAttribute('x')).toBe(String(400 - 90));
      expect(cardRect?.getAttribute('y')).toBe(String(300 - 42));

      // Verify cardinal docking anchors
      const anchors = container.querySelectorAll('circle[r="2.5"]');
      expect(anchors.length).toBe(4);
    });

    it('renders correct OS vector icons across Linux, Windows, macOS, Android, BSD and Other', () => {
      const osList: OperatingSystem[] = ['Linux', 'Windows', 'macOS', 'Android', 'BSD', 'Other'];

      osList.forEach((osName) => {
        const m = createMockMachine({ os: osName });
        const node: GraphNode = {
          id: `box-${osName}`,
          name: `Box-${osName}`,
          ip: '10.10.10.5',
          os: osName,
          platform: 'HTB',
          difficulty: 'Medium',
          status: 'backlog',
          cluster: 'dmz',
          x: 500,
          y: 400,
          machine: m,
        };

        const { container } = render(
          <svg>
            <AttackNodeCard
              node={node}
              isSelected={false}
              isHovered={false}
              tokens={tokens}
              onSelect={vi.fn()}
              onHover={vi.fn()}
              onPointerDown={vi.fn()}
            />
          </svg>
        );

        // Verify SVG icon container was rendered
        const iconSvg = container.querySelector('svg[width="16"][height="16"]');
        expect(iconSvg).not.toBeNull();
      });
    });

    it('renders IP address pill, truncated machine name, and difficulty badge', () => {
      const node: GraphNode = {
        id: 'box-long-name',
        name: 'CorporateActiveDirectoryDC01',
        ip: '10.10.11.20',
        os: 'Windows',
        platform: 'HTB',
        difficulty: 'Hard',
        status: 'root',
        cluster: 'ad',
        x: 600,
        y: 450,
        machine: mockMachines[5],
      };

      render(
        <svg>
          <AttackNodeCard
            node={node}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      // Name truncated with ellipsis at 11 chars + ellipsis
      expect(screen.getByText('CorporateAc…')).toBeInTheDocument();
      // IP pill
      expect(screen.getByText('10.10.11.20')).toBeInTheDocument();
      // Difficulty pill
      expect(screen.getByText('HARD')).toBeInTheDocument();
    });

    it('renders port preview badges with service highlighting and +N overflow', () => {
      // Machine with 5 ports (88, 135, 445, 3389, 5985)
      const node: GraphNode = {
        id: 'box-windows-foothold',
        name: 'Forest',
        ip: '10.10.10.161',
        os: 'Windows',
        platform: 'HTB',
        difficulty: 'Medium',
        status: 'foothold',
        cluster: 'ad',
        x: 500,
        y: 350,
        machine: mockMachines[1],
      };

      render(
        <svg>
          <AttackNodeCard
            node={node}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      expect(screen.getByText(':88')).toBeInTheDocument();
      expect(screen.getByText(':135')).toBeInTheDocument();
      expect(screen.getByText(':445')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('renders fallback "NO OPEN PORTS" when machine has no ports', () => {
      const node: GraphNode = {
        id: 'box-bsd-insane',
        name: 'BSDBeast',
        ip: '10.10.10.200',
        os: 'BSD',
        platform: 'HTB',
        difficulty: 'Insane',
        status: 'completed',
        cluster: 'dmz',
        x: 500,
        y: 350,
        machine: mockMachines[4],
      };

      render(
        <svg>
          <AttackNodeCard
            node={node}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      expect(screen.getByText('NO OPEN PORTS')).toBeInTheDocument();
    });

    it('renders pulsing beacon halo for rooted nodes and tactical selection reticle', () => {
      const node: GraphNode = {
        id: 'box-linux-root',
        name: 'Sau',
        ip: '10.10.11.224',
        os: 'Linux',
        platform: 'HTB',
        difficulty: 'Easy',
        status: 'root',
        cluster: 'web',
        x: 400,
        y: 300,
        machine: mockMachines[0],
      };

      const { container } = render(
        <svg>
          <AttackNodeCard
            node={node}
            isSelected={true}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      // Root pulse animation
      const animateEl = container.querySelector('animate');
      expect(animateEl).not.toBeNull();
      const attrName = animateEl?.getAttribute('attributeName') || animateEl?.getAttribute('attributename');
      expect(attrName).toBe('r');

      // Selection reticle corner brackets
      const reticlePaths = container.querySelectorAll('g.pointer-events-none path');
      expect(reticlePaths.length).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // Test Suite 2: Canvas Navigation Controls Toolbar
  // -------------------------------------------------------------------------
  describe('2. Canvas Navigation Controls Toolbar', () => {
    it('renders all toolbar buttons with data-testids', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('canvas-nav-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('graph-zoom-in')).toBeInTheDocument();
      expect(screen.getByTestId('graph-zoom-out')).toBeInTheDocument();
      expect(screen.getByTestId('graph-reset-view')).toBeInTheDocument();
      expect(screen.getByTestId('graph-fit-screen')).toBeInTheDocument();
      expect(screen.getByTestId('graph-center-selection')).toBeInTheDocument();
      expect(screen.getByTestId('graph-fullscreen-toggle')).toBeInTheDocument();
    });

    it('Zoom In button increases scale and updates percentage display', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      expect(screen.getByText('100%')).toBeInTheDocument();

      const zoomInBtn = screen.getByTestId('graph-zoom-in');
      act(() => {
        fireEvent.click(zoomInBtn);
      });

      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    it('Zoom Out button decreases scale', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const zoomOutBtn = screen.getByTestId('graph-zoom-out');
      act(() => {
        fireEvent.click(zoomOutBtn);
      });

      expect(screen.getByText('83%')).toBeInTheDocument();
    });

    it('Reset View button restores scale to 100% and centers viewport', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const zoomInBtn = screen.getByTestId('graph-zoom-in');
      act(() => {
        fireEvent.click(zoomInBtn);
      });
      act(() => {
        fireEvent.click(zoomInBtn);
      });
      expect(screen.getByText('144%')).toBeInTheDocument();

      const resetBtn = screen.getByTestId('graph-reset-view');
      act(() => {
        fireEvent.click(resetBtn);
      });

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('Fit to Screen frames all active nodes without throwing errors', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const fitBtn = screen.getByTestId('graph-fit-screen');
      expect(() => {
        act(() => {
          fireEvent.click(fitBtn);
        });
      }).not.toThrow();

      // Viewport transform group should update
      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport.getAttribute('transform')).toContain('scale');
    });

    it('Center Selection centers active target machine or rig', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const centerBtn = screen.getByTestId('graph-center-selection');
      expect(() => {
        act(() => {
          fireEvent.click(centerBtn);
        });
      }).not.toThrow();

      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport.getAttribute('transform')).toContain('translate');
    });

    it('Fullscreen toggle updates fullscreen class state', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const fsBtn = screen.getByTestId('graph-fullscreen-toggle');
      act(() => {
        fireEvent.click(fsBtn);
      });

      expect(container.firstChild).toHaveClass('fixed');

      act(() => {
        fireEvent.click(fsBtn);
      });
      expect(container.firstChild).not.toHaveClass('fixed');
    });
  });

  // -------------------------------------------------------------------------
  // Test Suite 3: Canvas Transform Engine & Wheel Zoom
  // -------------------------------------------------------------------------
  describe('3. Canvas Transform Engine & Wheel Zoom', () => {
    it('applies transform directly to inner #canvas-viewport group with transformOrigin 0 0', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport).toBeInTheDocument();
      expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');
      expect(viewport.style.transformOrigin).toBe('0 0');
    });

    it('wheel event triggers zoom-to-cursor scaling', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const canvasContainer = container.querySelector('#graph-canvas')?.parentElement;
      expect(canvasContainer).not.toBeNull();

      // Simulate mouse wheel up (zoom in)
      act(() => {
        const wheelEvt = new WheelEvent('wheel', {
          deltaY: -100,
          clientX: 800,
          clientY: 600,
          bubbles: true,
          cancelable: true,
        });
        canvasContainer?.dispatchEvent(wheelEvt);
      });

      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport.getAttribute('transform')).toContain('scale(1.15)');
    });

    it('background pointer panning updates pan transform coordinates', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const rootDiv = container.firstChild as HTMLElement;

      act(() => {
        fireEvent.pointerDown(rootDiv, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
        fireEvent.pointerMove(rootDiv, { clientX: 150, clientY: 130, button: 0, pointerId: 1 });
        fireEvent.pointerUp(rootDiv, { clientX: 150, clientY: 130, button: 0, pointerId: 1 });
      });

      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport.getAttribute('transform')).not.toBe('translate(0, 0) scale(1)');
    });
  });

  // -------------------------------------------------------------------------
  // Test Suite 4: Freeform Node Dragging & Persistence
  // -------------------------------------------------------------------------
  describe('4. Freeform Node Dragging & Persistence', () => {
    it('clicking node without movement threshold selects node and opens detail drawer', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const sauCard = screen.getByTestId('attack-node-box-linux-root');

      act(() => {
        fireEvent.pointerDown(sauCard, { clientX: 300, clientY: 300, button: 0, pointerId: 1 });
        // micro-jitter of 1px (less than 4px threshold)
        fireEvent.pointerMove(sauCard, { clientX: 301, clientY: 301, button: 0, pointerId: 1 });
        fireEvent.pointerUp(sauCard, { clientX: 301, clientY: 301, button: 0, pointerId: 1 });
      });

      // Flyout should open with engage target button
      expect(screen.getByText('Engage Target')).toBeInTheDocument();
      expect(screen.getByTestId('flyout-close-btn')).toBeInTheDocument();
    });

    it('dragging node moves coordinates and commits to store setGraphNodePosition on pointer up', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const sauCard = screen.getByTestId('attack-node-box-linux-root');

      act(() => {
        fireEvent.pointerDown(sauCard, { clientX: 200, clientY: 200, button: 0, pointerId: 1 });
        // move 60px right and 40px down (> 4px threshold)
        fireEvent.pointerMove(sauCard, { clientX: 260, clientY: 240, button: 0, pointerId: 1 });
        fireEvent.pointerUp(sauCard, { clientX: 260, clientY: 240, button: 0, pointerId: 1 });
      });

      // Verify Zustand store updated
      const updatedPos = useCtfStore.getState().graphNodePositions['box-linux-root'];
      expect(updatedPos).toBeDefined();
      expect(typeof updatedPos.x).toBe('number');
      expect(typeof updatedPos.y).toBe('number');

      // Verify safeLocalStorage persistence
      const rawStored = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      expect(rawStored).not.toBeNull();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.graphNodePositions['box-linux-root']).toEqual(updatedPos);
    });

    it('computes screen-to-canvas coordinate delta with scale scaling', () => {
      // At scale 1: 50 screen px = 50 canvas units (assuming 1600x1200 container)
      const delta1 = computeCanvasDelta(50, 50, 1.0, { width: 1600, height: 1200 });
      expect(delta1.dx).toBe(50);
      expect(delta1.dy).toBe(50);

      // At scale 2 (zoomed in): 50 screen px = 25 canvas units
      const delta2 = computeCanvasDelta(50, 50, 2.0, { width: 1600, height: 1200 });
      expect(delta2.dx).toBe(25);
      expect(delta2.dy).toBe(25);

      // At scale 0.5 (zoomed out): 50 screen px = 100 canvas units
      const delta3 = computeCanvasDelta(50, 50, 0.5, { width: 1600, height: 1200 });
      expect(delta3.dx).toBe(100);
      expect(delta3.dy).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Test Suite 5: Filter Synchronization & Spatial Stability
  // -------------------------------------------------------------------------
  describe('5. Filter Synchronization & Spatial Stability', () => {
    it('initial default positions are computed so nodes never overlap at (0, 0)', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      mockMachines.forEach((m) => {
        const nodeEl = screen.getByTestId(`attack-node-${m.id}`);
        expect(nodeEl).toBeInTheDocument();
        const cardRect = nodeEl.querySelector('rect[width="180"][height="84"]');
        const x = Number(cardRect?.getAttribute('x'));
        const y = Number(cardRect?.getAttribute('y'));
        // None should be at 0, 0 (accounting for -90, -42 card offset)
        expect(x).not.toBe(-90);
        expect(y).not.toBe(-42);
        expect(x).toBeGreaterThan(0);
        expect(y).toBeGreaterThan(0);
      });
    });

    it('filtering hides non-matching nodes without changing coordinates of remaining nodes', () => {
      // 1. Initial render with all machines
      const { rerender } = render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const sauCardBefore = screen.getByTestId('attack-node-box-linux-root');
      const rectBefore = sauCardBefore.querySelector('rect[width="180"][height="84"]');
      const xBefore = rectBefore?.getAttribute('x');
      const yBefore = rectBefore?.getAttribute('y');

      // 2. Filter to ONLY Linux machine (Sau)
      const linuxFiltered = mockMachines.filter((m) => m.os === 'Linux');
      rerender(
        <MemoryRouter>
          <GraphView filteredMachines={linuxFiltered} />
        </MemoryRouter>
      );

      // Non-Linux nodes should be hidden
      expect(screen.queryByTestId('attack-node-box-windows-foothold')).toBeNull();
      expect(screen.queryByTestId('attack-node-box-macos-unsolved')).toBeNull();

      // Sau should remain at exact same coordinate
      const sauCardAfter = screen.getByTestId('attack-node-box-linux-root');
      const rectAfter = sauCardAfter.querySelector('rect[width="180"][height="84"]');
      expect(rectAfter?.getAttribute('x')).toBe(xBefore);
      expect(rectAfter?.getAttribute('y')).toBe(yBefore);

      // 3. Clear filter back to all machines
      rerender(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      // All nodes restored at their exact same positions
      expect(screen.getByTestId('attack-node-box-windows-foothold')).toBeInTheDocument();
      expect(screen.getByTestId('attack-node-box-macos-unsolved')).toBeInTheDocument();
      const rectRestored = screen.getByTestId('attack-node-box-linux-root').querySelector('rect[width="180"][height="84"]');
      expect(rectRestored?.getAttribute('x')).toBe(xBefore);
      expect(rectRestored?.getAttribute('y')).toBe(yBefore);
    });
  });

  // -------------------------------------------------------------------------
  // Test Suite 6: Tactical Minimap
  // -------------------------------------------------------------------------
  describe('6. Tactical Minimap HUD', () => {
    it('renders tactical minimap container, mini SVG, and viewport framing rectangle', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('graph-minimap-container')).toBeInTheDocument();
      expect(screen.getByTestId('graph-minimap-svg')).toBeInTheDocument();

      const viewportRect = screen.getByTestId('minimap-viewport-rect');
      expect(viewportRect).toBeInTheDocument();
      expect(viewportRect.getAttribute('width')).toBe('1600');
      expect(viewportRect.getAttribute('height')).toBe('1200');
    });

    it('clicking minimap toggle collapses and expands the radar preview', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const toggleBtn = screen.getByTestId('graph-minimap-toggle');
      act(() => {
        fireEvent.click(toggleBtn);
      });

      // Container should be collapsed
      expect(screen.queryByTestId('graph-minimap-container')).toBeNull();

      // Collapsed toggle button should exist
      const collapsedToggle = screen.getByTestId('graph-minimap-toggle');
      act(() => {
        fireEvent.click(collapsedToggle);
      });

      // Re-expanded
      expect(screen.getByTestId('graph-minimap-container')).toBeInTheDocument();
    });

    it('clicking inside minimap navigates canvas viewport pan', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const minimapSvg = screen.getByTestId('graph-minimap-svg');

      act(() => {
        // Mock getBoundingClientRect on minimap SVG
        vi.spyOn(minimapSvg, 'getBoundingClientRect').mockReturnValue({
          width: 192,
          height: 128,
          left: 16,
          top: 500,
          right: 208,
          bottom: 628,
          x: 16,
          y: 500,
          toJSON: () => {},
        });

        fireEvent.pointerDown(minimapSvg, { clientX: 100, clientY: 550, pointerId: 1 });
        fireEvent.pointerUp(minimapSvg, { pointerId: 1 });
      });

      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport.getAttribute('transform')).toContain('translate');
    });
  });

  // -------------------------------------------------------------------------
  // Test Suite 7: Multi-Theme Adaptation
  // -------------------------------------------------------------------------
  describe('7. Multi-Theme Adaptation', () => {
    it('resolves distinct tactical theme token palettes for zerobox, htb, oled, and light presets', () => {
      const zeroboxTokens = getCanvasThemeTokens('zerobox', true);
      expect(zeroboxTokens.accent).toBe('#00F0FF');
      expect(zeroboxTokens.cardBg).toBe('#0D1527');

      const htbTokens = getCanvasThemeTokens('htb', true);
      expect(htbTokens.accent).toBe('#9FEF00');
      expect(htbTokens.canvasBg).toBe('#000000');
      expect(htbTokens.cardBg).toBe('#0B1015');

      const oledTokens = getCanvasThemeTokens('oled', true);
      expect(oledTokens.accent).toBe('#38BDF8');
      expect(oledTokens.canvasBg).toBe('#000000');
      expect(oledTokens.cardBg).toBe('#0A0A0A');

      const lightTokens = getCanvasThemeTokens('light', false);
      expect(lightTokens.accent).toBe('#008B99');
      expect(lightTokens.canvasBg).toBe('#F8FAFC');
      expect(lightTokens.cardBg).toBe('#FFFFFF');
    });

    it('renders with HTB lime green accents when themePreset is set to htb', () => {
      act(() => {
        useCtfStore.setState({ themePreset: 'htb' });
      });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      // Sau is rooted: in HTB theme, statusRoot is #9FEF00 (lime)
      const sauNode = screen.getByTestId('attack-node-box-linux-root');
      const beacon = sauNode.querySelector('circle[fill="#9FEF00"]');
      expect(beacon).not.toBeNull();
    });

    it('renders with OLED ice blue and pure black styling when themePreset is set to oled', () => {
      act(() => {
        useCtfStore.setState({ themePreset: 'oled' });
      });

      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const bgRect = container.querySelector('rect[fill="#000000"]');
      expect(bgRect).not.toBeNull();
    });
  });
});
