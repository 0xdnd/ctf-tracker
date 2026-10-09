import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore, mergeMachinesWithCatalog } from '../../store/useCtfStore';
import { STARTER_MACHINES } from '../../data/starterMachines';
import type { Machine } from '../../types';

const makeBox = (id: string, name: string, status: Machine['status']): Machine =>
  ({
    id,
    name,
    ip: '10.10.x.x',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status,
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }) as Machine;

const reconBox = makeBox('htb-zz-regression-recon', 'ZZ Regression Recon', 'recon');
const rootBox = makeBox('htb-zz-regression-root', 'ZZ Regression Root', 'root');
const backlogBox = makeBox('htb-zz-regression-backlog', 'ZZ Regression Backlog', 'backlog');

describe('in-progress machines outside the boot catalog survive a reload', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fixtures are not in STARTER_MACHINES', () => {
    const ids = new Set(STARTER_MACHINES.map((m) => m.id));
    expect(ids.has(reconBox.id) || ids.has(rootBox.id) || ids.has(backlogBox.id)).toBe(false);
  });

  it('mergeMachinesWithCatalog keeps recon and root machines (no flags/time/notes), drops idle backlog ones', () => {
    const merged = mergeMachinesWithCatalog([reconBox, rootBox, backlogBox]);
    expect(merged.find((m) => m.id === reconBox.id)?.status).toBe('recon');
    expect(merged.find((m) => m.id === rootBox.id)?.status).toBe('root');
    expect(merged.some((m) => m.id === backlogBox.id)).toBe(false);
  });

  it('survives a persist rehydrate', async () => {
    localStorage.setItem(
      'zerobox-tactical-store',
      JSON.stringify({
        state: { machines: [reconBox, rootBox, backlogBox], userSolvesReset: false },
        version: 2,
      })
    );
    await useCtfStore.persist.rehydrate();
    const machines = useCtfStore.getState().machines;
    expect(machines.find((m) => m.id === reconBox.id)?.status).toBe('recon');
    expect(machines.find((m) => m.id === rootBox.id)?.status).toBe('root');
    expect(machines.some((m) => m.id === backlogBox.id)).toBe(false);
  });
});
