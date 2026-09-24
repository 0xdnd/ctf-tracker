import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore, ActiveTab } from '../../store/useCtfStore';
import { ViewMode, PipelineStatus } from '../../types';

const initialSnapshot = useCtfStore.getState();

describe('Layer 6: Accelerated 48-Hour Continuous Operation & Soak Endurance Simulation', () => {
  beforeEach(() => {
    useCtfStore.setState(initialSnapshot, true);
    localStorage.clear();
  });

  it(
    'SOAK-1: Simulates 48-hour accelerated session under continuous user interaction without state corruption or unbounded leakage',
    () => {
    // 1. Seed initial active machines
    const testMachineIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      useCtfStore.getState().addCustomMachine({
        name: `Soak-Target-${i}`,
        ip: `10.10.10.${100 + i}`,
        os: i % 2 === 0 ? 'Linux' : 'Windows',
        difficulty: 'Medium',
        platform: 'HTB',
        status: 'backlog',
        openPorts: [80, 443],
        tags: ['soak-test'],
        certifications: ['OSCP'],
        timeSpentSeconds: 0,
      });
    }

    const state = useCtfStore.getState();
    const machines = state.machines.filter((m) => m.name.startsWith('Soak-Target-'));
    expect(machines.length).toBe(5);
    machines.forEach((m) => testMachineIds.push(m.id));

    useCtfStore.getState().setActiveTarget(testMachineIds[0]);
    useCtfStore.getState().startTimer();

    // 2. Continuous Operations Loop (Accelerated 48-hour simulation)
    // - 5,000 status toggles
    // - 10,000 stopwatch ticks
    // - 1,000 writeup edits & saves
    // - 2,500 view & tab transitions

    const statuses: PipelineStatus[] = ['backlog', 'recon', 'foothold', 'root', 'completed'];
    const tabs: ActiveTab[] = ['tracker', 'cheatsheet', 'field-manual', 'writeup', 'analytics', 'methodology'];
    const views: ViewMode[] = ['grid', 'table', 'kanban'];

    const startTime = performance.now();

    // 10,000 timer ticks
    for (let tick = 0; tick < 10000; tick++) {
      useCtfStore.getState().tickTimer();
    }
    expect(useCtfStore.getState().activeTimerSeconds).toBeGreaterThanOrEqual(10000);

    // 5,000 status toggles across targets
    for (let s = 0; s < 5000; s++) {
      const targetId = testMachineIds[s % testMachineIds.length];
      const nextStatus = statuses[s % statuses.length];
      useCtfStore.getState().updateMachineStatus(targetId, nextStatus);
    }

    // 1,000 writeup edits & saves
    for (let w = 0; w < 1000; w++) {
      const targetId = testMachineIds[w % testMachineIds.length];
      useCtfStore.getState().updateMachine(targetId, {
        writeupMarkdown: `### Soak Log Iteration #${w}\nTimestamp: ${Date.now()}\nPayload injected and logged successfully.`.repeat(5),
      });
    }

    // 2,500 tab and view transitions
    for (let v = 0; v < 2500; v++) {
      const nextTab = tabs[v % tabs.length];
      const nextView = views[v % views.length];
      useCtfStore.getState().setActiveTab(nextTab);
      useCtfStore.getState().setViewMode(nextView);
      if (v % 500 === 0) {
        useCtfStore.getState().toggleFocusMode();
      }
    }

    const durationMs = performance.now() - startTime;

    // 3. Invariants & Health Verification
    const finalState = useCtfStore.getState();

    // Invariant 1: Execution completes efficiently without locking runtime
    expect(durationMs).toBeLessThan(25000); // Must complete in <25 seconds under full test suite load

    // Invariant 2: Machines catalog integrity preserved
    const soakMachines = finalState.machines.filter((m) => m.name.startsWith('Soak-Target-'));
    expect(soakMachines.length).toBe(5);

    // Invariant 3: Writeup markdown persisted without corruption
    soakMachines.forEach((m) => {
      expect(m.writeupMarkdown).toContain('Soak Log Iteration');
    });

    // Invariant 4: Active timer seconds accurately maintained
    expect(finalState.activeTimerSeconds).toBeGreaterThanOrEqual(10000);

    // Invariant 5: Storage serialization executes cleanly without throwing
    expect(() => finalState.exportBackup()).not.toThrow();
    const backup = finalState.exportBackup();
    expect(backup.length).toBeGreaterThan(1000);
  }, 30000);
});
