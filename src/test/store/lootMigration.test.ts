import { describe, it, expect, beforeEach } from 'vitest';
import {
  LEGACY_LOOT_CLAIMED_KEY,
  LEGACY_LOOT_KEY,
  getLegacyProfileLootKey,
  getLootStorageKey,
  loadLootState,
  migrateLegacyLoot,
  saveLootState,
} from '../../store/lootPersistence';

const legacyItem = (over: Record<string, unknown> = {}) => ({
  id: 'custom-1',
  targetId: 'm1',
  targetName: 'Forest',
  targetIp: '10.10.10.161',
  platform: 'HTB',
  category: 'password',
  typeLabel: 'Password',
  username: 'svc-alfresco',
  secret: 'S3cret!',
  discoveredAt: '2026-01-02T00:00:00.000Z',
  notes: 'from smb share',
  isCustom: true,
  ...over,
});

// Old pages stored newest first.
const seedProfileV1 = (pid: string, items: unknown[]) =>
  localStorage.setItem(getLegacyProfileLootKey(pid), JSON.stringify(items));
const seedUnscopedV1 = (items: unknown[]) => localStorage.setItem(LEGACY_LOOT_KEY, JSON.stringify(items));
const readV2 = (pid: string) => JSON.parse(localStorage.getItem(getLootStorageKey(pid)) as string);

describe('lootPersistence: legacy migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates the per-profile v1 key into a versioned v2 payload and keeps the old key', () => {
    const hash = '31d6cfe0d16ae931b73c59d7e0c089c0';
    seedProfileV1('p1', [
      legacyItem({ id: 'f1', category: 'flag', typeLabel: 'Custom Flag', username: '', secret: 'HTB{flag}', targetId: 'global', discoveredAt: '2026-01-06T00:00:00.000Z' }),
      legacyItem({ id: 'svc', category: 'service', typeLabel: 'Service Endpoint', username: 'smb', secret: '445/tcp', discoveredAt: '2026-01-05T00:00:00.000Z' }),
      legacyItem({ id: 'tok', category: 'token', typeLabel: 'Access Token', username: 'api', secret: 'tok_123', discoveredAt: '2026-01-04T00:00:00.000Z' }),
      legacyItem({ id: 'key', category: 'ssh_key', typeLabel: 'SSH Key', username: 'operator', secret: '-----BEGIN OPENSSH PRIVATE KEY-----', discoveredAt: '2026-01-03T00:00:00.000Z' }),
      legacyItem({ id: 'h1', category: 'hash', typeLabel: 'Hash', username: 'admin', secret: hash, targetId: 'global', notes: '', discoveredAt: '2026-01-02T12:00:00.000Z' }),
      legacyItem({ id: 'pw', category: 'password' }),
    ]);

    const state = loadLootState('p1');

    // Oldest first after migration
    expect(state.credentials.map((c) => c.id)).toEqual(['pw', 'h1', 'key', 'tok']);
    const byId = Object.fromEntries(state.credentials.map((c) => [c.id, c]));
    expect(byId.pw).toMatchObject({
      type: 'password',
      username: 'svc-alfresco',
      secret: 'S3cret!',
      sourceMachineId: 'm1',
      notes: 'from smb share',
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    expect(byId.h1.type).toBe('hash');
    expect(byId.h1.hashType).toBeTruthy();
    expect(byId.h1.sourceMachineId).toBeUndefined();
    expect(byId.h1.notes).toBeUndefined();
    expect(byId.key.type).toBe('key');
    expect(byId.tok.type).toBe('token');

    expect(state.lootItems.map((l) => l.id)).toEqual(['svc', 'f1']);
    expect(state.lootItems.find((l) => l.id === 'f1')).toMatchObject({
      category: 'flag',
      title: 'Custom Flag',
      value: 'HTB{flag}',
    });
    expect(state.lootItems.find((l) => l.id === 'svc')).toMatchObject({
      category: 'service',
      username: 'smb',
      value: '445/tcp',
      machineId: 'm1',
    });
    expect(state.credAttempts).toEqual([]);

    const v2 = readV2('p1');
    expect(v2.schemaVersion).toBe(1);
    expect(v2.credentials).toHaveLength(4);
    // Old key untouched
    expect(JSON.parse(localStorage.getItem(getLegacyProfileLootKey('p1')) as string)).toHaveLength(6);
    // A profile's own key never touches the global claim marker
    expect(localStorage.getItem(LEGACY_LOOT_CLAIMED_KEY)).toBeNull();
  });

  it('dedupes migrated credentials by credKey, earliest capture wins', () => {
    seedProfileV1('p1', [
      legacyItem({ id: 'late', username: 'ADMIN', secret: 'Same', targetId: 'm2', discoveredAt: '2026-02-01T00:00:00.000Z' }),
      legacyItem({ id: 'case', username: 'admin', secret: 'same', discoveredAt: '2026-01-15T00:00:00.000Z' }),
      legacyItem({ id: 'early', username: 'admin', secret: 'Same', targetId: 'm1', discoveredAt: '2026-01-01T00:00:00.000Z' }),
      legacyItem({ id: 'hlate', category: 'hash', username: 'u', secret: 'AABBCCDDEEFF00112233445566778899', discoveredAt: '2026-03-01T00:00:00.000Z' }),
      legacyItem({ id: 'hearly', category: 'hash', username: 'U', secret: 'aabbccddeeff00112233445566778899', discoveredAt: '2026-02-01T00:00:00.000Z' }),
    ]);
    const { credentials } = loadLootState('p1');
    expect(credentials.map((c) => c.id).sort()).toEqual(['case', 'early', 'hearly']);
    expect(credentials.find((c) => c.id === 'early')?.sourceMachineId).toBe('m1');
  });

  it('lets exactly one profile claim the legacy unscoped key', () => {
    seedUnscopedV1([legacyItem({ id: 'legacy-1' })]);

    const first = loadLootState('alice');
    expect(first.credentials.map((c) => c.id)).toEqual(['legacy-1']);
    expect(localStorage.getItem(LEGACY_LOOT_CLAIMED_KEY)).toBe('alice');

    const second = loadLootState('bob');
    expect(second).toEqual({ credentials: [], credAttempts: [], lootItems: [] });
    expect(localStorage.getItem(getLootStorageKey('bob'))).toBeNull();

    // Alice keeps her data from v2, bob stays empty on every later load
    expect(loadLootState('alice').credentials).toHaveLength(1);
    expect(loadLootState('bob').credentials).toHaveLength(0);
    // Legacy key itself is kept
    expect(localStorage.getItem(LEGACY_LOOT_KEY)).not.toBeNull();
  });

  it('a profile with its own v1 key does not claim the unscoped key', () => {
    seedUnscopedV1([legacyItem({ id: 'legacy-1' })]);
    seedProfileV1('alice', [legacyItem({ id: 'own-1', username: 'alice' })]);

    expect(loadLootState('alice').credentials.map((c) => c.id)).toEqual(['own-1']);
    expect(localStorage.getItem(LEGACY_LOOT_CLAIMED_KEY)).toBeNull();
    expect(loadLootState('bob').credentials.map((c) => c.id)).toEqual(['legacy-1']);
    expect(localStorage.getItem(LEGACY_LOOT_CLAIMED_KEY)).toBe('bob');
  });

  it('is idempotent: re-running neither changes v2 nor re-claims anything', () => {
    seedUnscopedV1([legacyItem({ id: 'legacy-1' })]);
    const first = loadLootState('alice');
    const rawAfterFirst = localStorage.getItem(getLootStorageKey('alice'));

    expect(migrateLegacyLoot('alice')).toBeNull();
    expect(loadLootState('alice')).toEqual(first);
    expect(localStorage.getItem(getLootStorageKey('alice'))).toBe(rawAfterFirst);
    expect(localStorage.getItem(LEGACY_LOOT_CLAIMED_KEY)).toBe('alice');
  });

  it('v2 data wins over legacy keys and later edits are not overwritten by re-migration', () => {
    seedProfileV1('p1', [legacyItem({ id: 'old' })]);
    loadLootState('p1');
    saveLootState('p1', { credentials: [], credAttempts: [], lootItems: [] });
    expect(loadLootState('p1').credentials).toEqual([]);
  });

  it('returns empty and writes nothing when there is no source', () => {
    expect(loadLootState('fresh')).toEqual({ credentials: [], credAttempts: [], lootItems: [] });
    expect(localStorage.getItem(getLootStorageKey('fresh'))).toBeNull();
    expect(migrateLegacyLoot('fresh')).toBeNull();
  });

  it('survives corrupt legacy data', () => {
    localStorage.setItem(getLegacyProfileLootKey('p1'), '{not json');
    expect(loadLootState('p1')).toEqual({ credentials: [], credAttempts: [], lootItems: [] });
    expect(readV2('p1').schemaVersion).toBe(1);
  });

  it('quarantines a corrupt v2 payload without resurrecting stale v1 data', () => {
    seedProfileV1('p1', [legacyItem({ id: 'old' })]);
    localStorage.setItem(getLootStorageKey('p1'), '{broken');

    expect(loadLootState('p1')).toEqual({ credentials: [], credAttempts: [], lootItems: [] });
    expect(readV2('p1').credentials).toEqual([]);
    const backups = Object.keys(localStorage).filter((k) => k.startsWith(`${getLootStorageKey('p1')}_corrupted_backup_`));
    expect(backups).toHaveLength(1);
    expect(localStorage.getItem(backups[0])).toBe('{broken');
  });

  it('treats a payload from a newer schema as unreadable instead of misreading it', () => {
    const newer = JSON.stringify({ schemaVersion: 99, credentials: [{ id: 'x', type: 'password', username: 'u', secret: 's', createdAt: '2026-01-01T00:00:00.000Z' }] });
    localStorage.setItem(getLootStorageKey('p1'), newer);
    expect(loadLootState('p1').credentials).toEqual([]);
    const backups = Object.keys(localStorage).filter((k) => k.includes('_corrupted_backup_'));
    expect(localStorage.getItem(backups[0])).toBe(newer);
  });

  it('drops malformed v2 entries but keeps valid ones', () => {
    localStorage.setItem(
      getLootStorageKey('p1'),
      JSON.stringify({
        schemaVersion: 1,
        credentials: [
          { id: 'ok', type: 'password', username: 'u', secret: 's', createdAt: '2026-01-01T00:00:00.000Z' },
          null,
          'junk',
        ],
        credAttempts: [{ id: 'a', credId: 'ok', machineId: 'm', service: 'smb', result: 'valid', at: '2026-01-01T00:00:00.000Z' }, { nope: 1 }],
        lootItems: [{ id: 'l', category: 'flag', title: 'F', value: 'v', createdAt: '2026-01-01T00:00:00.000Z' }, 7],
      })
    );
    const s = loadLootState('p1');
    expect(s.credentials.map((c) => c.id)).toEqual(['ok']);
    expect(s.credAttempts.map((a) => a.id)).toEqual(['a']);
    expect(s.lootItems.map((l) => l.id)).toEqual(['l']);
  });
});
