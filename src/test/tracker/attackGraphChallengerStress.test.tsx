import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { 
  GraphView, 
  AttackNodeCard, 
  getCanvasThemeTokens, 
  extractMachinePorts, 
  CanvasThemeTokens 
} from '../../components/tracker/GraphView';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine } from '../../types';

// Mock window.matchMedia for headless test environment
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

function createTestMachine(overrides: Partial<Machine> = {}): Machine {
  const id = overrides.id || `mach-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    name: overrides.name || `Target-${id}`,
    ip: overrides.ip !== undefined ? overrides.ip : '10.10.11.100',
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

describe('Challenger 2 Empirical Stress Harness: GraphView & Attack Canvas', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ machines: [], themePreset: 'zerobox' });
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  // =========================================================================
  // Stress Condition 1: Empty Machine List Handling
  // =========================================================================
  describe('1. Empty Machine List Handling (No crashes, No division-by-zero)', () => {
    it('renders cleanly when both filteredMachines and allMachines are empty', () => {
      useCtfStore.setState({ machines: [] });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={[]} />
        </MemoryRouter>
      );

      // Verify header capsule displays 0 / 0 NODES and 0 SUBNETS
      expect(screen.getByText('0 / 0 NODES')).toBeInTheDocument();
      expect(screen.getByText('0 SUBNETS')).toBeInTheDocument();

      // Viewport transform group exists at 1:1 scale
      const viewport = screen.getByTestId('canvas-viewport');
      expect(viewport).toBeInTheDocument();
      expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');

      // Central Operator Node (Kali) is rendered even with zero targets
      expect(screen.getByText('OPERATOR // KALI')).toBeInTheDocument();
      expect(screen.getByText('10.10.14.x [ATTACK RIG]')).toBeInTheDocument();
    });

    it('Fit to Screen handles empty machine list gracefully without NaN or division by zero', () => {
      useCtfStore.setState({ machines: [] });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={[]} />
        </MemoryRouter>
      );

      const fitBtn = screen.getByTestId('graph-fit-screen');
      expect(() => {
        act(() => {
          fireEvent.click(fitBtn);
        });
      }).not.toThrow();

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      expect(transform).not.toContain('NaN');
      expect(transform).toBe('translate(0, 0) scale(1)');
    });

    it('Center Selection handles empty machine list without errors', () => {
      useCtfStore.setState({ machines: [] });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={[]} />
        </MemoryRouter>
      );

      const centerBtn = screen.getByTestId('graph-center-selection');
      expect(() => {
        act(() => {
          fireEvent.click(centerBtn);
        });
      }).not.toThrow();

      const viewport = screen.getByTestId('canvas-viewport');
      const transform = viewport.getAttribute('transform');
      expect(transform).not.toContain('NaN');
      expect(transform).toContain('translate(0, 0)');
    });

    it('Minimap HUD handles empty machine list without crash', () => {
      useCtfStore.setState({ machines: [] });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={[]} />
        </MemoryRouter>
      );

      const minimap = screen.getByTestId('graph-minimap-svg');
      expect(minimap).toBeInTheDocument();

      const viewportRect = screen.getByTestId('minimap-viewport-rect');
      expect(viewportRect).toBeInTheDocument();
      expect(viewportRect.getAttribute('width')).toBe('1600');
      expect(viewportRect.getAttribute('height')).toBe('1200');
    });
  });

  // =========================================================================
  // Stress Condition 2: Machine Telemetry Edge Cases
  // =========================================================================
  describe('2. Machine Telemetry Edge Cases', () => {
    const tokens = getCanvasThemeTokens('zerobox', true);

    it('handles missing IP (empty string) without crashing card or view', () => {
      const machineWithEmptyIp = createTestMachine({
        id: 'box-no-ip',
        name: 'GhostBox',
        ip: '',
        os: 'Linux',
        openPorts: [22],
      });

      useCtfStore.setState({ machines: [machineWithEmptyIp] });

      render(
        <MemoryRouter>
          <GraphView filteredMachines={[machineWithEmptyIp]} />
        </MemoryRouter>
      );

      const nodeCard = screen.getByTestId('attack-node-box-no-ip');
      expect(nodeCard).toBeInTheDocument();
      expect(screen.getByText('GhostBox')).toBeInTheDocument();
      expect(screen.getByText(':22')).toBeInTheDocument();
    });

    it('handles unmapped/exotic operating systems gracefully with fallback terminal icon', () => {
      const exoticOsList = ['FreeBSD', 'Solaris', 'TempleOS', 'AmigaOS', ''];

      exoticOsList.forEach((os) => {
        const exoticMachine = createTestMachine({
          id: `box-os-${os || 'empty'}`,
          name: `Box-${os || 'empty'}`,
          os: os as any,
          ip: '10.10.10.99',
        });

        const { container } = render(
          <svg>
            <AttackNodeCard
              node={{
                id: exoticMachine.id,
                name: exoticMachine.name,
                ip: exoticMachine.ip,
                os: exoticMachine.os,
                platform: 'HTB',
                difficulty: 'Medium',
                status: 'backlog',
                cluster: 'default',
                x: 300,
                y: 300,
                machine: exoticMachine,
              }}
              isSelected={false}
              isHovered={false}
              tokens={tokens}
              onSelect={vi.fn()}
              onHover={vi.fn()}
              onPointerDown={vi.fn()}
            />
          </svg>
        );

        // Fallback icon renders an SVG with a stroke and rect
        const fallbackIcon = container.querySelector('svg[stroke="#64748B"]');
        expect(fallbackIcon).not.toBeNull();
      });
    });

    it('renders "NO OPEN PORTS" message when both openPorts and services are empty or absent', () => {
      const zeroPortMachine = createTestMachine({
        id: 'box-zero-ports',
        name: 'SilentBox',
        ip: '10.10.10.42',
        openPorts: [],
        services: [],
      });

      render(
        <svg>
          <AttackNodeCard
            node={{
              id: zeroPortMachine.id,
              name: zeroPortMachine.name,
              ip: zeroPortMachine.ip,
              os: zeroPortMachine.os,
              platform: 'HTB',
              difficulty: 'Easy',
              status: 'foothold',
              cluster: 'default',
              x: 200,
              y: 200,
              machine: zeroPortMachine,
            }}
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

    it('correctly extracts ports from services when openPorts is missing or empty', () => {
      const serviceMachine = createTestMachine({
        id: 'box-services-only',
        name: 'ServiceBox',
        ip: '10.10.10.43',
        openPorts: undefined,
        services: [
          { port: 21, service: 'ftp', state: 'open', protocol: 'tcp' },
          { port: 80, service: 'http', state: 'open', protocol: 'tcp' },
          { port: 443, service: 'https', state: 'open', protocol: 'tcp' },
        ],
      });

      const extracted = extractMachinePorts(serviceMachine);
      expect(extracted).toEqual([21, 80, 443]);

      render(
        <svg>
          <AttackNodeCard
            node={{
              id: serviceMachine.id,
              name: serviceMachine.name,
              ip: serviceMachine.ip,
              os: serviceMachine.os,
              platform: 'HTB',
              difficulty: 'Easy',
              status: 'foothold',
              cluster: 'default',
              x: 200,
              y: 200,
              machine: serviceMachine,
            }}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      expect(screen.getByText(':21')).toBeInTheDocument();
      expect(screen.getByText(':80')).toBeInTheDocument();
      expect(screen.getByText(':443')).toBeInTheDocument();
    });

    it('handles massive port counts (>20 ports) with 3 preview badges and +N overflow pill', () => {
      // 25 open ports
      const massivePorts = [
        21, 22, 25, 53, 80, 88, 110, 135, 139, 143, 
        389, 443, 445, 465, 587, 636, 993, 995, 1433, 
        1521, 2049, 3306, 3389, 5432, 8080
      ];

      const massivePortMachine = createTestMachine({
        id: 'box-massive-ports',
        name: 'PortMonster',
        ip: '10.10.10.55',
        openPorts: massivePorts,
      });

      render(
        <svg>
          <AttackNodeCard
            node={{
              id: massivePortMachine.id,
              name: massivePortMachine.name,
              ip: massivePortMachine.ip,
              os: massivePortMachine.os,
              platform: 'HTB',
              difficulty: 'Hard',
              status: 'root',
              cluster: 'default',
              x: 200,
              y: 200,
              machine: massivePortMachine,
            }}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      // First 3 ports displayed
      expect(screen.getByText(':21')).toBeInTheDocument();
      expect(screen.getByText(':22')).toBeInTheDocument();
      expect(screen.getByText(':25')).toBeInTheDocument();

      // Overflow pill: 25 - 3 = 22
      expect(screen.getByText('+22')).toBeInTheDocument();
    });

    it('truncates very long machine names without layout overflow', () => {
      const longNameMachine = createTestMachine({
        id: 'box-very-long',
        name: 'EnterpriseMegaDomainControllerBackupPrimary',
        ip: '10.10.11.99',
      });

      render(
        <svg>
          <AttackNodeCard
            node={{
              id: longNameMachine.id,
              name: longNameMachine.name,
              ip: longNameMachine.ip,
              os: longNameMachine.os,
              platform: 'HTB',
              difficulty: 'Insane',
              status: 'root',
              cluster: 'default',
              x: 200,
              y: 200,
              machine: longNameMachine,
            }}
            isSelected={false}
            isHovered={false}
            tokens={tokens}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            onPointerDown={vi.fn()}
          />
        </svg>
      );

      // Truncated to 11 chars + '…'
      expect(screen.getByText('EnterpriseM…')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Stress Condition 3: Filter Stability & Coordinate Preservation
  // =========================================================================
  describe('3. Filter Stability & Custom Drag Coordinate Invariant', () => {
    it('verifies searching or filtering by tag does NOT mutate or reset custom dragged node positions in useCtfStore.graphNodePositions', () => {
      const machines: Machine[] = [
        createTestMachine({ id: 'm-alpha', name: 'Alpha', tags: ['web'], os: 'Linux' }),
        createTestMachine({ id: 'm-beta', name: 'Beta', tags: ['ad'], os: 'Windows' }),
        createTestMachine({ id: 'm-gamma', name: 'Gamma', tags: ['web', 'crypto'], os: 'Linux' }),
      ];

      useCtfStore.setState({ machines });

      const { rerender } = render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      // Step 1: Simulate dragging m-alpha to custom coordinate (450, 320)
      const alphaNode = screen.getByTestId('attack-node-m-alpha');
      act(() => {
        fireEvent.pointerDown(alphaNode, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
        fireEvent.pointerMove(alphaNode, { clientX: 200, clientY: 180, button: 0, pointerId: 1 });
        fireEvent.pointerUp(alphaNode, { clientX: 200, clientY: 180, button: 0, pointerId: 1 });
      });

      // Verify custom coordinate was saved to Zustand store
      const initialSavedPos = useCtfStore.getState().graphNodePositions['m-alpha'];
      expect(initialSavedPos).toBeDefined();
      expect(typeof initialSavedPos.x).toBe('number');
      expect(typeof initialSavedPos.y).toBe('number');
      const expectedX = initialSavedPos.x;
      const expectedY = initialSavedPos.y;

      // Step 2: Apply filter 1 — search for "Beta" (m-alpha is filtered out)
      const filteredToBeta = [machines[1]];
      rerender(
        <MemoryRouter>
          <GraphView filteredMachines={filteredToBeta} />
        </MemoryRouter>
      );

      // m-alpha is hidden from canvas
      expect(screen.queryByTestId('attack-node-m-alpha')).toBeNull();
      expect(screen.getByTestId('attack-node-m-beta')).toBeInTheDocument();

      // STORE INVARIANT CHECK: graphNodePositions['m-alpha'] MUST NOT be deleted or mutated!
      const storePosAfterFilter1 = useCtfStore.getState().graphNodePositions['m-alpha'];
      expect(storePosAfterFilter1).toBeDefined();
      expect(storePosAfterFilter1.x).toBe(expectedX);
      expect(storePosAfterFilter1.y).toBe(expectedY);

      // Step 3: Apply filter 2 — filter by tag "crypto" (only m-gamma matches)
      const filteredToGamma = [machines[2]];
      rerender(
        <MemoryRouter>
          <GraphView filteredMachines={filteredToGamma} />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('attack-node-m-alpha')).toBeNull();
      expect(screen.queryByTestId('attack-node-m-beta')).toBeNull();
      expect(screen.getByTestId('attack-node-m-gamma')).toBeInTheDocument();

      // STORE INVARIANT CHECK: still intact
      const storePosAfterFilter2 = useCtfStore.getState().graphNodePositions['m-alpha'];
      expect(storePosAfterFilter2.x).toBe(expectedX);
      expect(storePosAfterFilter2.y).toBe(expectedY);

      // Step 4: Clear filter — restore all machines
      rerender(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      // m-alpha is back on canvas at its custom dragged position!
      const restoredAlphaNode = screen.getByTestId('attack-node-m-alpha');
      expect(restoredAlphaNode).toBeInTheDocument();
      const cardRect = restoredAlphaNode.querySelector('rect[width="180"][height="84"]');
      expect(Number(cardRect?.getAttribute('x'))).toBe(expectedX - 90);
      expect(Number(cardRect?.getAttribute('y'))).toBe(expectedY - 42);

      // Stored positions remain perfectly untouched
      expect(useCtfStore.getState().graphNodePositions['m-alpha'].x).toBe(expectedX);
      expect(useCtfStore.getState().graphNodePositions['m-alpha'].y).toBe(expectedY);
    });
  });

  // =========================================================================
  // Stress Condition 4: Multi-Theme Visual Integrity
  // =========================================================================
  describe('4. Multi-Theme Visual Integrity across all 4 themes', () => {
    const themeCases = [
      {
        theme: 'zerobox',
        isDark: true,
        expectedCanvasBg: '#070B14',
        expectedCardBg: '#0D1527',
        expectedAccent: '#00F0FF',
        expectedRoot: '#10B981',
      },
      {
        theme: 'htb',
        isDark: true,
        expectedCanvasBg: '#000000',
        expectedCardBg: '#0B1015',
        expectedAccent: '#9FEF00',
        expectedRoot: '#9FEF00',
      },
      {
        theme: 'oled',
        isDark: true,
        expectedCanvasBg: '#000000',
        expectedCardBg: '#0A0A0A',
        expectedAccent: '#38BDF8',
        expectedRoot: '#10B981',
      },
      {
        theme: 'light',
        isDark: false,
        expectedCanvasBg: '#F8FAFC',
        expectedCardBg: '#FFFFFF',
        expectedAccent: '#008B99',
        expectedRoot: '#059669',
      },
    ];

    themeCases.forEach(({ theme, isDark, expectedCanvasBg, expectedCardBg, expectedAccent, expectedRoot }) => {
      it(`theme "${theme}" provides comprehensive, valid color tokens`, () => {
        const tokens = getCanvasThemeTokens(theme, isDark);

        expect(tokens.canvasBg).toBe(expectedCanvasBg);
        expect(tokens.cardBg).toBe(expectedCardBg);
        expect(tokens.accent).toBe(expectedAccent);
        expect(tokens.statusRoot).toBe(expectedRoot);

        // Verify none of the 13 required token properties are undefined or empty
        const keys: (keyof CanvasThemeTokens)[] = [
          'canvasBg', 'cardBg', 'cardBorder', 'cardHoverBorder',
          'textPrimary', 'textMuted', 'codeBg', 'codeBorder',
          'accent', 'accentGlow', 'gridColor', 'statusRoot',
          'statusFoothold', 'statusUnsolved'
        ];
        keys.forEach((key) => {
          expect(tokens[key]).toBeDefined();
          expect(typeof tokens[key]).toBe('string');
          expect(tokens[key].length).toBeGreaterThan(0);
        });
      });

      it(`renders GraphView seamlessly under theme "${theme}" without visual regression`, () => {
        const testMachine = createTestMachine({
          id: `theme-box-${theme}`,
          name: `Box-${theme}`,
          status: 'root',
        });

        useCtfStore.setState({ 
          machines: [testMachine], 
          themePreset: theme as any 
        });

        const { container } = render(
          <MemoryRouter>
            <GraphView filteredMachines={[testMachine]} />
          </MemoryRouter>
        );

        // Check canvas background rect matches theme
        const bgRect = container.querySelector(`rect[fill="${expectedCanvasBg}"]`);
        expect(bgRect).not.toBeNull();

        // Check node card rect matches theme cardBg
        const nodeCard = screen.getByTestId(`attack-node-theme-box-${theme}`);
        const cardBgRect = nodeCard.querySelector(`rect[fill="${expectedCardBg}"]`);
        expect(cardBgRect).not.toBeNull();

        // Check root beacon matches theme statusRoot
        const beacon = nodeCard.querySelector(`circle[fill="${expectedRoot}"]`);
        expect(beacon).not.toBeNull();
      });
    });
  });
});
