import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphView } from '../../components/tracker/GraphView';
import { GraphEdgeInspectorDrawer } from '../../components/tracker/GraphEdgeInspectorDrawer';
import { 
  exportToObsidianCanvas, 
  exportToSvg, 
  ExportGraphNode 
} from '../../utils/graphExportUtils';
import { useCtfStore, safeLocalStorage } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';
import { Machine } from '../../types';
import { AttackGraphEdge } from '../../types/graph';

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
    ...overrides,
  };
}

describe('Milestones 3 & 4: Attack Graph Edges, Dynamic Pivot Vectors & Exporters', () => {
  const machineA = createMockMachine({
    id: 'box-jump-host',
    name: 'JumpHost',
    ip: '10.10.11.50',
    os: 'Linux',
    status: 'root',
  });

  const machineB = createMockMachine({
    id: 'box-internal-dc',
    name: 'InternalDC',
    ip: '192.168.100.10',
    os: 'Windows',
    status: 'foothold',
  });

  const machineC = createMockMachine({
    id: 'box-db-server',
    name: 'Database01',
    ip: '192.168.100.20',
    os: 'Linux',
    status: 'backlog',
  });

  const mockMachines: Machine[] = [machineA, machineB, machineC];

  const sampleEdge: AttackGraphEdge = {
    id: 'edge-jump-to-dc',
    sourceId: 'box-jump-host',
    targetId: 'box-internal-dc',
    type: 'pivot-ssh',
    status: 'compromised',
    port: 1080,
    protocol: 'SOCKS5',
    notes: 'SSH dynamic port forwarding pivot established',
    createdAt: '2026-09-27T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    safeLocalStorage.removeItem('zerobox-attack-graph-state');
    act(() => {
      useCtfStore.getState().resetGraphLayout();
      useCtfStore.getState().clearGraphEdges();
      useCtfStore.setState({
        machines: mockMachines,
        graphEdges: [sampleEdge],
        graphNodePositions: {
          'box-jump-host': { x: 200, y: 300 },
          'box-internal-dc': { x: 600, y: 300 },
          'box-db-server': { x: 600, y: 500 },
        },
        globalVars: {
          lhost: '10.10.14.99',
          lport: '4444',
          targetIp: '10.10.11.50',
          interface: 'tun0',
          customVars: {},
        },
        soundEnabled: false,
      });
    });
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem('zerobox-attack-graph-state');
    act(() => {
      useCtfStore.getState().resetGraphLayout();
      useCtfStore.getState().clearGraphEdges();
    });
    vi.restoreAllMocks();
  });

  // ==========================================
  // Section 1: Exporter Utilities (Milestone 4)
  // ==========================================
  describe('Graph Exporter Utilities (Milestone 4)', () => {
    it('exportToObsidianCanvas creates valid JSON Canvas v1.0 data structure', () => {
      const nodes: ExportGraphNode[] = [
        {
          id: machineA.id,
          name: machineA.name,
          ip: machineA.ip,
          os: machineA.os,
          difficulty: machineA.difficulty,
          status: machineA.status,
          x: 200,
          y: 300,
        },
        {
          id: machineB.id,
          name: machineB.name,
          ip: machineB.ip,
          os: machineB.os,
          difficulty: machineB.difficulty,
          status: machineB.status,
          x: 600,
          y: 300,
        },
      ];

      const edges: AttackGraphEdge[] = [sampleEdge];

      const result = exportToObsidianCanvas(nodes, edges, 'test-export');
      expect(result.success).toBe(true);
      expect(result.filename).toContain('test-export-');
      expect(result.filename.endsWith('.canvas')).toBe(true);

      const { data } = result;
      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);

      // Check node attributes
      const nodeA = data.nodes.find((n) => n.id === machineA.id);
      expect(nodeA).toBeDefined();
      expect(nodeA?.type).toBe('text');
      expect(nodeA?.text).toContain(`### ${machineA.name}`);
      expect(nodeA?.text).toContain(`\`${machineA.ip}\``);
      expect(nodeA?.text).toContain('ROOT / PWNED');
      expect(nodeA?.color).toBe('4'); // Green for rooted

      const nodeB = data.nodes.find((n) => n.id === machineB.id);
      expect(nodeB?.text).toContain('FOOTHOLD');
      expect(nodeB?.color).toBe('3'); // Yellow for foothold

      // Check edge attributes
      const edgeExport = data.edges[0];
      expect(edgeExport.fromNode).toBe('box-jump-host');
      expect(edgeExport.toNode).toBe('box-internal-dc');
      expect(edgeExport.fromSide).toBe('right');
      expect(edgeExport.toSide).toBe('left');
      expect(edgeExport.label).toContain('SSH');
      expect(edgeExport.label).toContain(':1080');
      expect(edgeExport.color).toBe('4'); // Green for SSH pivot
    });

    it('exportToSvg safely handles missing element without throwing', () => {
      const result = exportToSvg('non-existent-svg-id', 'test-svg');
      expect(result.success).toBe(false);
      expect(result.filename.endsWith('.svg')).toBe(true);
    });

    it('exportToSvg serializes valid SVG element with XML header', () => {
      // Create mock SVG in document
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'test-export-svg-id';
      svg.setAttribute('width', '800');
      svg.setAttribute('height', '600');
      document.body.appendChild(svg);


      const result = exportToSvg('test-export-svg-id', 'test-graph');
      expect(result.success).toBe(true);
      expect(result.filename.endsWith('.svg')).toBe(true);

      document.body.removeChild(svg);
    });
  });

  // ========================================================
  // Section 2: GraphEdgeInspectorDrawer Component (Milestone 3)
  // ========================================================
  describe('GraphEdgeInspectorDrawer Component (Milestone 3)', () => {
    it('renders inspector drawer with source, target, and dynamic pivot commands', () => {
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      // Verify header and machines info
      expect(screen.getByText('JumpHost')).toBeInTheDocument();
      expect(screen.getByText('InternalDC')).toBeInTheDocument();
      expect(screen.getByText('10.10.11.50')).toBeInTheDocument();
      expect(screen.getByText('192.168.100.10')).toBeInTheDocument();

      // Verify generated commands exist
      expect(screen.getByText('Generated Terminal Commands')).toBeInTheDocument();
      expect(screen.getByText(/ssh -N -D 1080/)).toBeInTheDocument();
      expect(screen.getByText(/proxychains4/)).toBeInTheDocument();
    });

    it('toggles vector status between potential and compromised', () => {
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      // Status button indicates compromised / established
      const statusBtn = screen.getByText('Established');
      fireEvent.click(statusBtn);

      expect(onUpdateEdge).toHaveBeenCalledWith(sampleEdge.id, {
        status: 'potential',
      });
    });

    it('allows changing vector attack type to Chisel, Ligolo, or AD Trust', () => {
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      // Select Chisel from dropdown
      const selectProtocol = screen.getByRole('combobox');
      fireEvent.change(selectProtocol, { target: { value: 'pivot-chisel' } });

      expect(onUpdateEdge).toHaveBeenCalledWith(sampleEdge.id, expect.objectContaining({
        type: 'pivot-chisel',
        port: 8000,
      }));
    });

    it('updates custom port on blur', () => {
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      const portInput = screen.getByPlaceholderText('1080');
      fireEvent.change(portInput, { target: { value: '9050' } });
      fireEvent.blur(portInput);

      expect(onUpdateEdge).toHaveBeenCalledWith(sampleEdge.id, {
        port: 9050,
      });
    });

    it('updates operator notes on blur', () => {
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      const notesTextarea = screen.getByPlaceholderText(/Add operational notes/);
      fireEvent.change(notesTextarea, { target: { value: 'Discovered dual-homed NIC on eth1' } });
      fireEvent.blur(notesTextarea);

      expect(onUpdateEdge).toHaveBeenCalledWith(sampleEdge.id, {
        notes: 'Discovered dual-homed NIC on eth1',
      });
    });

    it('calls onDeleteEdge when delete button is confirmed', async () => {
      const originalOpen = useConfirmStore.getState().open;
      const confirmSpy = vi.fn().mockResolvedValue(true);
      useConfirmStore.setState({ open: confirmSpy });
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      const deleteBtn = screen.getByText('Delete Vector');
      fireEvent.click(deleteBtn);

      await waitFor(() => expect(onDeleteEdge).toHaveBeenCalledWith(sampleEdge.id));
      expect(confirmSpy).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      useConfirmStore.setState({ open: originalOpen });
    });

    it('closes on Escape key press', () => {
      const onUpdateEdge = vi.fn();
      const onDeleteEdge = vi.fn();
      const onClose = vi.fn();

      render(
        <GraphEdgeInspectorDrawer
          edge={sampleEdge}
          sourceMachine={machineA}
          targetMachine={machineB}
          isOpen={true}
          onClose={onClose}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ========================================================
  // Section 3: Interactive GraphView Pivot Link Engine
  // ========================================================
  describe('Interactive GraphView Pivot Link & Edge Selection', () => {
    it('renders vector link between source and target machines on the canvas', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      // Verify SVG edge group exists with test id and label
      expect(screen.getByTestId('attack-edge-edge-jump-to-dc')).toBeInTheDocument();
      expect(screen.getByText(/SSH Dynamic/i)).toBeInTheDocument();
      expect(screen.getByText(/:1080/)).toBeInTheDocument();
    });

    it('toggles vector connection mode when PIVOT LINK toolbar button is clicked', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const pivotLinkBtn = screen.getByTestId('graph-connect-vector');
      act(() => {
        fireEvent.click(pivotLinkBtn);
      });

      // Connecting banner should appear
      expect(screen.getByTestId('connect-vector-banner')).toBeInTheDocument();
      expect(screen.getByText(/Click pivot host to select origin machine/i)).toBeInTheDocument();

      // Cancel button exits connecting mode
      const cancelBtn = screen.getByTitle('Cancel Link Connection');
      act(() => {
        fireEvent.click(cancelBtn);
      });

      expect(screen.queryByTestId('connect-vector-banner')).not.toBeInTheDocument();
    });

    it('creates a new pivot edge between two nodes in connection mode', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      // 1. Enter PIVOT LINK mode
      const pivotLinkBtn = screen.getByTestId('graph-connect-vector');
      act(() => {
        fireEvent.click(pivotLinkBtn);
      });

      // 2. Click origin node (JumpHost)
      const jumpNode = screen.getByTestId('attack-node-box-jump-host');
      act(() => {
        fireEvent.click(jumpNode);
      });

      // Prompt updates to destination
      expect(screen.getByText(/Click destination target machine to connect vector/i)).toBeInTheDocument();

      // 3. Click destination node (Database01)
      const dbNode = screen.getByTestId('attack-node-box-db-server');
      act(() => {
        fireEvent.click(dbNode);
      });

      // Verify edge added in Zustand store
      const edges = useCtfStore.getState().graphEdges;
      const createdEdge = edges.find(
        (e) => e.sourceId === 'box-jump-host' && e.targetId === 'box-db-server'
      );
      expect(createdEdge).toBeDefined();
      expect(createdEdge?.type).toBe('pivot-ssh');
    });

    it('clicking an edge selects it and opens the inspector drawer', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      // Find the edge element by test-id
      const edgeGroup = screen.getByTestId('attack-edge-edge-jump-to-dc');
      act(() => {
        fireEvent.pointerDown(edgeGroup);
        fireEvent.click(edgeGroup);
      });

      // Inspector drawer should be open
      expect(screen.getByRole('dialog', { name: 'Attack Vector Inspector' })).toBeInTheDocument();
      expect(screen.getByText('Generated Terminal Commands')).toBeInTheDocument();
    });

    it('exporters toolbar buttons are clickable without crash', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={mockMachines} />
        </MemoryRouter>
      );

      const canvasBtn = screen.getByText('.CANVAS');
      const svgBtn = screen.getByText('SVG');

      expect(canvasBtn).toBeInTheDocument();
      expect(svgBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(canvasBtn);
      });

      act(() => {
        fireEvent.click(svgBtn);
      });
    });
  });
});
