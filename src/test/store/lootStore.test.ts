import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import {
  credKey,
  getLegacyProfileLootKey,
  getLootStorageKey,
  saveLootState,
} from '../../store/lootPersistence';
import { identifyHash } from '../../utils/hashIdentifier';

const store = () => useCtfStore.getState();
const stored = (pid = 'guest') => JSON.parse(localStorage.getItem(getLootStorageKey(pid)) as string);

const resetLoot = () => {
  localStorage.clear();
  useCtfStore.setState({ currentProfileId: 'guest', credentials: [], credAttempts: [], lootItems: [] });
};

describe('loot store slice: credentials', () => {
  beforeEach(resetLoot);

  it('credKey: hashes compare case-insensitively, passwords case-sensitively, machine excluded', () => {
    const base = { type: 'password' as const, username: ' Admin ', secret: 'Pw', domain: 'CORP' };
    expect(credKey(base)).toBe(credKey({ ...base, username: 'admin', domain: ' corp ' }));
    expect(credKey(base)).not.toBe(credKey({ ...base, secret: 'pw' }));
    const h = { type: 'hash' as const, username: 'a', secret: 'ABCDEF' };
    expect(credKey(h)).toBe(credKey({ ...h, secret: ' abcdef ' }));
    expect(credKey(base)).not.toBe(credKey({ ...base, type: 'token' as const }));
  });

  it('dedupes: case-insensitive hash, case-sensitive password, existing id returned', () => {
    const h1 = store().addCredential({ type: 'hash', username: 'svc', secret: '31D6CFE0D16AE931B73C59D7E0C089C0' });
    const h2 = store().addCredential({ type: 'hash', username: 'SVC', secret: '31d6cfe0d16ae931b73c59d7e0c089c0' });
    expect(h2).toBe(h1);

    const p1 = store().addCredential({ type: 'password', username: 'svc', secret: 'Winter2026!' });
    const p2 = store().addCredential({ type: 'password', username: 'svc', secret: 'winter2026!' });
    const p3 = store().addCredential({ type: 'password', username: 'SVC', secret: 'Winter2026!' });
    expect(p2).not.toBe(p1);
    expect(p3).toBe(p1);

    const d1 = store().addCredential({ type: 'password', username: 'svc', secret: 'Winter2026!', domain: 'CORP.LOCAL' });
    expect(d1).not.toBe(p1);

    expect(store().credentials).toHaveLength(4);
    expect(stored().credentials).toHaveLength(4);
  });

  it('first capture wins: sourceMachineId is not part of the key and the existing record is untouched', () => {
    const a = store().addCredential({ type: 'password', username: 'u', secret: 's', sourceMachineId: 'm1', notes: 'first' });
    const b = store().addCredential({ type: 'password', username: 'u', secret: 's', sourceMachineId: 'm2', notes: 'second' });
    expect(b).toBe(a);
    expect(store().credentials).toHaveLength(1);
    expect(store().credentials[0]).toMatchObject({ sourceMachineId: 'm1', notes: 'first' });
  });

  it('an empty secret never collides', () => {
    const a = store().addCredential({ type: 'other', username: 'svc_sql', secret: '' });
    const b = store().addCredential({ type: 'other', username: 'svc_sql', secret: '   ' });
    expect(a).not.toBe(b);
    expect(store().credentials).toHaveLength(2);
  });

  it('derives hashType from the top identifyHash candidate for hashes only', () => {
    const secret = '$krb5asrep$23$svc@CORP.LOCAL:aabbcc$ddeeff';
    const id = store().addCredential({ type: 'hash', username: 'svc', secret });
    expect(store().credentials.find((c) => c.id === id)?.hashType).toBe(identifyHash(secret)[0].name);
    const pw = store().addCredential({ type: 'password', username: 'svc', secret: 'x', hashType: 'bogus' });
    expect(store().credentials.find((c) => c.id === pw)?.hashType).toBeUndefined();
    const explicit = store().addCredential({ type: 'hash', username: 'e', secret: 'zz', hashType: 'Custom' });
    expect(store().credentials.find((c) => c.id === explicit)?.hashType).toBe('Custom');
  });

  it('updateCredential patches, re-derives hashType, and rejects edits that duplicate another credential', () => {
    const a = store().addCredential({ type: 'password', username: 'u', secret: 'one' });
    const b = store().addCredential({ type: 'password', username: 'u', secret: 'two' });
    expect(store().updateCredential(a, { notes: 'annotated', domain: 'CORP' })).toBe(true);
    expect(store().credentials.find((c) => c.id === a)).toMatchObject({ notes: 'annotated', domain: 'CORP', secret: 'one' });
    expect(stored().credentials.find((c: { id: string }) => c.id === a).notes).toBe('annotated');

    expect(store().updateCredential(b, { secret: 'one', domain: 'CORP' })).toBe(false);
    expect(store().credentials.find((c) => c.id === b)?.secret).toBe('two');
    expect(store().updateCredential('missing', { notes: 'x' })).toBe(false);

    store().updateCredential(b, { type: 'hash', secret: '5f4dcc3b5aa765d61d8327deb882cf99' });
    expect(store().credentials.find((c) => c.id === b)?.hashType).toBe(identifyHash('5f4dcc3b5aa765d61d8327deb882cf99')[0].name);
    // id and createdAt are immutable
    const before = store().credentials.find((c) => c.id === b)!;
    store().updateCredential(b, { id: 'hijack', createdAt: '1999-01-01T00:00:00.000Z' } as never);
    expect(store().credentials.find((c) => c.id === b)).toMatchObject({ id: b, createdAt: before.createdAt });
  });
});

describe('loot store slice: attempts', () => {
  beforeEach(resetLoot);

  it('upserts on (credId, machineId, service) keeping the latest result and at', () => {
    const credId = store().addCredential({ type: 'password', username: 'u', secret: 's' });
    const first = store().upsertCredAttempt({ credId, machineId: 'm1', service: 'smb', result: 'tried', at: '2026-01-01T00:00:00.000Z' });
    const second = store().upsertCredAttempt({ credId, machineId: 'm1', service: 'smb', result: 'valid', port: 445, at: '2026-01-02T00:00:00.000Z' });
    expect(second).toBe(first);
    expect(store().credAttempts).toHaveLength(1);
    expect(store().credAttempts[0]).toMatchObject({ result: 'valid', at: '2026-01-02T00:00:00.000Z', port: 445 });

    // An older write cannot regress the stored result
    store().upsertCredAttempt({ credId, machineId: 'm1', service: 'smb', result: 'invalid', at: '2025-12-31T00:00:00.000Z' });
    expect(store().credAttempts[0]).toMatchObject({ result: 'valid', at: '2026-01-02T00:00:00.000Z' });

    // A different service or machine is a different attempt
    store().upsertCredAttempt({ credId, machineId: 'm1', service: 'winrm', result: 'tried' });
    store().upsertCredAttempt({ credId, machineId: 'm2', service: 'smb', result: 'tried' });
    expect(store().credAttempts).toHaveLength(3);
    expect(stored().credAttempts).toHaveLength(3);
  });

  it('deleteCredential cascades to its attempts only', () => {
    const a = store().addCredential({ type: 'password', username: 'a', secret: '1' });
    const b = store().addCredential({ type: 'password', username: 'b', secret: '2' });
    store().upsertCredAttempt({ credId: a, machineId: 'm1', service: 'ssh', result: 'valid' });
    store().upsertCredAttempt({ credId: a, machineId: 'm2', service: 'ssh', result: 'tried' });
    store().upsertCredAttempt({ credId: b, machineId: 'm1', service: 'ssh', result: 'tried' });

    store().deleteCredential(a);
    expect(store().credentials.map((c) => c.id)).toEqual([b]);
    expect(store().credAttempts.map((x) => x.credId)).toEqual([b]);
    expect(stored().credentials).toHaveLength(1);
    expect(stored().credAttempts).toHaveLength(1);
  });

  it('deleteCredAttempt removes a single attempt', () => {
    const credId = store().addCredential({ type: 'password', username: 'a', secret: '1' });
    const x = store().upsertCredAttempt({ credId, machineId: 'm1', service: 'ssh', result: 'tried' });
    const y = store().upsertCredAttempt({ credId, machineId: 'm1', service: 'ftp', result: 'tried' });
    store().deleteCredAttempt(x);
    expect(store().credAttempts.map((a) => a.id)).toEqual([y]);
    expect(stored().credAttempts).toHaveLength(1);
  });
});

describe('loot store slice: loot items', () => {
  beforeEach(resetLoot);

  it('adds, updates and deletes loot items with persistence', () => {
    const id = store().addLootItem({ category: 'flag', title: 'Custom Flag', value: 'HTB{x}', machineId: 'm1' });
    expect(store().lootItems).toHaveLength(1);
    expect(stored().lootItems[0]).toMatchObject({ id, category: 'flag', value: 'HTB{x}', machineId: 'm1' });
    store().updateLootItem(id, { notes: 'user proof' });
    expect(store().lootItems[0].notes).toBe('user proof');
    store().updateLootItem('missing', { notes: 'nope' });
    expect(store().lootItems).toHaveLength(1);
    store().deleteLootItem(id);
    expect(store().lootItems).toEqual([]);
    expect(stored().lootItems).toEqual([]);
  });
});

describe('loot store slice: profiles, reset, legacy', () => {
  beforeEach(resetLoot);

  it('switching profiles loads each profile\'s own loot and never leaks edits across', () => {
    saveLootState('loot_p1', {
      credentials: [{ id: 'c-p1', type: 'password', username: 'one', secret: 'pw1', createdAt: '2026-01-01T00:00:00.000Z' }],
      credAttempts: [],
      lootItems: [],
    });
    saveLootState('loot_p2', {
      credentials: [{ id: 'c-p2', type: 'token', username: 'two', secret: 'tk2', createdAt: '2026-01-01T00:00:00.000Z' }],
      credAttempts: [],
      lootItems: [{ id: 'l-p2', category: 'flag', title: 'F', value: 'v', createdAt: '2026-01-01T00:00:00.000Z' }],
    });

    store().loadProfileData('loot_p1');
    expect(store().currentProfileId).toBe('loot_p1');
    expect(store().credentials.map((c) => c.id)).toEqual(['c-p1']);
    expect(store().lootItems).toEqual([]);

    store().addCredential({ type: 'password', username: 'extra', secret: 'x' });

    store().loadProfileData('loot_p2');
    expect(store().credentials.map((c) => c.id)).toEqual(['c-p2']);
    expect(store().lootItems.map((l) => l.id)).toEqual(['l-p2']);
    store().deleteLootItem('l-p2');

    store().loadProfileData('loot_p1');
    expect(store().credentials).toHaveLength(2);
    expect(stored('loot_p1').credentials).toHaveLength(2);
    expect(stored('loot_p2').lootItems).toEqual([]);
    expect(stored('loot_p2').credentials).toHaveLength(1);
  });

  it('loadProfileData migrates a profile\'s legacy v1 loot on first load', () => {
    localStorage.setItem(
      getLegacyProfileLootKey('loot_legacy'),
      JSON.stringify([{ id: 'old-1', targetId: 'global', category: 'password', typeLabel: 'Password', username: 'root', secret: 'toor', discoveredAt: '2026-01-01T00:00:00.000Z', notes: '' }])
    );
    store().loadProfileData('loot_legacy');
    expect(store().credentials).toMatchObject([{ id: 'old-1', type: 'password', username: 'root', secret: 'toor' }]);
    expect(stored('loot_legacy').schemaVersion).toBe(1);
  });

  it('cloneFromCurrent copies the current loot into the new profile', () => {
    store().addCredential({ type: 'password', username: 'carry', secret: 'over' });
    store().loadProfileData('loot_clone', { cloneFromCurrent: true });
    expect(store().currentProfileId).toBe('loot_clone');
    expect(store().credentials).toHaveLength(1);
    expect(stored('loot_clone').credentials).toHaveLength(1);
    // and further edits stay in the clone
    store().addCredential({ type: 'password', username: 'only', secret: 'clone' });
    expect(stored('guest').credentials).toHaveLength(1);
    expect(stored('loot_clone').credentials).toHaveLength(2);
  });

  it('resetAllProgress empties the active profile loot and does not resurrect it from legacy keys', async () => {
    localStorage.setItem(
      getLegacyProfileLootKey('guest'),
      JSON.stringify([{ id: 'old-1', targetId: 'global', category: 'password', typeLabel: 'Password', username: 'root', secret: 'toor', discoveredAt: '2026-01-01T00:00:00.000Z' }])
    );
    store().addCredential({ type: 'password', username: 'u', secret: 's' });
    store().upsertCredAttempt({ credId: store().credentials[0].id, machineId: 'm', service: 'ssh', result: 'valid' });
    store().addLootItem({ category: 'flag', title: 'F', value: 'v' });

    await store().resetAllProgress();

    expect(store().credentials).toEqual([]);
    expect(store().credAttempts).toEqual([]);
    expect(store().lootItems).toEqual([]);
    expect(stored().credentials).toEqual([]);
    expect(localStorage.getItem(getLegacyProfileLootKey('guest'))).toBeNull();

    // A later load (page reload / profile switch) must still see an empty vault
    store().loadProfileData('loot_other');
    store().loadProfileData('guest');
    expect(store().credentials).toEqual([]);
  });

  it('cross-tab storage events refresh the active profile loot', () => {
    const payload = {
      schemaVersion: 1,
      credentials: [{ id: 'remote', type: 'password', username: 'tab2', secret: 'pw', createdAt: '2026-01-01T00:00:00.000Z' }],
      credAttempts: [],
      lootItems: [],
    };
    const newValue = JSON.stringify(payload);
    window.dispatchEvent(new StorageEvent('storage', { key: getLootStorageKey('guest'), newValue }));
    expect(store().credentials.map((c) => c.id)).toEqual(['remote']);
    // Other profile's key is ignored
    window.dispatchEvent(new StorageEvent('storage', { key: getLootStorageKey('someone_else'), newValue: JSON.stringify({ ...payload, credentials: [] }) }));
    expect(store().credentials).toHaveLength(1);
  });
});
