import type { StateCreator } from 'zustand';
import { AttackGraphEdge, AttackNodePosition } from '../../types';
import { saveAttackGraphState } from '../ctfStorage';
import { CtfStoreState, CtfBootData } from '../ctfStoreTypes';

/** Workspace store slice: attack graph node positions and edges. */

export interface GraphSliceState {
  // Attack Graph & Pivot Topology State & Actions
  graphNodePositions: Record<string, AttackNodePosition>;
  graphEdges: AttackGraphEdge[];
  setGraphNodePosition: (id: string, pos: AttackNodePosition) => void;
  batchSetGraphNodePositions: (positions: Record<string, AttackNodePosition>) => void;
  resetGraphLayout: () => void;
  addGraphEdge: (edge: Omit<AttackGraphEdge, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => AttackGraphEdge;
  updateGraphEdge: (id: string, updates: Partial<AttackGraphEdge>) => void;
  deleteGraphEdge: (id: string) => void;
  clearGraphEdges: () => void;
}

export const createGraphSlice = (boot: CtfBootData): StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], GraphSliceState> => (set) => ({
  // Attack Graph & Pivot Topology State
  graphNodePositions: boot.initialAttackGraphData.graphNodePositions,

  graphEdges: boot.initialAttackGraphData.graphEdges,

  // Attack Graph & Pivot Topology Actions
  setGraphNodePosition: (id: string, pos: AttackNodePosition) => {
    set((state) => {
      const nextPositions = {
        ...state.graphNodePositions,
        [id]: pos,
      };
      saveAttackGraphState(nextPositions, state.graphEdges, state.currentProfileId);
      return { graphNodePositions: nextPositions };
    });
  },

  batchSetGraphNodePositions: (positions: Record<string, AttackNodePosition>) => {
    set((state) => {
      const nextPositions = {
        ...state.graphNodePositions,
        ...positions,
      };
      saveAttackGraphState(nextPositions, state.graphEdges, state.currentProfileId);
      return { graphNodePositions: nextPositions };
    });
  },

  resetGraphLayout: () => {
    set((state) => {
      const nextPositions: Record<string, AttackNodePosition> = {};
      saveAttackGraphState(nextPositions, state.graphEdges, state.currentProfileId);
      return { graphNodePositions: nextPositions };
    });
  },

  addGraphEdge: (edge: Omit<AttackGraphEdge, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    const newEdge: AttackGraphEdge = {
      id: edge.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type,
      status: edge.status || 'potential',
      label: edge.label,
      port: edge.port,
      protocol: edge.protocol,
      notes: edge.notes,
      createdAt: edge.createdAt || new Date().toISOString(),
    };
    set((state) => {
      const nextEdges = [...state.graphEdges, newEdge];
      saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
      return { graphEdges: nextEdges };
    });
    return newEdge;
  },

  updateGraphEdge: (id: string, updates: Partial<AttackGraphEdge>) => {
    set((state) => {
      const nextEdges = state.graphEdges.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
      return { graphEdges: nextEdges };
    });
  },

  deleteGraphEdge: (id: string) => {
    set((state) => {
      const nextEdges = state.graphEdges.filter((e) => e.id !== id);
      saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
      return { graphEdges: nextEdges };
    });
  },

  clearGraphEdges: () => {
    set((state) => {
      const nextEdges: AttackGraphEdge[] = [];
      saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
      return { graphEdges: nextEdges };
    });
  },
});
