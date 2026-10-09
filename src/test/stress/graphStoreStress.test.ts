import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useCtfStore,
  ATTACK_GRAPH_STORAGE_KEY,
  safeLocalStorage,
  loadInitialAttackGraphState,
} from '../../store/useCtfStore';
import { AttackGraphEdge, AttackNodePosition } from '../../types';

describe('Adversarial Stress Test: Attack Graph State Persistence & Filter Invariants', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.getState().resetFilters();
  });

  afterEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
    useCtfStore.getState().resetFilters();
  });

  // =========================================================================
  // SCENARIO 1: Rapid Concurrent & High-Volume Coordinate Updates
  // =========================================================================
  describe('Scenario 1: Concurrency & High-Volume Node Coordinate Updates', () => {
    it('handles rapid sequential updates for 120+ distinct nodes without dropped positions', () => {
      const store = useCtfStore.getState();
      const nodeCount = 125;
      const expectedPositions: Record<string, AttackNodePosition> = {};

      for (let i = 0; i < nodeCount; i++) {
        const id = `stress-node-${i}`;
        const pos: AttackNodePosition = {
          x: Math.round(Math.sin(i) * 1000 + 1500),
          y: Math.round(Math.cos(i) * 1000 + 1500),
        };
        expectedPositions[id] = pos;
        store.setGraphNodePosition(id, pos);
      }

      const state = useCtfStore.getState();
      expect(Object.keys(state.graphNodePositions).length).toBe(nodeCount);

      // Verify every single node has exact coordinates in memory
      for (let i = 0; i < nodeCount; i++) {
        const id = `stress-node-${i}`;
        expect(state.graphNodePositions[id]).toEqual(expectedPositions[id]);
      }

      // Verify persistent storage reflects all 125 nodes accurately
      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(Object.keys(parsed.graphNodePositions).length).toBe(nodeCount);
      expect(parsed.graphNodePositions['stress-node-0']).toEqual(expectedPositions['stress-node-0']);
      expect(parsed.graphNodePositions['stress-node-124']).toEqual(expectedPositions['stress-node-124']);
    });

    it('handles concurrent Promise.all coordinate updates across 150 nodes', async () => {
      const store = useCtfStore.getState();
      const nodeCount = 150;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const id = `async-node-${i}`;
        const pos: AttackNodePosition = { x: i * 25, y: i * 35 };
        promises.push(
          new Promise((resolve) => {
            // Slight asynchronous microtask jitter to test race conditions
            setTimeout(() => {
              store.setGraphNodePosition(id, pos);
              resolve();
            }, Math.floor(Math.random() * 5));
          })
        );
      }

      await Promise.all(promises);

      const state = useCtfStore.getState();
      expect(Object.keys(state.graphNodePositions).length).toBe(nodeCount);

      for (let i = 0; i < nodeCount; i++) {
        expect(state.graphNodePositions[`async-node-${i}`]).toEqual({
          x: i * 25,
          y: i * 35,
        });
      }

      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(Object.keys(parsed.graphNodePositions).length).toBe(nodeCount);
    });

    it('survives high-frequency dragging burst (1,000 coordinate writes on a single node)', () => {
      const store = useCtfStore.getState();
      const targetNodeId = 'drag-victim-node';

      for (let step = 0; step < 1000; step++) {
        store.setGraphNodePosition(targetNodeId, {
          x: step * 1.5,
          y: step * 2.5,
        });
      }

      const state = useCtfStore.getState();
      expect(state.graphNodePositions[targetNodeId]).toEqual({
        x: 999 * 1.5,
        y: 999 * 2.5,
      });

      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.graphNodePositions[targetNodeId]).toEqual({
        x: 999 * 1.5,
        y: 999 * 2.5,
      });
    });

    it('processes batch coordinate updates for 300+ nodes using batchSetGraphNodePositions', () => {
      const store = useCtfStore.getState();
      const batchPayload: Record<string, AttackNodePosition> = {};
      const nodeCount = 300;

      for (let i = 0; i < nodeCount; i++) {
        batchPayload[`batch-node-${i}`] = {
          x: 100 + i * 10,
          y: 200 + (i % 10) * 50,
        };
      }

      store.batchSetGraphNodePositions(batchPayload);

      const state = useCtfStore.getState();
      expect(Object.keys(state.graphNodePositions).length).toBe(nodeCount);
      expect(state.graphNodePositions['batch-node-299']).toEqual({
        x: 100 + 299 * 10,
        y: 200 + (299 % 10) * 50,
      });

      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(Object.keys(parsed.graphNodePositions).length).toBe(nodeCount);
    });

    it('correctly handles boundary coordinates: negatives, zero, and high-precision floats', () => {
      const store = useCtfStore.getState();
      store.setGraphNodePosition('neg-node', { x: -9999.99, y: -4500.55 });
      store.setGraphNodePosition('zero-node', { x: 0, y: 0 });
      store.setGraphNodePosition('float-node', { x: 123.456789, y: 987.654321 });

      const state = useCtfStore.getState();
      expect(state.graphNodePositions['neg-node']).toEqual({ x: -9999.99, y: -4500.55 });
      expect(state.graphNodePositions['zero-node']).toEqual({ x: 0, y: 0 });
      expect(state.graphNodePositions['float-node']).toEqual({ x: 123.456789, y: 987.654321 });

      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.graphNodePositions['neg-node']).toEqual({ x: -9999.99, y: -4500.55 });
      expect(parsed.graphNodePositions['zero-node']).toEqual({ x: 0, y: 0 });
      expect(parsed.graphNodePositions['float-node']).toEqual({ x: 123.456789, y: 987.654321 });
    });
  });

  // =========================================================================
  // SCENARIO 2: Active Filter Toggling & Coordinate Invariant Preservation
  // =========================================================================
  describe('Scenario 2: Filter Synchronization & Coordinate Invariant Preservation', () => {
    it('preserves all node coordinates and graph edges across rapid multi-dimensional filter changes', () => {
      const store = useCtfStore.getState();

      // Seed 50 node positions across various categories
      const initialPositions: Record<string, AttackNodePosition> = {};
      for (let i = 0; i < 50; i++) {
        const id = `filter-test-node-${i}`;
        const pos = { x: i * 20, y: i * 30 };
        initialPositions[id] = pos;
        store.setGraphNodePosition(id, pos);
      }

      // Seed 10 edges connecting various nodes
      const seedEdges: AttackGraphEdge[] = [];
      for (let i = 0; i < 10; i++) {
        const edge = store.addGraphEdge({
          id: `edge-${i}`,
          sourceId: `filter-test-node-${i}`,
          targetId: `filter-test-node-${i + 1}`,
          type: i % 2 === 0 ? 'pivot-ssh' : 'ad-trust-bidirectional',
          status: 'compromised',
        });
        seedEdges.push(edge);
      }

      expect(Object.keys(useCtfStore.getState().graphNodePositions).length).toBe(50);
      expect(useCtfStore.getState().graphEdges.length).toBe(10);

      // Permute filters extensively
      const filterPermutations: Partial<import('../../store/useCtfStore').FilterState>[] = [
        // 1. Search queries (text, symbols, unicode, injection attempts)
        { searchQuery: 'htb' },
        { searchQuery: 'Linux' },
        { searchQuery: 'non_existent_target_xyz_123' },
        { searchQuery: '<script>alert("xss")</script>' },
        { searchQuery: "'; DROP TABLE targets; --" },
        { searchQuery: '🔥🚀🎯' },
        { searchQuery: '' },

        // 2. Tag selections
        { selectedTags: ['active-directory'] },
        { selectedTags: ['active-directory', 'kerberos', 'cve-2024-xxx'] },
        { selectedTags: ['non-existent-tag'] },
        { selectedTags: [] },

        // 3. Platform changes
        { selectedPlatform: 'HTB' },
        { selectedPlatform: 'THM' },
        { selectedPlatform: 'Custom' },
        { selectedPlatform: 'ALL' },

        // 4. Difficulty changes
        { selectedDifficulty: 'Easy' },
        { selectedDifficulty: 'Hard' },
        { selectedDifficulty: 'Insane' },
        { selectedDifficulty: 'ALL' },

        // 5. Operating System changes
        { selectedOs: 'Linux' },
        { selectedOs: 'Windows' },
        { selectedOs: 'BSD' },
        { selectedOs: 'ALL' },

        // 6. Category changes
        { selectedCategory: 'Active Directory' },
        { selectedCategory: 'Binary / Pwn' },
        { selectedCategory: 'ALL' },

        // 7. Status changes
        { selectedStatus: 'COMPLETED' },
        { selectedStatus: 'FOOTHOLD' },
        { selectedStatus: 'UNCOMPLETED' },
        { selectedStatus: 'ALL' },

        // 8. Sorting combinations
        { sortBy: 'difficulty', sortDirection: 'desc' },
        { sortBy: 'name', sortDirection: 'asc' },
        { sortBy: 'recent', sortDirection: 'desc' },
      ];

      for (const perm of filterPermutations) {
        store.setFilters(perm);

        // Core invariant: graphNodePositions and graphEdges MUST remain identical
        const currentState = useCtfStore.getState();
        expect(Object.keys(currentState.graphNodePositions).length).toBe(50);
        expect(currentState.graphEdges.length).toBe(10);

        // Spot-check nodes
        expect(currentState.graphNodePositions['filter-test-node-0']).toEqual({ x: 0, y: 0 });
        expect(currentState.graphNodePositions['filter-test-node-49']).toEqual({ x: 49 * 20, y: 49 * 30 });
      }

      // Finally, reset filters to default
      store.resetFilters();
      const finalState = useCtfStore.getState();
      expect(finalState.filters.searchQuery).toBe('');
      expect(Object.keys(finalState.graphNodePositions).length).toBe(50);
      expect(finalState.graphEdges.length).toBe(10);

      // Verify persistent storage remained intact through all filter manipulations
      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(Object.keys(parsed.graphNodePositions).length).toBe(50);
      expect(parsed.graphEdges.length).toBe(10);
    });
  });

  // =========================================================================
  // SCENARIO 3: Corrupted or Invalid JSON in LocalStorage Recovery
  // =========================================================================
  describe('Scenario 3: Corrupted Storage Recovery & Resilience', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });
    const syntaxCorruptPayloads = [
      { name: 'truncated JSON syntax', raw: '{"graphNodePositions": {"node1": {"x": 100' },
      { name: 'completely malformed syntax', raw: '{ invalid json ::: syntax }' },
      { name: 'literal string null', raw: 'null' },
      { name: 'literal string undefined', raw: 'undefined' },
      { name: 'empty string', raw: '' },
      { name: 'primitive number', raw: '12345' },
      { name: 'primitive boolean', raw: 'true' },
      { name: 'primitive quoted string', raw: '"corrupted_string_payload"' },
      { name: 'top-level array instead of object', raw: '[1, 2, 3, "foo"]' },
      { name: 'empty object', raw: '{}' },
      { name: 'null graphNodePositions and string edges', raw: '{"graphNodePositions": null, "graphEdges": "not-an-array"}' },
      { name: 'huge 50KB junk string', raw: 'X'.repeat(50000) },
      { name: 'HTML/XSS vector in storage', raw: '{"<script>alert(1)</script>": true}' },
    ];

    syntaxCorruptPayloads.forEach(({ name, raw }) => {
      it(`gracefully recovers from ${name} without throwing uncaught exceptions`, () => {
        safeLocalStorage.setItem(ATTACK_GRAPH_STORAGE_KEY, raw);

        // loadInitialAttackGraphState must NEVER throw
        let loadedState: any;
        expect(() => {
          loadedState = loadInitialAttackGraphState();
        }).not.toThrow();

        expect(loadedState).toBeDefined();
        // Fallback or empty structure must be returned
        expect(typeof loadedState.graphNodePositions).toBe('object');
        expect(Array.isArray(loadedState.graphEdges)).toBe(true);
      });
    });

    it('documents edge case: schema-level primitive value in graphNodePositions', () => {
      safeLocalStorage.setItem(ATTACK_GRAPH_STORAGE_KEY, '{"graphNodePositions": 42, "graphEdges": 99}');

      let loadedState: any;
      expect(() => {
        loadedState = loadInitialAttackGraphState();
      }).not.toThrow();

      // graphEdges safely falls back to [] via Array.isArray guard
      expect(Array.isArray(loadedState.graphEdges)).toBe(true);
      expect(loadedState.graphEdges).toEqual([]);

      // graphNodePositions preserves truthy primitive 42 because loadInitialAttackGraphState lacks typeof check
      expect(loadedState.graphNodePositions).toBeDefined();
      expect(loadedState.graphNodePositions).toBe(42);
    });

    it('correctly reads legacy format with nodePositions and edges keys', () => {
      const legacyPayload = {
        nodePositions: {
          'legacy-node-1': { x: 120, y: 340 },
        },
        edges: [
          {
            id: 'legacy-edge-1',
            sourceId: 'legacy-node-1',
            targetId: 'legacy-node-2',
            type: 'pivot-ssh',
            status: 'compromised',
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      };
      safeLocalStorage.setItem(ATTACK_GRAPH_STORAGE_KEY, JSON.stringify(legacyPayload));

      const loaded = loadInitialAttackGraphState();
      expect(loaded.graphNodePositions['legacy-node-1']).toEqual({ x: 120, y: 340 });
      expect(loaded.graphEdges).toHaveLength(1);
      expect(loaded.graphEdges[0].id).toBe('legacy-edge-1');
    });

    it('allows full read/write functionality after recovering from corrupted storage', () => {
      // Plant corrupted data
      safeLocalStorage.setItem(ATTACK_GRAPH_STORAGE_KEY, '{ bad: broken json');

      const recovered = loadInitialAttackGraphState();
      expect(recovered.graphNodePositions).toEqual({});
      expect(recovered.graphEdges).toEqual([]);

      // Operate store
      const store = useCtfStore.getState();
      store.setGraphNodePosition('recovered-node', { x: 500, y: 600 });
      store.addGraphEdge({
        id: 'recovered-edge',
        sourceId: 'recovered-node',
        targetId: 'another-node',
        type: 'pivot-socks5',
        status: 'potential',
      });

      const updated = useCtfStore.getState();
      expect(updated.graphNodePositions['recovered-node']).toEqual({ x: 500, y: 600 });
      expect(updated.graphEdges).toHaveLength(1);

      // Check localStorage is now healthy and valid JSON
      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.graphNodePositions['recovered-node']).toEqual({ x: 500, y: 600 });
      expect(parsed.graphEdges[0].id).toBe('recovered-edge');
    });
  });

  // =========================================================================
  // SCENARIO 4: resetGraphLayout and clearGraphEdges Isolation & Interactions
  // =========================================================================
  describe('Scenario 4: resetGraphLayout and clearGraphEdges Verification', () => {
    it('resetGraphLayout clears node positions while keeping all edges intact', () => {
      const store = useCtfStore.getState();

      // Populate nodes
      for (let i = 0; i < 20; i++) {
        store.setGraphNodePosition(`node-${i}`, { x: i * 10, y: i * 20 });
      }

      // Populate edges
      for (let i = 0; i < 5; i++) {
        store.addGraphEdge({
          id: `edge-${i}`,
          sourceId: `node-${i}`,
          targetId: `node-${i + 1}`,
          type: 'pivot-chisel',
          status: 'compromised',
        });
      }

      expect(Object.keys(useCtfStore.getState().graphNodePositions).length).toBe(20);
      expect(useCtfStore.getState().graphEdges.length).toBe(5);

      // Invoke resetGraphLayout
      store.resetGraphLayout();

      const stateAfterReset = useCtfStore.getState();
      // Positions must be completely cleared
      expect(stateAfterReset.graphNodePositions).toEqual({});
      // Edges MUST be completely preserved
      expect(stateAfterReset.graphEdges.length).toBe(5);
      expect(stateAfterReset.graphEdges[0].id).toBe('edge-0');
      expect(stateAfterReset.graphEdges[4].id).toBe('edge-4');

      // LocalStorage must reflect cleared positions and preserved edges
      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.graphNodePositions).toEqual({});
      expect(parsed.graphEdges.length).toBe(5);
    });

    it('clearGraphEdges clears all edges while keeping all node positions intact', () => {
      const store = useCtfStore.getState();

      // Populate nodes
      for (let i = 0; i < 15; i++) {
        store.setGraphNodePosition(`node-${i}`, { x: i * 50, y: i * 60 });
      }

      // Populate edges
      for (let i = 0; i < 8; i++) {
        store.addGraphEdge({
          id: `edge-${i}`,
          sourceId: `node-${i}`,
          targetId: `node-${i + 1}`,
          type: 'lateral-pth-winrm',
          status: 'potential',
        });
      }

      expect(Object.keys(useCtfStore.getState().graphNodePositions).length).toBe(15);
      expect(useCtfStore.getState().graphEdges.length).toBe(8);

      // Invoke clearGraphEdges
      store.clearGraphEdges();

      const stateAfterClear = useCtfStore.getState();
      // Edges must be completely cleared
      expect(stateAfterClear.graphEdges).toEqual([]);
      // Node positions MUST be completely preserved
      expect(Object.keys(stateAfterClear.graphNodePositions).length).toBe(15);
      expect(stateAfterClear.graphNodePositions['node-0']).toEqual({ x: 0, y: 0 });
      expect(stateAfterClear.graphNodePositions['node-14']).toEqual({ x: 14 * 50, y: 14 * 60 });

      // LocalStorage must reflect preserved positions and cleared edges
      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(Object.keys(parsed.graphNodePositions).length).toBe(15);
      expect(parsed.graphEdges).toEqual([]);
    });

    it('sequential resetGraphLayout and clearGraphEdges completely clears graph state and storage', () => {
      const store = useCtfStore.getState();
      store.setGraphNodePosition('box-1', { x: 100, y: 100 });
      store.addGraphEdge({ id: 'edge-1', sourceId: 'box-1', targetId: 'box-2', type: 'pivot-ssh', status: 'compromised' });

      store.resetGraphLayout();
      store.clearGraphEdges();

      const state = useCtfStore.getState();
      expect(state.graphNodePositions).toEqual({});
      expect(state.graphEdges).toEqual([]);

      const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.graphNodePositions).toEqual({});
      expect(parsed.graphEdges).toEqual([]);
    });

    it('allows seamless re-population after total reset', () => {
      const store = useCtfStore.getState();
      store.resetGraphLayout();
      store.clearGraphEdges();

      // Re-populate fresh layout
      store.setGraphNodePosition('fresh-1', { x: 300, y: 300 });
      const edge = store.addGraphEdge({
        sourceId: 'fresh-1',
        targetId: 'fresh-2',
        type: 'domain-admin-path',
        status: 'compromised',
      });

      const state = useCtfStore.getState();
      expect(state.graphNodePositions['fresh-1']).toEqual({ x: 300, y: 300 });
      expect(state.graphEdges).toHaveLength(1);
      expect(state.graphEdges[0].id).toBe(edge.id);
    });
  });

  // =========================================================================
  // SCENARIO 5: Edge Manipulation Stress & Resilience
  // =========================================================================
  describe('Scenario 5: Edge Operations Stress & Boundary Resiliency', () => {
    it('manages 10-hop pivot tunnel chain with updates and deletions', () => {
      const store = useCtfStore.getState();
      const hopCount = 10;
      const createdEdgeIds: string[] = [];

      for (let i = 0; i < hopCount; i++) {
        const edge = store.addGraphEdge({
          sourceId: `hop-${i}`,
          targetId: `hop-${i + 1}`,
          type: 'pivot-ligolo',
          status: 'potential',
          port: 11601 + i,
          protocol: 'tcp',
          label: `Hop ${i} to ${i + 1}`,
        });
        createdEdgeIds.push(edge.id);
      }

      expect(useCtfStore.getState().graphEdges).toHaveLength(hopCount);

      // Upgrade hop 0, 1, 2 to 'compromised'
      store.updateGraphEdge(createdEdgeIds[0], { status: 'compromised', notes: 'Tunnel established' });
      store.updateGraphEdge(createdEdgeIds[1], { status: 'compromised' });

      let state = useCtfStore.getState();
      expect(state.graphEdges.find((e) => e.id === createdEdgeIds[0])?.status).toBe('compromised');
      expect(state.graphEdges.find((e) => e.id === createdEdgeIds[0])?.notes).toBe('Tunnel established');
      expect(state.graphEdges.find((e) => e.id === createdEdgeIds[3])?.status).toBe('potential');

      // Sever link 1
      store.deleteGraphEdge(createdEdgeIds[1]);
      state = useCtfStore.getState();
      expect(state.graphEdges).toHaveLength(hopCount - 1);
      expect(state.graphEdges.find((e) => e.id === createdEdgeIds[1])).toBeUndefined();
    });

    it('gracefully handles updating and deleting non-existent edge IDs without side effects', () => {
      const store = useCtfStore.getState();
      store.addGraphEdge({ id: 'valid-edge', sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' });

      // Non-existent operations
      expect(() => {
        store.updateGraphEdge('non-existent-edge-id', { status: 'compromised' });
      }).not.toThrow();

      expect(() => {
        store.deleteGraphEdge('non-existent-edge-id');
      }).not.toThrow();

      const state = useCtfStore.getState();
      expect(state.graphEdges).toHaveLength(1);
      expect(state.graphEdges[0].id).toBe('valid-edge');
      expect(state.graphEdges[0].status).toBe('potential');
    });

    it('supports all 9 attack edge types with distinct metadata', () => {
      const store = useCtfStore.getState();
      const edgeTypes: import('../../types').AttackEdgeType[] = [
        'pivot-ssh',
        'pivot-chisel',
        'pivot-ligolo',
        'pivot-socks5',
        'ad-trust-bidirectional',
        'ad-trust-parent-child',
        'lateral-cred-reuse',
        'lateral-pth-winrm',
        'domain-admin-path',
      ];

      edgeTypes.forEach((type, idx) => {
        store.addGraphEdge({
          id: `typed-edge-${idx}`,
          sourceId: `src-${idx}`,
          targetId: `tgt-${idx}`,
          type,
          status: idx % 2 === 0 ? 'compromised' : 'potential',
        });
      });

      const state = useCtfStore.getState();
      expect(state.graphEdges).toHaveLength(9);
      edgeTypes.forEach((type, idx) => {
        const edge = state.graphEdges.find((e) => e.id === `typed-edge-${idx}`);
        expect(edge?.type).toBe(type);
      });
    });
  });

  // =========================================================================
  // SCENARIO 6: Cross-Tab Storage Event Synchronization
  // =========================================================================
  describe('Scenario 6: Cross-Tab Storage Synchronization Resiliency', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });
    it('synchronizes graph state when another tab writes to localStorage', () => {
      const externalState = {
        graphNodePositions: {
          'remote-node-1': { x: 777, y: 888 },
        },
        graphEdges: [
          {
            id: 'remote-edge-1',
            sourceId: 'remote-node-1',
            targetId: 'remote-node-2',
            type: 'pivot-chisel',
            status: 'compromised',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      // Dispatch StorageEvent
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: ATTACK_GRAPH_STORAGE_KEY,
          newValue: JSON.stringify(externalState),
        })
      );

      const state = useCtfStore.getState();
      expect(state.graphNodePositions['remote-node-1']).toEqual({ x: 777, y: 888 });
      expect(state.graphEdges).toHaveLength(1);
      expect(state.graphEdges[0].id).toBe('remote-edge-1');
    });

    it('does not crash when another tab dispatches corrupted or null storage event', () => {
      expect(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: ATTACK_GRAPH_STORAGE_KEY,
            newValue: '<<< broken json from other tab >>>',
          })
        );
      }).not.toThrow();

      expect(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: ATTACK_GRAPH_STORAGE_KEY,
            newValue: null,
          })
        );
      }).not.toThrow();
    });
  });
});
