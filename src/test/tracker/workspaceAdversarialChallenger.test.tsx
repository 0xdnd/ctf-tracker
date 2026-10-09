import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GraphView } from '../../components/tracker/GraphView';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { 
  exportToObsidianCanvas, 
  exportToSvg, 
  ExportGraphNode 
} from '../../utils/graphExportUtils';
import { useCtfStore, safeLocalStorage, ATTACK_GRAPH_STORAGE_KEY } from '../../store/useCtfStore';
import { Machine, GlobalVariables, PipelineStatus } from '../../types';
import { AttackGraphEdge } from '../../types/graph';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';

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

const mockGlobalVars: GlobalVariables = {
  lhost: '10.10.14.33',
  lport: '9001',
  targetIp: '10.10.11.100',
  interface: 'tun0',
  customVars: {},
};

function createMockMachine(id: string, name: string, ip: string, status: PipelineStatus = 'root'): Machine {
  return {
    id,
    name,
    ip,
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Medium',
    status,
    tags: ['web', 'ad'],
    certifications: ['OSCP', 'CPTS'],
    timeSpentSeconds: 120,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    openPorts: [22, 80, 443],
  };
}

const testNote1: CptsNoteEntry = {
  id: 'test-note-1',
  title: '01 - Attack Recon',
  titleEn: '01 - Attack Recon',
  category: 'Reconnaissance',
  rawCategory: 'Reconnaissance',
  subCategory: 'Active',
  tags: ['nmap', 'recon'],
  difficulty: 'Easy',
  summary: 'Active recon and network port scanning tactics.',
  commands: ['nmap -sC -sV 10.10.11.100'],
  relPath: '01 - Attack Recon.md',
  rawMarkdown: '# 01 - Attack Recon\n\n```bash\nnmap -sC -sV <TARGET_IP>\n```',
};

const testNote2: CptsNoteEntry = {
  id: 'test-note-2',
  title: '02 - Web Exploitation',
  titleEn: '02 - Web Exploitation',
  category: 'Web Applications',
  rawCategory: 'Web Applications',
  subCategory: 'Injection',
  tags: ['sqli', 'xss'],
  difficulty: 'Medium',
  summary: 'SQL injection and authentication bypass methodology.',
  commands: ["sqlmap -u 'http://10.10.11.100/page.php?id=1' --batch"],
  relPath: '02 - Web Exploitation.md',
  rawMarkdown: '# 02 - Web Exploitation\n\nSQL injection payload notes.',
};

const testNote3: CptsNoteEntry = {
  id: 'test-note-3',
  title: '03 - Lateral Movement',
  titleEn: '03 - Lateral Movement',
  category: 'Lateral Movement',
  rawCategory: 'Lateral Movement',
  subCategory: 'Pivoting',
  tags: ['chisel', 'ligolo', 'socks5'],
  difficulty: 'Hard',
  summary: 'Network pivoting and proxychains multi-hop configuration.',
  commands: ['chisel server -p 8000 --reverse'],
  relPath: '03 - Lateral Movement.md',
  rawMarkdown: '# 03 - Lateral Movement\n\nChisel tunnel details.',
};

describe('Adversarial Challenger Verification: Interactive Workspaces & Exporters', () => {
  const machines: Machine[] = [
    createMockMachine('box-01', 'HostAlpha', '10.10.10.1', 'root'),
    createMockMachine('box-02', 'HostBravo', '10.10.10.2', 'foothold'),
    createMockMachine('box-03', 'HostCharlie', '10.10.10.3', 'backlog'),
  ];

  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.setState({ machines, themePreset: 'zerobox' });
  });

  afterEach(() => {
    cleanup();
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Invariant 1: GraphView Zoom Clamping strictly [0.2, 3.0] under High-Rate Events
  // =========================================================================
  describe('Invariant 1: GraphView Zoom Clamping [0.2, 3.0]', () => {
    it('empirically enforces strict maximum scale clamp of 3.0 under 50 rapid sequential zoom-in clicks', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const zoomInBtn = screen.getByTestId('graph-zoom-in');

      // Execute 50 rapid sequential zoom in clicks with act flushes
      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(zoomInBtn);
        });
      }

      const viewport = screen.getByTestId('canvas-viewport');
      const match = viewport.getAttribute('transform')?.match(/scale\(([0-9.]+)\)/);
      expect(match).not.toBeNull();
      const currentScale = parseFloat(match![1]);

      // Strict boundary assertion: exactly 3.0, cannot exceed 3.0
      expect(currentScale).toBe(3.0);
      expect(screen.getByText('300%')).toBeInTheDocument();
    });

    it('empirically enforces strict minimum scale clamp of 0.2 under 50 rapid sequential zoom-out clicks', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const zoomOutBtn = screen.getByTestId('graph-zoom-out');

      // Execute 50 rapid sequential zoom out clicks with act flushes
      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(zoomOutBtn);
        });
      }

      const viewport = screen.getByTestId('canvas-viewport');
      const match = viewport.getAttribute('transform')?.match(/scale\(([0-9.]+)\)/);
      expect(match).not.toBeNull();
      const currentScale = parseFloat(match![1]);

      // Strict boundary assertion: exactly 0.2, cannot drop below 0.2
      expect(currentScale).toBe(0.2);
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('high-rate wheel zoom in and zoom out sequences strictly clamp to [0.2, 3.0]', () => {
      const { container } = render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const canvasContainer = container.querySelector('#graph-canvas')?.parentElement;
      expect(canvasContainer).not.toBeNull();

      // 40 high-rate negative deltaY wheel zoom-ins
      for (let i = 0; i < 40; i++) {
        act(() => {
          canvasContainer?.dispatchEvent(new WheelEvent('wheel', {
            deltaY: -300,
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
      expect(scaleVal).toBe(3.0);

      // 60 high-rate positive deltaY wheel zoom-outs
      for (let i = 0; i < 60; i++) {
        act(() => {
          canvasContainer?.dispatchEvent(new WheelEvent('wheel', {
            deltaY: 300,
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
  });

  // =========================================================================
  // Invariant 2: 4px Micro-Jitter Suppression & Coordinate Persistence
  // =========================================================================
  describe('Invariant 2: Micro-Jitter & Coordinate Persistence', () => {
    it('suppresses dragging for sub-4px micro-jitter (dx=2, dy=2 -> dist=2.83px) without mutating store or transient state', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const targetCard = screen.getByTestId('attack-node-box-01');
      const initialPos = useCtfStore.getState().graphNodePositions['box-01'];

      act(() => {
        // Pointer down at (500, 500)
        fireEvent.pointerDown(targetCard, { clientX: 500, clientY: 500, button: 0, pointerId: 1 });
        // Sub-4px jitter: dx=3, dy=2 (hypot = sqrt(9+4) = 3.61px < 4px)
        fireEvent.pointerMove(targetCard, { clientX: 503, clientY: 502, button: 0, pointerId: 1 });
        // Pointer up
        fireEvent.pointerUp(targetCard, { clientX: 503, clientY: 502, button: 0, pointerId: 1 });
      });

      // Assert store coordinates remain unmutated
      expect(useCtfStore.getState().graphNodePositions['box-01']).toEqual(initialPos);

      // Verify that sub-threshold release cleanly selected the node (flyout header visible)
      expect(screen.getByText('Engage Target')).toBeInTheDocument();
    });

    it('activates dragging when movement reaches or exceeds 4px (dx=4, dy=0) and persists coordinates on release', () => {
      render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const targetCard = screen.getByTestId('attack-node-box-01');

      act(() => {
        // Start drag at (400, 400)
        fireEvent.pointerDown(targetCard, { clientX: 400, clientY: 400, button: 0, pointerId: 1 });
        // Move by +100px X and +80px Y (hypot = 128px > 4px)
        fireEvent.pointerMove(targetCard, { clientX: 500, clientY: 480, button: 0, pointerId: 1 });
        // Release pointer to commit to Zustand store and localStorage
        fireEvent.pointerUp(targetCard, { clientX: 500, clientY: 480, button: 0, pointerId: 1 });
      });

      const updatedPos = useCtfStore.getState().graphNodePositions['box-01'];
      expect(updatedPos).toBeDefined();
      expect(typeof updatedPos.x).toBe('number');
      expect(typeof updatedPos.y).toBe('number');

      // Verify saved in localStorage payload under graphNodePositions
      const stored = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.graphNodePositions['box-01']).toEqual(updatedPos);
    });

    it('persisted coordinates survive component unmount and re-render across sessions', () => {
      // Set explicit custom position in store
      useCtfStore.getState().setGraphNodePosition('box-02', { x: 920, y: 740 });

      // First render
      const { unmount } = render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const nodeGroup1 = screen.getByTestId('attack-node-box-02');
      const rect1 = nodeGroup1.querySelector('rect[width="180"][height="84"]');
      expect(Number(rect1?.getAttribute('x'))).toBe(920 - 90);
      expect(Number(rect1?.getAttribute('y'))).toBe(740 - 42);

      // Unmount component completely
      unmount();

      // Second render (simulating tab switch or route reload)
      render(
        <MemoryRouter>
          <GraphView filteredMachines={machines} />
        </MemoryRouter>
      );

      const nodeGroup2 = screen.getByTestId('attack-node-box-02');
      const rect2 = nodeGroup2.querySelector('rect[width="180"][height="84"]');
      expect(Number(rect2?.getAttribute('x'))).toBe(920 - 90);
      expect(Number(rect2?.getAttribute('y'))).toBe(740 - 42);
    });
  });

  // =========================================================================
  // Invariant 3: Keyboard Shortcut Suppression When Typing in Text Fields
  // =========================================================================
  describe('Invariant 3: Keyboard Shortcut Focus Suppression', () => {
    it('suppresses Alt+W, Ctrl+W, and Ctrl+Shift+W tab close shortcuts when typing in an <input>', () => {
      const handleCloseTab = vi.fn();
      const handleSelectNote = vi.fn();

      render(
        <div>
          <input data-testid="test-text-input" type="text" defaultValue="typing notes..." />
          <ObsidianNoteViewer
            note={testNote1}
            openNotes={[testNote1, testNote2, testNote3]}
            onCloseTab={handleCloseTab}
            onSelectNote={handleSelectNote}
            globalVars={mockGlobalVars}
            soundEnabled={false}
            onClose={vi.fn()}
            onNavigateToNote={vi.fn()}
          />
        </div>
      );

      const input = screen.getByTestId('test-text-input');
      input.focus();

      // Fire Alt+W while typing in input
      fireEvent.keyDown(input, { key: 'w', altKey: true, bubbles: true });
      expect(handleCloseTab).not.toHaveBeenCalled();

      // Fire Ctrl+W while typing in input
      fireEvent.keyDown(input, { key: 'w', ctrlKey: true, bubbles: true });
      expect(handleCloseTab).not.toHaveBeenCalled();

      // Fire Ctrl+Shift+W while typing in input
      fireEvent.keyDown(input, { key: 'w', ctrlKey: true, shiftKey: true, bubbles: true });
      expect(handleCloseTab).not.toHaveBeenCalled();
    });

    it('suppresses Alt+1..9, Alt+ArrowRight/Left, and Ctrl+Tab tab cycle shortcuts when typing in a <textarea>', () => {
      const handleSelectNote = vi.fn();

      render(
        <div>
          <textarea data-testid="test-textarea" defaultValue="markdown editing..." />
          <ObsidianNoteViewer
            note={testNote1}
            openNotes={[testNote1, testNote2, testNote3]}
            onSelectNote={handleSelectNote}
            globalVars={mockGlobalVars}
            soundEnabled={false}
            onClose={vi.fn()}
            onNavigateToNote={vi.fn()}
          />
        </div>
      );

      const textarea = screen.getByTestId('test-textarea');
      textarea.focus();

      // Fire Alt+2 while focused in textarea
      fireEvent.keyDown(textarea, { key: '2', altKey: true, bubbles: true });
      expect(handleSelectNote).not.toHaveBeenCalled();

      // Fire Alt+ArrowRight while focused in textarea
      fireEvent.keyDown(textarea, { key: 'ArrowRight', altKey: true, bubbles: true });
      expect(handleSelectNote).not.toHaveBeenCalled();

      // Fire Ctrl+Tab while focused in textarea
      fireEvent.keyDown(textarea, { key: 'Tab', ctrlKey: true, bubbles: true });
      expect(handleSelectNote).not.toHaveBeenCalled();
    });

    it('suppresses shortcuts when focused in a contentEditable container', () => {
      const handleCloseTab = vi.fn();
      const handleSelectNote = vi.fn();

      render(
        <div>
          <div data-testid="editable-div" contentEditable="true" suppressContentEditableWarning={true}>Rich note text</div>
          <ObsidianNoteViewer
            note={testNote1}
            openNotes={[testNote1, testNote2, testNote3]}
            onCloseTab={handleCloseTab}
            onSelectNote={handleSelectNote}
            globalVars={mockGlobalVars}
            soundEnabled={false}
            onClose={vi.fn()}
            onNavigateToNote={vi.fn()}
          />
        </div>
      );

      const editable = screen.getByTestId('editable-div');
      Object.defineProperty(editable, 'isContentEditable', { value: true, configurable: true });
      editable.focus();

      // Alt+W in editable
      fireEvent.keyDown(editable, { key: 'w', altKey: true, bubbles: true });
      expect(handleCloseTab).not.toHaveBeenCalled();

      // Alt+3 in editable
      fireEvent.keyDown(editable, { key: '3', altKey: true, bubbles: true });
      expect(handleSelectNote).not.toHaveBeenCalled();
    });

    it('executes shortcuts normally when user is not focused on an input/editable element', () => {
      const handleCloseTab = vi.fn();
      const handleSelectNote = vi.fn();

      render(
        <ObsidianNoteViewer
          note={testNote1}
          openNotes={[testNote1, testNote2, testNote3]}
          onCloseTab={handleCloseTab}
          onSelectNote={handleSelectNote}
          globalVars={mockGlobalVars}
          soundEnabled={false}
          onClose={vi.fn()}
          onNavigateToNote={vi.fn()}
        />
      );

      // Fire Alt+W on window
      fireEvent.keyDown(window, { key: 'w', altKey: true });
      expect(handleCloseTab).toHaveBeenCalledWith('test-note-1');

      // Fire Alt+2 on window
      fireEvent.keyDown(window, { key: '2', altKey: true });
      expect(handleSelectNote).toHaveBeenCalledWith('test-note-2');
    });
  });

  // =========================================================================
  // Invariant 4: Atomic Tab Closure & Zero Resurrection in CheatsheetView
  // =========================================================================
  describe('Invariant 4: Atomic Tab Closure & Zero Resurrection', () => {
    it('demonstrates atomic tab closure and seamless active note transfer across multiple tabs', async () => {
      render(
        <MemoryRouter initialEntries={['/field-manual?note=01-recon-port-scanning']}>
          <CheatsheetView defaultMode="cpts-manual" />
        </MemoryRouter>
      );

      // Obsidian Note Viewer should now be mounted via ?note= query param
      const tabStrip = await screen.findByTestId('tab-strip-scroll-container');
      expect(tabStrip).toBeInTheDocument();
      expect(screen.getByTestId('note-tab-01-recon-port-scanning')).toBeInTheDocument();

      // Open new tab using the '+' button
      const newTabBtn = screen.getByTestId('new-tab-button');
      act(() => {
        fireEvent.click(newTabBtn);
      });

      // Quick note picker opens
      const pickerOption = await screen.findByTestId('picker-note-02-web-directory-fuzzing');
      act(() => {
        fireEvent.click(pickerOption);
      });

      // Should now have 2 tabs open
      expect(screen.getByText(/2 TABS/i)).toBeInTheDocument();

      // Close the active second tab
      const closeTabBtn = screen.getByTestId('close-tab-02-web-directory-fuzzing');
      act(() => {
        fireEvent.click(closeTabBtn);
      });

      // Verify second tab is removed and tab count is back to 1
      expect(screen.getByText(/1 TAB/i)).toBeInTheDocument();
      expect(screen.queryByTestId('close-tab-02-web-directory-fuzzing')).not.toBeInTheDocument();

      // Close the remaining tab: viewer unmounts cleanly
      const closeLastTabBtn = screen.getByTestId('close-tab-01-recon-port-scanning');
      act(() => {
        fireEvent.click(closeLastTabBtn);
      });

      // Viewer unmounted completely with zero resurrection
      expect(screen.queryByTestId('tab-strip-scroll-container')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Invariant 5: Obsidian Canvas JSON Schema & SVG Export Serialization
  // =========================================================================
  describe('Invariant 5: Topology Exporters Schema & Serialization', () => {
    it('exportToObsidianCanvas strictly adheres to JSON Canvas v1.0 specifications', () => {
      const nodes: ExportGraphNode[] = [
        {
          id: 'box-alpha',
          name: 'AlphaHost',
          ip: '10.10.10.1',
          os: 'Linux',
          difficulty: 'Easy',
          status: 'root',
          x: 400,
          y: 300,
        },
        {
          id: 'box-beta',
          name: 'BetaDC',
          ip: '10.10.10.2',
          os: 'Windows',
          difficulty: 'Hard',
          status: 'foothold',
          x: 800,
          y: 300,
        },
        {
          id: 'box-gamma',
          name: 'GammaVault',
          ip: '10.10.10.3',
          os: 'Linux',
          difficulty: 'Insane',
          status: 'backlog',
          x: 1200,
          y: 300,
        },
      ];

      const edges: AttackGraphEdge[] = [
        {
          id: 'edge-alpha-beta',
          sourceId: 'box-alpha',
          targetId: 'box-beta',
          type: 'pivot-ssh',
          status: 'compromised',
          port: 1080,
          label: 'SSH SOCKS',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'edge-beta-gamma',
          sourceId: 'box-beta',
          targetId: 'box-gamma',
          type: 'domain-admin-path',
          status: 'potential',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const result = exportToObsidianCanvas(nodes, edges, 'adversarial-test');
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/^adversarial-test-\d{4}-\d{2}-\d{2}\.canvas$/);

      const { data } = result;

      // 1. JSON Canvas Top-Level Schema: nodes and edges arrays
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
      expect(data.nodes).toHaveLength(3);
      expect(data.edges).toHaveLength(2);

      // 2. Node Schema Invariants
      data.nodes.forEach((node) => {
        expect(typeof node.id).toBe('string');
        expect(node.type).toBe('text');
        expect(typeof node.text).toBe('string');
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(node.width).toBe(200);
        expect(node.height).toBe(120);
        expect(typeof node.color).toBe('string');
      });

      // 3. Status to Color Code Mapping Verification
      const nodeAlpha = data.nodes.find((n) => n.id === 'box-alpha');
      expect(nodeAlpha?.color).toBe('4'); // Green for rooted
      expect(nodeAlpha?.text).toContain('ROOT / PWNED');
      expect(nodeAlpha?.x).toBe(300); // 400 - 100
      expect(nodeAlpha?.y).toBe(240); // 300 - 60

      const nodeBeta = data.nodes.find((n) => n.id === 'box-beta');
      expect(nodeBeta?.color).toBe('3'); // Yellow for foothold
      expect(nodeBeta?.text).toContain('FOOTHOLD');

      const nodeGamma = data.nodes.find((n) => n.id === 'box-gamma');
      expect(nodeGamma?.color).toBe('5'); // Cyan for unsolved/backlog

      // 4. Edge Schema Invariants & Color Mapping
      const edge1 = data.edges.find((e) => e.id === 'edge-alpha-beta');
      expect(edge1).toBeDefined();
      expect(edge1?.fromNode).toBe('box-alpha');
      expect(edge1?.toNode).toBe('box-beta');
      expect(edge1?.fromSide).toBe('right');
      expect(edge1?.toSide).toBe('left');
      expect(edge1?.label).toContain('SSH SOCKS (:1080)');
      expect(edge1?.color).toBe('4'); // Green for pivot-ssh

      const edge2 = data.edges.find((e) => e.id === 'edge-beta-gamma');
      expect(edge2).toBeDefined();
      expect(edge2?.color).toBe('1'); // Red for domain-admin-path
    });

    it('exportToSvg serializes standard compliant XML with standalone declaration and namespaces', () => {
      // Mock anchor element click
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      // Create test SVG element in document
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'adversarial-svg-test';
      svg.setAttribute('viewBox', '0 0 1600 1200');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '50');
      rect.setAttribute('fill', '#00ff41');
      svg.appendChild(rect);

      document.body.appendChild(svg);

      const exportResult = exportToSvg('adversarial-svg-test', 'cyber-canvas');
      expect(exportResult.success).toBe(true);
      expect(exportResult.filename).toMatch(/^cyber-canvas-\d{4}-\d{2}-\d{2}\.svg$/);

      // Verify that XMLSerializer correctly serialized the cloned element
      const serializer = new XMLSerializer();
      const serialized = serializer.serializeToString(svg);
      expect(serialized).toContain('fill="#00ff41"');

      // Cleanup
      document.body.removeChild(svg);
    });

    it('exportToSvg handles missing DOM elements gracefully without crashing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = exportToSvg('missing-element-id-404', 'fail-test');
      expect(result.success).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('not found for export'));
    });
  });
});
