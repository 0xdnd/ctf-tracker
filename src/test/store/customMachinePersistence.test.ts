import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  useCtfStore, 
  mergeMachinesWithCatalog, 
  loadCustomMachinesFromStorage, 
  saveCustomMachinesToStorage,
  CUSTOM_MACHINES_STORAGE_KEY,
  getCustomMachinesStorageKey
} from '../../store/useCtfStore';
import { Machine } from '../../types';

describe('Custom Machine Persistence & Update Safety', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('anchors custom machines at the very top (index 0) during mergeMachinesWithCatalog', () => {
    const customBox: Machine = {
      id: 'custom-12345-corp-dc',
      name: 'Corp-DC-01',
      ip: '192.168.1.100',
      os: 'Windows',
      platform: 'Custom',
      difficulty: 'Hard',
      status: 'backlog',
      tags: ['Active Directory', 'Kerberoast'],
      certifications: [],
      timeSpentSeconds: 0,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockCatalog: Machine[] = [
      {
        id: 'htb-legacy',
        name: 'Legacy',
        ip: '10.10.10.4',
        os: 'Windows',
        platform: 'HTB',
        difficulty: 'Easy',
        status: 'completed',
        tags: ['SMB'],
        certifications: ['OSCP'],
        timeSpentSeconds: 3600,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'htb-devel',
        name: 'Devel',
        ip: '10.10.10.5',
        os: 'Windows',
        platform: 'HTB',
        difficulty: 'Easy',
        status: 'completed',
        tags: ['FTP'],
        certifications: ['OSCP'],
        timeSpentSeconds: 3600,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }
    ];

    // Merge custom machine with catalog
    const merged = mergeMachinesWithCatalog([customBox], false, mockCatalog);

    // Custom machine MUST be at index 0 (top of the list)
    expect(merged[0].id).toBe('custom-12345-corp-dc');
    expect(merged[0].name).toBe('Corp-DC-01');
    expect(merged[0].isCustom).toBe(true);

    // Catalog machines follow after custom machines
    expect(merged.length).toBe(3);
    expect(merged[1].id).toBe('htb-legacy');
    expect(merged[2].id).toBe('htb-devel');
  });

  it('unconditionally preserves custom machines with 0 flags and 0 time spent during catalog updates', () => {
    const rawCustom: Machine = {
      id: 'custom-fresh-lab',
      name: 'FreshLab',
      ip: '10.10.10.250',
      os: 'Linux',
      platform: 'Custom',
      difficulty: 'Medium',
      status: 'backlog',
      tags: [],
      certifications: [],
      timeSpentSeconds: 0,
      // No flags, no quick notes, no writeup
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const merged = mergeMachinesWithCatalog([rawCustom], false);
    const found = merged.find((m) => m.id === 'custom-fresh-lab');
    expect(found).toBeDefined();
    expect(found?.isCustom).toBe(true);
    expect(found?.name).toBe('FreshLab');
  });

  it('saves and loads isolated custom machines to and from dedicated storage', () => {
    const customList: Machine[] = [
      {
        id: 'custom-box-alpha',
        name: 'BoxAlpha',
        ip: '10.10.14.99',
        os: 'Linux',
        platform: 'Custom',
        difficulty: 'Easy',
        status: 'recon',
        tags: ['web'],
        certifications: [],
        timeSpentSeconds: 120,
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    saveCustomMachinesToStorage(customList, 'test_operator');

    const loaded = loadCustomMachinesFromStorage('test_operator');
    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe('BoxAlpha');
    expect(loaded[0].id).toBe('custom-box-alpha');
  });

  it('addCustomMachine automatically syncs with isolated storage and anchors at top', () => {
    useCtfStore.setState({ currentProfileId: 'guest' });

    useCtfStore.getState().addCustomMachine({
      name: 'SurgicalTargetLab',
      ip: '192.168.50.2',
      os: 'Linux',
      platform: 'Custom',
      difficulty: 'Hard',
      status: 'backlog',
      tags: ['Kernel', 'Pwn'],
      certifications: [],
      timeSpentSeconds: 0,
    });

    const machines = useCtfStore.getState().machines;
    const added = machines.find((m) => m.name === 'SurgicalTargetLab');
    expect(added).toBeDefined();
    expect(added?.isCustom).toBe(true);
    expect(machines[0].name).toBe('SurgicalTargetLab'); // Anchored at top

    // Verify it was persisted to dedicated custom storage
    const stored = loadCustomMachinesFromStorage('guest');
    const storedTarget = stored.find((m) => m.name === 'SurgicalTargetLab');
    expect(storedTarget).toBeDefined();
    expect(storedTarget?.id).toBe(added?.id);
  });

  it('restoreDanielSolves preserves custom machines and does not wipe them', async () => {
    // Add custom machine
    useCtfStore.getState().addCustomMachine({
      name: 'UnwipableTarget',
      ip: '10.200.1.1',
      os: 'Windows',
      platform: 'Custom',
      difficulty: 'Insane',
      status: 'foothold',
      tags: ['AD'],
      certifications: [],
      timeSpentSeconds: 500,
    });

    const beforeCount = useCtfStore.getState().machines.length;
    expect(useCtfStore.getState().machines.some((m) => m.name === 'UnwipableTarget')).toBe(true);

    // Call restoreDanielSolves
    await useCtfStore.getState().restoreDanielSolves();

    const afterMachines = useCtfStore.getState().machines;
    const targetAfter = afterMachines.find((m) => m.name === 'UnwipableTarget');
    expect(targetAfter).toBeDefined();
    expect(targetAfter?.isCustom).toBe(true);
    expect(afterMachines[0].name).toBe('UnwipableTarget'); // Still at top
  });

  it('deleteMachine properly removes machine from isolated custom storage', () => {
    useCtfStore.getState().addCustomMachine({
      name: 'TargetToBeDeleted',
      ip: '10.10.10.111',
      os: 'Linux',
      platform: 'Custom',
      difficulty: 'Easy',
      status: 'backlog',
      tags: [],
      certifications: [],
      timeSpentSeconds: 0,
    });

    const added = useCtfStore.getState().machines.find((m) => m.name === 'TargetToBeDeleted');
    expect(added).toBeDefined();
    if (!added) return;

    useCtfStore.getState().deleteMachine(added.id);

    expect(useCtfStore.getState().machines.some((m) => m.id === added.id)).toBe(false);

    // Check isolated storage
    const stored = loadCustomMachinesFromStorage('guest');
    expect(stored.some((m) => m.id === added.id)).toBe(false);
  });
});
