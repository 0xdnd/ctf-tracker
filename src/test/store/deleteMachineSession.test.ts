import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const box = (id: string, ip: string, extra: Partial<Machine> = {}): Machine =>
  ({
    id,
    name: id,
    ip,
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    isCustom: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...extra,
  }) as Machine;

const get = () => useCtfStore.getState();
const vars = (targetIp: string) => ({ ...get().globalVars, targetIp });

beforeEach(() => {
  localStorage.clear();
  useCtfStore.setState({
    machines: [box('a', '10.10.10.5'), box('b', '10.10.10.6')],
    deletedMachineIds: [],
    activeTargetId: null,
    selectedMachineId: null,
    activeTimerSeconds: 0,
    isTimerRunning: false,
    timerLastTick: null,
    unexportedChangesCount: 0,
    soundEnabled: false,
    globalVars: vars('10.10.10.X'),
  });
});

describe('deleteMachine clears the session state tied to the machine', () => {
  it('deleting the active machine stops and zeroes the timer and clears the shared target IP', () => {
    useCtfStore.setState({
      activeTargetId: 'a',
      selectedMachineId: 'a',
      isTimerRunning: true,
      activeTimerSeconds: 321,
      timerLastTick: Date.now(),
      globalVars: vars('10.10.10.5'),
    });
    get().deleteMachine('a');
    const s = get();
    expect(s.machines.map((m) => m.id)).toEqual(['b']);
    expect(s.activeTargetId).toBeNull();
    expect(s.selectedMachineId).toBeNull();
    expect(s.isTimerRunning).toBe(false);
    expect(s.activeTimerSeconds).toBe(0);
    expect(s.timerLastTick).toBeNull();
    expect(s.globalVars.targetIp).toBe('10.10.10.X');
  });

  it('deleting another machine leaves the running timer and target IP alone', () => {
    useCtfStore.setState({
      activeTargetId: 'a',
      isTimerRunning: true,
      activeTimerSeconds: 90,
      timerLastTick: 12345,
      globalVars: vars('10.10.10.5'),
    });
    get().deleteMachine('b');
    const s = get();
    expect(s.activeTargetId).toBe('a');
    expect(s.isTimerRunning).toBe(true);
    expect(s.activeTimerSeconds).toBe(90);
    expect(s.timerLastTick).toBe(12345);
    expect(s.globalVars.targetIp).toBe('10.10.10.5');
  });

  it('keeps a target IP that belongs to a different machine', () => {
    useCtfStore.setState({ activeTargetId: 'a', globalVars: vars('10.10.10.6') });
    get().deleteMachine('a');
    expect(get().globalVars.targetIp).toBe('10.10.10.6');
    expect(get().activeTargetId).toBeNull();
  });
});

describe('cross-tab MACHINE_DELETED receiver', () => {
  class FakeChannel {
    static instances: FakeChannel[] = [];
    listeners: Array<(e: { data: unknown }) => void> = [];
    constructor(public name: string) {
      FakeChannel.instances.push(this);
    }
    addEventListener(_t: string, cb: (e: { data: unknown }) => void) {
      this.listeners.push(cb);
    }
    removeEventListener() {}
    postMessage() {}
    close() {}
  }

  beforeEach(() => {
    FakeChannel.instances = [];
    vi.stubGlobal('BroadcastChannel', FakeChannel);
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('applies the same cleanup when another tab deletes the active machine', async () => {
    const { useCtfStore: store } = await import('../../store/useCtfStore');
    const channel = FakeChannel.instances.find((c) => c.listeners.length > 0);
    expect(channel).toBeDefined();
    const profileId = store.getState().currentProfileId || 'guest';
    store.setState({
      machines: [box('a', '10.10.10.5'), box('b', '10.10.10.6')],
      deletedMachineIds: [],
      activeTargetId: 'a',
      selectedMachineId: 'a',
      isTimerRunning: true,
      activeTimerSeconds: 77,
      timerLastTick: Date.now(),
      globalVars: { ...store.getState().globalVars, targetIp: '10.10.10.5' },
    });

    for (const cb of channel!.listeners) {
      await cb({ data: { type: 'MACHINE_DELETED', payload: { id: 'a', profileId, deletedAt: new Date().toISOString() } } });
    }

    const s = store.getState();
    expect(s.machines.map((m) => m.id)).toEqual(['b']);
    expect(s.deletedMachineIds.map((t) => t.id)).toContain('a');
    expect(s.activeTargetId).toBeNull();
    expect(s.selectedMachineId).toBeNull();
    expect(s.isTimerRunning).toBe(false);
    expect(s.activeTimerSeconds).toBe(0);
    expect(s.timerLastTick).toBeNull();
    expect(s.globalVars.targetIp).toBe('10.10.10.X');
  });
});

describe('unexportedChangesCount only counts real data changes', () => {
  it('switching targets with no timer time to fold does not bump the counter', () => {
    useCtfStore.setState({ activeTargetId: 'a', activeTimerSeconds: 0 });
    get().setActiveTarget('b');
    expect(get().activeTargetId).toBe('b');
    expect(get().unexportedChangesCount).toBe(0);
  });

  it('re-selecting the same target without new time does not bump the counter', () => {
    useCtfStore.setState({ activeTargetId: 'a', activeTimerSeconds: 0 });
    get().setActiveTarget('a');
    expect(get().unexportedChangesCount).toBe(0);
  });

  it('switching away after the timer added time bumps the counter once', () => {
    useCtfStore.setState({ activeTargetId: 'a', activeTimerSeconds: 120 });
    get().setActiveTarget('b');
    expect(get().machines.find((m) => m.id === 'a')!.timeSpentSeconds).toBe(120);
    expect(get().unexportedChangesCount).toBe(1);
  });
});
