import { describe, it, expect, beforeEach, vi } from 'vitest';

const NEWER = JSON.stringify({
  schemaVersion: 99,
  credentials: [{ id: 'x', type: 'password', username: 'u', secret: 's', createdAt: '2026-01-01T00:00:00.000Z' }],
});

// The write gate is process-wide and sticky, so each test boots fresh modules.
const boot = async () => {
  vi.resetModules();
  const loot = await import('../../store/lootPersistence');
  const gate = await import('../../utils/schemaWriteGate');
  return { loot, gate };
};

describe('loot payload from a newer schema', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the stored raw string byte-identical after the app attempts a save', async () => {
    const { loot } = await boot();
    const key = loot.getLootStorageKey('p1');
    localStorage.setItem(key, NEWER);

    const state = loot.loadLootState('p1');
    loot.saveLootState('p1', {
      ...state,
      credentials: [{ id: 'new', type: 'password', username: 'a', secret: 'b', createdAt: '2026-02-01T00:00:00.000Z' }],
    });
    loot.clearLootState('p1');
    loot.removeLootState('p1');

    expect(localStorage.getItem(key)).toBe(NEWER);
    expect(Object.keys(localStorage).filter((k) => k.includes('_corrupted_backup_'))).toHaveLength(0);
  });

  it('engages the newer-schema write gate so the UI can show a notice', async () => {
    const { loot, gate } = await boot();
    localStorage.setItem(loot.getLootStorageKey('p1'), NEWER);
    const seen: string[] = [];
    gate.onSchemaWriteGateEngaged((reason) => seen.push(reason));

    expect(loot.loadLootState('p1')).toEqual({ credentials: [], credAttempts: [], lootItems: [] });
    expect(gate.getSchemaWriteGateReason()).toBe('newer-schema');
    expect(seen).toEqual(['newer-schema']);
  });

  it('still quarantines a corrupt payload without engaging the gate', async () => {
    const { loot, gate } = await boot();
    localStorage.setItem(loot.getLootStorageKey('p1'), '{broken');
    loot.loadLootState('p1');
    expect(gate.getSchemaWriteGateReason()).toBeNull();
  });
});
