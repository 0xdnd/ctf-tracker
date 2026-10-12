import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import type { AttackGraphEdge } from '../../types';

const edge = (over: Partial<AttackGraphEdge> = {}): AttackGraphEdge => ({
  id: 'e1',
  sourceId: 'm1',
  targetId: 'm2',
  type: 'pivot-ssh',
  status: 'potential',
  label: 'jump',
  notes: 'plain note',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('backup graph round trip', () => {
  beforeEach(() => {
    useCtfStore.getState().resetGraphLayout();
    useCtfStore.getState().clearGraphEdges();
  });

  it('exports and restores graph edges and positions', () => {
    const edges = [edge(), edge({ id: 'e2', status: 'compromised', port: 22 })];
    const positions = { m1: { x: 10, y: 20 }, m2: { x: 30.5, y: -40 } };
    useCtfStore.setState({ graphEdges: edges, graphNodePositions: positions });
    const json = useCtfStore.getState().exportBackup();
    const parsed = JSON.parse(json);
    expect(parsed.graphEdges).toEqual(edges);
    expect(parsed.graphNodePositions).toEqual(positions);

    useCtfStore.setState({ graphEdges: [], graphNodePositions: {} });
    expect(useCtfStore.getState().importBackup(json)).toBe(true);
    expect(useCtfStore.getState().graphEdges).toEqual(edges);
    expect(useCtfStore.getState().graphNodePositions).toEqual(positions);
  });

  it('legacy backup without graph fields leaves graph state untouched', () => {
    const json = useCtfStore.getState().exportBackup();
    const legacy = JSON.parse(json);
    delete legacy.graphEdges;
    delete legacy.graphNodePositions;
    const edges = [edge()];
    useCtfStore.setState({ graphEdges: edges, graphNodePositions: { m1: { x: 1, y: 2 } } });
    expect(useCtfStore.getState().importBackup(JSON.stringify(legacy))).toBe(true);
    expect(useCtfStore.getState().graphEdges).toEqual(edges);
    expect(useCtfStore.getState().graphNodePositions).toEqual({ m1: { x: 1, y: 2 } });
  });

  it('drops malformed graph entries and redacts secret-looking notes', () => {
    useCtfStore.setState({ graphEdges: [edge({ notes: 'password is hunter2' })] });
    const redacted = JSON.parse(useCtfStore.getState().exportBackup({ redactSecrets: true }));
    expect(redacted.graphEdges[0].notes).toBe('[REDACTED]');

    const bad = JSON.parse(useCtfStore.getState().exportBackup());
    bad.graphEdges = [edge(), { nope: 1 }, null];
    bad.graphNodePositions = { m1: { x: 1, y: 2 }, m2: { x: 'a', y: 2 } };
    expect(useCtfStore.getState().importBackup(JSON.stringify(bad))).toBe(true);
    expect(useCtfStore.getState().graphEdges).toHaveLength(1);
    expect(useCtfStore.getState().graphNodePositions).toEqual({ m1: { x: 1, y: 2 } });
  });
});
