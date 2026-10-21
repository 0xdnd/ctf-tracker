import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadLootState,
  mergeImportedLoot,
  normalizeCredential,
  normalizeLootItem,
  patchCredential,
  redactCredential,
  saveLootState,
} from '../../store/lootPersistence';
import type { Credential, LootItem } from '../../types';

const verifications = {
  m1: { status: 'admin', protocol: 'smb', updatedAt: '2026-01-02T00:00:00.000Z' },
  m2: { status: 'failed' },
} as const;

const cred = (over: Partial<Credential> = {}): Credential => ({
  id: 'cred_1',
  type: 'password',
  username: 'svc',
  secret: 'pw',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});
const item = (over: Partial<LootItem> = {}): LootItem => ({
  id: 'loot_1',
  category: 'note',
  title: 't',
  value: 'v',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('lootPersistence: verifications', () => {
  beforeEach(() => localStorage.clear());

  it('keeps credential and loot item verifications across save -> load', () => {
    saveLootState('p1', {
      credentials: [cred({ verifications: { ...verifications } })],
      credAttempts: [],
      lootItems: [item({ verifications: { ...verifications } })],
    });
    const loaded = loadLootState('p1');
    expect(loaded.credentials[0].verifications).toEqual(verifications);
    expect(loaded.lootItems[0].verifications).toEqual(verifications);
  });

  it('keeps verifications through patch, redaction and import merge', () => {
    const c = cred({ verifications: { ...verifications } });
    const patched = patchCredential([c], 'cred_1', { notes: 'x' });
    expect(patched?.[0].verifications).toEqual(verifications);
    expect(redactCredential(c).verifications).toEqual(verifications);
    const merged = mergeImportedLoot(
      { credentials: [], credAttempts: [], lootItems: [] },
      { credentials: [c], lootItems: [item({ verifications: { ...verifications } })] }
    );
    expect(merged?.credentials[0].verifications).toEqual(verifications);
    expect(merged?.lootItems[0].verifications).toEqual(verifications);
  });

  it('drops entries with an invalid status or empty machine id, trims keys', () => {
    const c = normalizeCredential({
      ...cred(),
      verifications: { ' m1 ': { status: 'user' }, m2: { status: 'root' }, '  ': { status: 'user' }, m3: 'user' },
    });
    expect(c?.verifications).toEqual({ m1: { status: 'user' } });
  });

  it('ignores non-object verifications', () => {
    for (const bad of ['admin', 5, null, ['x'], true]) {
      expect(normalizeCredential({ ...cred(), verifications: bad })).not.toHaveProperty('verifications');
      expect(normalizeLootItem({ ...item(), verifications: bad })).not.toHaveProperty('verifications');
    }
  });

  it('omits the field when nothing valid remains', () => {
    const c = normalizeCredential({ ...cred(), verifications: { m1: { status: 'nope' } } });
    const l = normalizeLootItem({ ...item(), verifications: {} });
    expect(c).not.toHaveProperty('verifications');
    expect(l).not.toHaveProperty('verifications');
  });
});
