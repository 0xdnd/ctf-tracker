import { describe, it, expect } from 'vitest';
import type { Machine } from '../../types';
import { computeTrackerCounts, isRootedStatus } from '../../hooks/useTrackerCounts';

const box = (id: string, status: Machine['status']) =>
  ({ id, name: id, status } as unknown as Machine);

describe('useTrackerCounts / computeTrackerCounts', () => {
  it('counts rooted machines under either terminal status, backlog/recon as neither', () => {
    const machines = [box('a', 'root'), box('b', 'completed'), box('c', 'foothold'), box('d', 'backlog'), box('e', 'recon')];
    expect(computeTrackerCounts(machines)).toEqual({
      totalMachines: 5,
      rootedMachines: 2,
      footholdMachines: 1,
      pwnPercentage: 40,
    });
  });

  it('returns all zeros (not NaN) for an empty list', () => {
    expect(computeTrackerCounts([])).toEqual({
      totalMachines: 0,
      rootedMachines: 0,
      footholdMachines: 0,
      pwnPercentage: 0,
    });
  });

  it('rounds the percentage', () => {
    const machines = [box('a', 'root'), box('b', 'backlog'), box('c', 'backlog')];
    expect(computeTrackerCounts(machines).pwnPercentage).toBe(33);
  });

  it('isRootedStatus matches exactly root/completed', () => {
    expect(isRootedStatus('root')).toBe(true);
    expect(isRootedStatus('completed')).toBe(true);
    expect(isRootedStatus('foothold')).toBe(false);
    expect(isRootedStatus('recon')).toBe(false);
    expect(isRootedStatus('backlog')).toBe(false);
  });
});
