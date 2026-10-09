import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useCtfStore first boot attack graph', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("loads the active profile's attack graph, not the guest/legacy graph", async () => {
    const edge = {
      id: 'e1',
      sourceId: 'a',
      targetId: 'b',
      type: 'exploit',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(
      'rootvector_auth_session',
      JSON.stringify({ state: { user: { id: 'p1' } } })
    );
    localStorage.setItem(
      'zerobox_graph_state_p1',
      JSON.stringify({ graphNodePositions: { a: { x: 1, y: 2 } }, graphEdges: [edge] })
    );
    // Legacy/guest graph with different content must NOT win on first boot.
    localStorage.setItem(
      'zerobox-attack-graph-state',
      JSON.stringify({ graphNodePositions: {}, graphEdges: [] })
    );

    const { useCtfStore } = await import('./useCtfStore');
    const state = useCtfStore.getState();
    expect(state.currentProfileId).toBe('p1');
    expect(state.graphEdges).toHaveLength(1);
    expect(state.graphEdges[0].id).toBe('e1');
    expect(state.graphNodePositions).toEqual({ a: { x: 1, y: 2 } });
  });
});
