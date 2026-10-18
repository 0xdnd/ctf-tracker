import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCtfStore, ATTACK_GRAPH_STORAGE_KEY, safeLocalStorage } from '../../store/useCtfStore';
import { AttackNodePosition } from '../../types';

describe('useCtfStore - Attack Graph & Pivot Topology Slice', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  afterEach(() => {
    safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  it('manages single node coordinates with setGraphNodePosition and persists to storage', () => {
    const store = useCtfStore.getState();
    const pos: AttackNodePosition = { x: 250, y: 400 };

    store.setGraphNodePosition('mach-1', pos);

    const updated = useCtfStore.getState();
    expect(updated.graphNodePositions['mach-1']).toEqual({ x: 250, y: 400 });

    const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.graphNodePositions['mach-1']).toEqual({ x: 250, y: 400 });
  });

  it('manages batch coordinates with batchSetGraphNodePositions', () => {
    const store = useCtfStore.getState();
    const batch: Record<string, AttackNodePosition> = {
      'mach-1': { x: 100, y: 150 },
      'mach-2': { x: 300, y: 450 },
      'mach-3': { x: 500, y: 200 },
    };

    store.batchSetGraphNodePositions(batch);

    const updated = useCtfStore.getState();
    expect(updated.graphNodePositions['mach-1']).toEqual({ x: 100, y: 150 });
    expect(updated.graphNodePositions['mach-2']).toEqual({ x: 300, y: 450 });
    expect(updated.graphNodePositions['mach-3']).toEqual({ x: 500, y: 200 });

    const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.graphNodePositions['mach-2']).toEqual({ x: 300, y: 450 });
  });

  it('resets custom graph layout with resetGraphLayout', () => {
    const store = useCtfStore.getState();
    store.setGraphNodePosition('mach-1', { x: 100, y: 200 });
    expect(Object.keys(useCtfStore.getState().graphNodePositions).length).toBe(1);

    store.resetGraphLayout();
    expect(useCtfStore.getState().graphNodePositions).toEqual({});

    const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.graphNodePositions).toEqual({});
  });

  it('adds directional graph edge with addGraphEdge, generating ID and timestamp if omitted', () => {
    const store = useCtfStore.getState();
    const createdEdge = store.addGraphEdge({
      sourceId: 'mach-foothold',
      targetId: 'mach-internal-dc',
      type: 'pivot-chisel',
      status: 'compromised',
      port: 8000,
      protocol: 'tcp',
      notes: 'Initial reverse tunnel foothold',
    });

    expect(createdEdge.id).toBeTruthy();
    expect(createdEdge.createdAt).toBeTruthy();
    expect(createdEdge.type).toBe('pivot-chisel');
    expect(createdEdge.status).toBe('compromised');

    const edges = useCtfStore.getState().graphEdges;
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe(createdEdge.id);

    const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.graphEdges).toHaveLength(1);
    expect(parsed.graphEdges[0].sourceId).toBe('mach-foothold');
  });

  it('updates existing edge properties with updateGraphEdge', () => {
    const store = useCtfStore.getState();
    const created = store.addGraphEdge({
      id: 'edge-to-update',
      sourceId: 'src-1',
      targetId: 'tgt-1',
      type: 'ad-trust-bidirectional',
      status: 'potential',
    });

    expect(created.status).toBe('potential');

    store.updateGraphEdge('edge-to-update', {
      status: 'compromised',
      notes: 'Trust validated via DCSync',
    });

    const edges = useCtfStore.getState().graphEdges;
    const target = edges.find((e) => e.id === 'edge-to-update');
    expect(target?.status).toBe('compromised');
    expect(target?.notes).toBe('Trust validated via DCSync');

    const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.graphEdges[0].status).toBe('compromised');
  });

  it('deletes an edge with deleteGraphEdge and clears all with clearGraphEdges', () => {
    const store = useCtfStore.getState();
    store.addGraphEdge({ id: 'edge-1', sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'compromised' });
    store.addGraphEdge({ id: 'edge-2', sourceId: 'b', targetId: 'c', type: 'lateral-pth-winrm', status: 'potential' });

    expect(useCtfStore.getState().graphEdges).toHaveLength(2);

    store.deleteGraphEdge('edge-1');
    expect(useCtfStore.getState().graphEdges).toHaveLength(1);
    expect(useCtfStore.getState().graphEdges[0].id).toBe('edge-2');

    store.clearGraphEdges();
    expect(useCtfStore.getState().graphEdges).toHaveLength(0);

    const raw = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.graphEdges).toHaveLength(0);
  });

  it('preserves node positions and edges independently of active filter state', () => {
    const store = useCtfStore.getState();
    store.setGraphNodePosition('mach-linux-1', { x: 150, y: 250 });
    store.setGraphNodePosition('mach-windows-2', { x: 450, y: 350 });
    store.addGraphEdge({
      id: 'edge-cross-os',
      sourceId: 'mach-linux-1',
      targetId: 'mach-windows-2',
      type: 'pivot-ligolo',
      status: 'compromised',
    });

    // Actively apply OS filter to Linux only
    store.setFilters({ selectedOs: 'Linux', searchQuery: 'linux' });
    expect(useCtfStore.getState().filters.selectedOs).toBe('Linux');

    // State invariant: graph positions and edges must NOT be wiped or filtered out of the core store
    const positions = useCtfStore.getState().graphNodePositions;
    expect(positions['mach-linux-1']).toEqual({ x: 150, y: 250 });
    expect(positions['mach-windows-2']).toEqual({ x: 450, y: 350 });

    const edges = useCtfStore.getState().graphEdges;
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe('edge-cross-os');

    // Reset filters
    store.resetFilters();
    expect(useCtfStore.getState().graphNodePositions['mach-windows-2']).toEqual({ x: 450, y: 350 });
  });

  it('resets graph layout and edges when resetAllProgress is triggered', async () => {
    const store = useCtfStore.getState();
    store.setGraphNodePosition('mach-temp', { x: 50, y: 50 });
    store.addGraphEdge({ id: 'edge-temp', sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' });

    expect(Object.keys(useCtfStore.getState().graphNodePositions).length).toBe(1);
    expect(useCtfStore.getState().graphEdges.length).toBe(1);

    await store.resetAllProgress();

    expect(useCtfStore.getState().graphNodePositions).toEqual({});
    expect(useCtfStore.getState().graphEdges).toEqual([]);
    expect(safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY)).toBeNull();
  });
});
