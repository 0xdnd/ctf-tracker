import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../../types';
import { SCHEMA_VERSION } from '../../utils/schemaWriteGate';

// Each test boots a fresh store module against a prepared localStorage, so "reload" is just a second import.
const PROFILE_KEY = 'zerobox_operator_profile_guest';
const STORE_KEY = 'zerobox-tactical-store';
const START = Date.parse('2026-10-12T09:00:00.000Z');

const box = (id: string, extra: Partial<Machine> = {}): Machine =>
  ({
    id,
    name: id,
    ip: '10.10.10.5',
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

type StoreModule = typeof import('../../store/useCtfStore');

const boot = async (): Promise<StoreModule> => {
  vi.resetModules();
  return import('../../store/useCtfStore');
};

const storedProfile = () => JSON.parse(localStorage.getItem(PROFILE_KEY) as string);
const storedSeconds = (id: string) =>
  storedProfile().machines.find((m: Machine) => m.id === id)?.timeSpentSeconds;
const tacticalSeconds = (id: string) =>
  JSON.parse(localStorage.getItem(STORE_KEY) as string).state.machines.find((m: Machine) => m.id === id)
    ?.timeSpentSeconds;

let ticker: ReturnType<typeof setInterval> | null = null;
/** Mirrors App.tsx: tickTimer runs once a second while the app is open. */
const startTicking = (mod: StoreModule) => {
  ticker = setInterval(() => mod.useCtfStore.getState().tickTimer(), 1000);
};
const stopTicking = () => {
  if (ticker) clearInterval(ticker);
  ticker = null;
};

/** A returning user: both the profile copy and the persisted store blob hold the same data. */
const seedStorage = (machines: Machine[], activeTargetId: string) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ machines, activeTargetId }));
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ state: { currentProfileId: 'guest', machines, activeTargetId }, version: SCHEMA_VERSION })
  );
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ now: START });
  seedStorage([box('custom-a'), box('custom-b', { timeSpentSeconds: 30 })], 'custom-a');
});

afterEach(() => {
  stopTicking();
  vi.useRealTimers();
});

describe('timer autosave', () => {
  it('pause writes the shown time to storage immediately', async () => {
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    startTicking(mod);
    s().startTimer();
    vi.advanceTimersByTime(7_000);
    s().pauseTimer();

    // No debounce wait: the write already happened.
    expect(s().activeTimerSeconds).toBe(7);
    expect(storedSeconds('custom-a')).toBe(7);
    expect(tacticalSeconds('custom-a')).toBe(7);
  });

  it('checkpoints every 60 s while running, and does not write per tick', async () => {
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    startTicking(mod);
    vi.advanceTimersByTime(10_000); // settle boot
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    s().startTimer();

    vi.advanceTimersByTime(59_000);
    expect(spy.mock.calls.filter((c) => c[0] === PROFILE_KEY)).toHaveLength(0);

    vi.advanceTimersByTime(66_000); // 125 s total
    const profileWrites = spy.mock.calls.filter((c) => c[0] === PROFILE_KEY);
    expect(profileWrites).toHaveLength(2);
    expect(s().activeTimerSeconds).toBe(125);
    expect(storedSeconds('custom-a')).toBe(120);
    expect(tacticalSeconds('custom-a')).toBe(120);
    spy.mockRestore();
  });

  it('saves edits made while the timer runs within the 1.2 s debounce (ticks no longer push it back)', async () => {
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    startTicking(mod);
    s().startTimer();
    vi.advanceTimersByTime(10_500);
    s().setGlobalVars({ targetIp: '10.10.11.99' });

    vi.advanceTimersByTime(1_300);
    expect(storedProfile().globalVars.targetIp).toBe('10.10.11.99');
  });

  it('marking root, switching target and resetting persist immediately', async () => {
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    startTicking(mod);
    s().startTimer();
    vi.advanceTimersByTime(90_000);

    s().updateMachineStatus('custom-a', 'root');
    expect(s().isTimerRunning).toBe(false);
    expect(storedSeconds('custom-a')).toBe(90);
    expect(storedProfile().machines.find((m: Machine) => m.id === 'custom-a').timeToRootSeconds).toBe(90);
    expect(s().machines.find((m) => m.id === 'custom-a')?.timeSpentSeconds).toBe(90);

    s().setActiveTarget('custom-b');
    expect(storedProfile().activeTargetId).toBe('custom-b');
    expect(s().activeTimerSeconds).toBe(30);
    s().startTimer();
    vi.advanceTimersByTime(5_000);
    s().setActiveTarget('custom-a');
    expect(storedSeconds('custom-b')).toBe(35);

    s().resetTimer('custom-b');
    expect(storedSeconds('custom-b')).toBe(0);
  });

  it('after a crash, reload restores the last checkpoint paused and never counts the downtime', async () => {
    let mod = await boot();
    startTicking(mod);
    mod.useCtfStore.getState().startTimer();
    vi.advanceTimersByTime(150_000); // checkpoints at 60 s and 120 s
    // Crash: no pause, no beforeunload, no visibilitychange.
    stopTicking();
    vi.setSystemTime(Date.now() + 3 * 60 * 60 * 1000); // tab was dead for 3 hours

    mod = await boot();
    const s = () => mod.useCtfStore.getState();
    expect(s().activeTargetId).toBe('custom-a');
    expect(s().isTimerRunning).toBe(false);
    expect(s().activeTimerSeconds).toBe(120);
    expect(s().machines.find((m) => m.id === 'custom-a')?.timeSpentSeconds).toBe(120);

    // Resuming continues from the checkpoint (not from 0, not from 3 h later).
    startTicking(mod);
    s().startTimer();
    vi.advanceTimersByTime(5_000);
    s().pauseTimer();
    expect(s().activeTimerSeconds).toBe(125);
    expect(storedSeconds('custom-a')).toBe(125);
  });

  it('closing the tab mid-run saves the exact seconds to both stored copies', async () => {
    let mod = await boot();
    startTicking(mod);
    mod.useCtfStore.getState().startTimer();
    vi.advanceTimersByTime(95_000);
    window.dispatchEvent(new Event('beforeunload'));
    expect(storedSeconds('custom-a')).toBe(95);
    expect(tacticalSeconds('custom-a')).toBe(95);
    stopTicking();

    mod = await boot();
    expect(mod.useCtfStore.getState().activeTimerSeconds).toBe(95);
    expect(mod.useCtfStore.getState().isTimerRunning).toBe(false);
  });

  it('switching target right after reload keeps the saved time (no overwrite with 0)', async () => {
    seedStorage([box('custom-a', { timeSpentSeconds: 4000 }), box('custom-b')], 'custom-a');
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    expect(s().activeTimerSeconds).toBe(4000);
    s().setActiveTarget('custom-b');
    expect(storedSeconds('custom-a')).toBe(4000);
  });

  it('writes nothing while idle', async () => {
    const mod = await boot();
    startTicking(mod);
    vi.advanceTimersByTime(10_000); // settle boot
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    vi.advanceTimersByTime(5 * 60_000);
    expect(spy.mock.calls.map((c) => c[0])).toEqual([]);
    spy.mockRestore();
  });
});
