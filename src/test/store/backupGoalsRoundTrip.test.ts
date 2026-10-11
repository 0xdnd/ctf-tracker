import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { useGoalsStore, GOALS_STORAGE_KEY } from '../../store/useGoalsStore';
import { isBackedUpStorageKey } from '../../store/preMigrationBackup';
import { parseBackupGoals } from '../../utils/workspaceStorage';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';

const goal = () => useGoalsStore.getState().weeklyRootTarget;
const setGoal = (n: number | null) => useGoalsStore.getState().setWeeklyRootTarget(n);
const exported = () => JSON.parse(useCtfStore.getState().exportBackup());

describe('backup goals (weeklyRootTarget)', () => {
  beforeEach(() => setGoal(null));
  afterEach(() => releaseRestoreWriteGate());

  it('round-trips the weekly root target through export and import', () => {
    setGoal(12);
    const json = useCtfStore.getState().exportBackup();
    const parsed = JSON.parse(json);
    expect(parsed.goals).toEqual({ weeklyRootTarget: 12 });
    expect(parsed.version).toBe('2.0.0'); // additive optional field, format version unchanged

    setGoal(3);
    expect(useCtfStore.getState().importBackup(json)).toBe(true);
    expect(goal()).toBe(12);
  });

  it('an explicit null goal in the backup clears the current goal', () => {
    const json = useCtfStore.getState().exportBackup();
    expect(JSON.parse(json).goals).toEqual({ weeklyRootTarget: null });
    setGoal(9);
    expect(useCtfStore.getState().importBackup(json)).toBe(true);
    expect(goal()).toBeNull();
  });

  it('an old backup without goals still imports and leaves the current goals untouched', () => {
    const legacy = exported();
    delete legacy.goals;
    setGoal(7);
    expect(useCtfStore.getState().importBackup(JSON.stringify(legacy))).toBe(true);
    expect(goal()).toBe(7);
  });

  it.each([0, -3, 2.5, 1001, '12', true, [], {}])('ignores an invalid weeklyRootTarget (%j) and still imports', (bad) => {
    const backup = exported();
    backup.goals = { weeklyRootTarget: bad };
    setGoal(7);
    expect(useCtfStore.getState().importBackup(JSON.stringify(backup))).toBe(true);
    expect(goal()).toBe(7);
  });

  it('ignores a malformed goals block', () => {
    for (const goals of [null, 'x', 5, [], {}]) {
      const backup = exported();
      backup.goals = goals;
      setGoal(7);
      expect(useCtfStore.getState().importBackup(JSON.stringify(backup))).toBe(true);
      expect(goal()).toBe(7);
    }
  });

  it('validates the range: positive integers up to 1000, or null', () => {
    expect(parseBackupGoals({ weeklyRootTarget: 1 })).toEqual({ weeklyRootTarget: 1 });
    expect(parseBackupGoals({ weeklyRootTarget: 1000 })).toEqual({ weeklyRootTarget: 1000 });
    expect(parseBackupGoals({ weeklyRootTarget: null })).toEqual({ weeklyRootTarget: null });
    expect(parseBackupGoals({ weeklyRootTarget: 1001 })).toBeUndefined();
    expect(parseBackupGoals(undefined)).toBeUndefined();
  });

  it('goals are part of the pre-update snapshot and are not written while the gate is engaged', () => {
    expect(isBackedUpStorageKey(GOALS_STORAGE_KEY)).toBe(true);
    setGoal(4);
    const before = localStorage.getItem(GOALS_STORAGE_KEY);
    expect(JSON.parse(before!).state.weeklyRootTarget).toBe(4);
    engageSchemaWriteGate('restoring');
    setGoal(8);
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before);
  });
});
