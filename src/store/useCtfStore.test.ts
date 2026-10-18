import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from './useCtfStore';

const initialStoreSnapshot = useCtfStore.getState();

describe('useCtfStore Zustand store', () => {
  beforeEach(() => {
    // Reset full store state before each test to guarantee complete test isolation
    useCtfStore.setState(initialStoreSnapshot, true);
  });

  it('initializes with default values and machines catalog', () => {
    const state = useCtfStore.getState();
    expect(state.appBrand).toBe('zerobox');
    expect(state.activeTab).toBe('tracker');
    expect(Array.isArray(state.machines)).toBe(true);
    expect(state.machines.length).toBeGreaterThan(0);
  });

  it('updates app brand via setAppBrand', () => {
    useCtfStore.getState().setAppBrand('voidroot');
    expect(useCtfStore.getState().appBrand).toBe('voidroot');
  });

  it('updates active tab via setActiveTab', () => {
    useCtfStore.getState().setActiveTab('methodology');
    expect(useCtfStore.getState().activeTab).toBe('methodology');
  });

  it('updates global variables via setGlobalVars', () => {
    useCtfStore.getState().setGlobalVars({
      targetIp: '10.10.10.250',
      lhost: '10.10.14.50',
      lport: '9001',
    });

    const vars = useCtfStore.getState().globalVars;
    expect(vars.targetIp).toBe('10.10.10.250');
    expect(vars.lhost).toBe('10.10.14.50');
    expect(vars.lport).toBe('9001');
    expect(vars.interface).toBe('tun0'); // untouched field preserved
  });

  it('allows adding, updating, and deleting a custom machine', () => {
    const initialCount = useCtfStore.getState().machines.length;

    useCtfStore.getState().addCustomMachine({
      name: 'TestMachineUnit',
      ip: '10.10.10.199',
      os: 'Linux',
      difficulty: 'Easy',
      platform: 'HTB',
      status: 'backlog',
      openPorts: [80, 22],
      tags: ['web', 'sqli'],
      certifications: [],
      timeSpentSeconds: 0,
    });

    const machinesAfterAdd = useCtfStore.getState().machines;
    expect(machinesAfterAdd.length).toBe(initialCount + 1);

    const addedMachine = machinesAfterAdd.find((m) => m.name === 'TestMachineUnit');
    expect(addedMachine).toBeDefined();
    expect(addedMachine?.id).toMatch(/^custom-/);
    expect(addedMachine?.ip).toBe('10.10.10.199');

    // Update status
    if (addedMachine) {
      useCtfStore.getState().updateMachineStatus(addedMachine.id, 'foothold');
      const updated = useCtfStore.getState().machines.find((m) => m.id === addedMachine.id);
      expect(updated?.status).toBe('foothold');

      // Delete machine
      useCtfStore.getState().deleteMachine(addedMachine.id);
      const afterDelete = useCtfStore.getState().machines.find((m) => m.id === addedMachine.id);
      expect(afterDelete).toBeUndefined();
      expect(useCtfStore.getState().machines.length).toBe(initialCount);
    }
  });

  it('updates and resets filters properly', () => {
    useCtfStore.getState().setFilters({
      searchQuery: 'Windows AD',
      selectedPlatform: 'HTB',
      selectedDifficulty: 'Hard',
    });

    let filters = useCtfStore.getState().filters;
    expect(filters.searchQuery).toBe('Windows AD');
    expect(filters.selectedPlatform).toBe('HTB');
    expect(filters.selectedDifficulty).toBe('Hard');

    useCtfStore.getState().resetFilters();
    filters = useCtfStore.getState().filters;
    expect(filters.searchQuery).toBe('');
    expect(filters.selectedPlatform).toBe('ALL');
    expect(filters.selectedDifficulty).toBe('ALL');
  });

  it('lazily hydrates full master catalog via loadCatalog()', async () => {
    expect(useCtfStore.getState().isCatalogLoaded).toBe(false);
    await useCtfStore.getState().loadCatalog();
    const state = useCtfStore.getState();
    expect(state.isCatalogLoaded).toBe(true);
    expect(state.machines.length).toBeGreaterThan(50);
  });
});
