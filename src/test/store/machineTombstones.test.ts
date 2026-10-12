import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore, withTimeSpent } from '../../store/useCtfStore';
import type { Machine } from '../../types';
import {
  TOMBSTONE_RETENTION_MS,
  addMachineTombstone,
  normalizeMachineTombstones,
  pruneMachineTombstones,
} from '../../utils/machineTombstones';

const OLD = '2024-01-01T00:00:00.000Z';
const custom = (id: string, extra: Partial<Machine> = {}): Machine =>
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
    timeSpentSeconds: 60,
    isCustom: true,
    createdAt: OLD,
    updatedAt: OLD,
    ...extra,
  }) as Machine;

const get = () => useCtfStore.getState();
const machine = (id: string) => get().machines.find((m) => m.id === id)!;

beforeEach(() => {
  useCtfStore.setState({
    machines: [custom('custom-a'), custom('custom-b')],
    deletedMachineIds: [],
    activeTargetId: null,
    activeTimerSeconds: 0,
    isTimerRunning: false,
    timerLastTick: null,
  });
});

describe('machine tombstones', () => {
  it('deleteMachine records a tombstone and persists it with the profile', () => {
    get().deleteMachine('custom-a');
    expect(get().machines.some((m) => m.id === 'custom-a')).toBe(false);
    const [t] = get().deletedMachineIds;
    expect(t.id).toBe('custom-a');
    expect(Date.now() - Date.parse(t.deletedAt)).toBeLessThan(5000);
    const profile = JSON.parse(localStorage.getItem('zerobox_operator_profile_guest')!);
    expect(profile.deletedMachineIds).toEqual([t]);
  });

  it('deleting the same id twice keeps one (refreshed) tombstone', () => {
    const list = addMachineTombstone([{ id: 'x', deletedAt: OLD }], 'x', Date.parse('2026-10-01T00:00:00Z'));
    expect(list).toEqual([{ id: 'x', deletedAt: '2026-10-01T00:00:00.000Z' }]);
  });

  it('prunes tombstones older than 180 days', () => {
    const now = Date.parse('2026-10-12T00:00:00Z');
    const fresh = { id: 'fresh', deletedAt: new Date(now - TOMBSTONE_RETENTION_MS + 60_000).toISOString() };
    const stale = { id: 'stale', deletedAt: new Date(now - TOMBSTONE_RETENTION_MS - 60_000).toISOString() };
    expect(pruneMachineTombstones([fresh, stale], now)).toEqual([fresh]);
    expect(addMachineTombstone([stale], 'new', now).map((t) => t.id)).toEqual(['new']);
  });

  it('normalizes untrusted tombstone lists', () => {
    expect(
      normalizeMachineTombstones([
        { id: 'a', deletedAt: OLD },
        { id: 'a', deletedAt: '2025-01-01T00:00:00.000Z' },
        { id: '', deletedAt: OLD },
        { id: 'b', deletedAt: 'not a date' },
        null,
        'x',
      ])
    ).toEqual([{ id: 'a', deletedAt: '2025-01-01T00:00:00.000Z' }]);
    expect(normalizeMachineTombstones(undefined)).toEqual([]);
  });
});

describe('every progress mutation stamps updatedAt', () => {
  it('pauseTimer flushes the timer and stamps updatedAt', () => {
    useCtfStore.setState({ activeTargetId: 'custom-a', activeTimerSeconds: 300, isTimerRunning: true, timerLastTick: Date.now() });
    get().pauseTimer();
    expect(machine('custom-a').timeSpentSeconds).toBe(300);
    expect(machine('custom-a').updatedAt).not.toBe(OLD);
  });

  it('setActiveTarget flushes the previous target and stamps updatedAt', () => {
    useCtfStore.setState({ activeTargetId: 'custom-a', activeTimerSeconds: 420 });
    get().setActiveTarget('custom-b');
    expect(machine('custom-a').timeSpentSeconds).toBe(420);
    expect(machine('custom-a').updatedAt).not.toBe(OLD);
  });

  it('resetTimer stamps updatedAt', () => {
    get().resetTimer('custom-b');
    expect(machine('custom-b').timeSpentSeconds).toBe(0);
    expect(machine('custom-b').updatedAt).not.toBe(OLD);
  });

  it('resetSolvesToZero stamps updatedAt', () => {
    get().resetSolvesToZero();
    expect(get().machines.every((m) => m.updatedAt !== OLD)).toBe(true);
  });

  it('a flush that does not change the time leaves the machine untouched', () => {
    const m = custom('custom-c', { timeSpentSeconds: 90 });
    expect(withTimeSpent(m, 90)).toBe(m);
    expect(withTimeSpent(m, 91, '2026-10-12T00:00:00.000Z')).toMatchObject({ timeSpentSeconds: 91, updatedAt: '2026-10-12T00:00:00.000Z' });
  });
});
