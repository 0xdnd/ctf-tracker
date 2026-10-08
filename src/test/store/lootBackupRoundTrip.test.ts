import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { getLootStorageKey, REDACTED } from '../../store/lootPersistence';
import { validateWorkspacePayload } from '../../utils/workspaceStorage';
import type { Credential, CredAttempt, LootItem } from '../../types';

const store = () => useCtfStore.getState();
const stored = () => JSON.parse(localStorage.getItem(getLootStorageKey('guest')) as string);

const cred = (over: Partial<Credential> = {}): Credential => ({
  id: 'c1',
  type: 'password',
  username: 'svc-sql',
  domain: 'CORP',
  secret: 'Summer2026!',
  sourceMachineId: 'm1',
  notes: 'found in web.config',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});
const attempt = (over: Partial<CredAttempt> = {}): CredAttempt => ({
  id: 'a1',
  credId: 'c1',
  machineId: 'm1',
  service: 'mssql',
  port: 1433,
  result: 'valid',
  at: '2026-01-02T00:00:00.000Z',
  ...over,
});
const item = (over: Partial<LootItem> = {}): LootItem => ({
  id: 'l1',
  category: 'flag',
  title: 'Custom Flag',
  value: 'HTB{round_trip}',
  createdAt: '2026-01-03T00:00:00.000Z',
  ...over,
});

const seed = (c: Credential[], a: CredAttempt[], l: LootItem[]) =>
  useCtfStore.setState({ credentials: c, credAttempts: a, lootItems: l });

describe('backup round trip: credentials, attempts, loot items', () => {
  beforeEach(() => {
    localStorage.clear();
    seed([], [], []);
  });

  it('exports and restores all three collections and persists them', () => {
    seed([cred(), cred({ id: 'c2', type: 'hash', username: 'admin', domain: undefined, secret: '31d6cfe0d16ae931b73c59d7e0c089c0', hashType: 'MD5' })], [attempt()], [item()]);
    const json = store().exportBackup();
    const parsed = JSON.parse(json);
    expect(parsed.credentials).toHaveLength(2);
    expect(parsed.credAttempts).toHaveLength(1);
    expect(parsed.lootItems).toHaveLength(1);

    const expected = { credentials: store().credentials, credAttempts: store().credAttempts, lootItems: store().lootItems };
    seed([], [], []);
    expect(store().importBackup(json)).toBe(true);
    expect({ credentials: store().credentials, credAttempts: store().credAttempts, lootItems: store().lootItems }).toEqual(expected);
    expect(stored().credentials).toHaveLength(2);
    expect(stored().credAttempts).toHaveLength(1);
    expect(stored().lootItems).toHaveLength(1);
  });

  it('re-importing the same backup is idempotent (no duplicates)', () => {
    seed([cred(), cred({ id: 'c3', type: 'other', username: 'nopass', secret: '' })], [attempt()], [item()]);
    const json = store().exportBackup();
    store().importBackup(json);
    store().importBackup(json);
    expect(store().credentials).toHaveLength(2);
    expect(store().credAttempts).toHaveLength(1);
    expect(store().lootItems).toHaveLength(1);
  });

  it('a backup without loot fields leaves current loot untouched', () => {
    seed([cred()], [attempt()], [item()]);
    const legacy = JSON.parse(store().exportBackup());
    delete legacy.credentials;
    delete legacy.credAttempts;
    delete legacy.lootItems;
    expect(store().importBackup(JSON.stringify(legacy))).toBe(true);
    expect(store().credentials).toEqual([cred()]);
    expect(store().credAttempts).toEqual([attempt()]);
    expect(store().lootItems).toEqual([item()]);
  });

  it('a backup with only one loot field leaves the others untouched', () => {
    seed([cred()], [attempt()], []);
    const partial = JSON.parse(store().exportBackup());
    delete partial.credentials;
    delete partial.credAttempts;
    partial.lootItems = [item({ id: 'l9' })];
    store().importBackup(JSON.stringify(partial));
    expect(store().credentials).toHaveLength(1);
    expect(store().credAttempts).toHaveLength(1);
    expect(store().lootItems.map((l) => l.id)).toEqual(['l9']);
  });

  it('import merges: existing credentials are kept and equal credKeys collapse onto the existing id', () => {
    seed([cred()], [], []);
    const backup = JSON.parse(store().exportBackup());
    backup.credentials = [
      cred({ id: 'other-id', secret: 'Summer2026!', sourceMachineId: 'm9' }), // same credKey, different id
      cred({ id: 'new', username: 'someone-else' }),
    ];
    backup.credAttempts = [attempt({ id: 'a-remap', credId: 'other-id' }), attempt({ id: 'a-orphan', credId: 'nonexistent' })];
    store().importBackup(JSON.stringify(backup));

    expect(store().credentials.map((c) => c.id).sort()).toEqual(['c1', 'new']);
    expect(store().credentials.find((c) => c.id === 'c1')?.sourceMachineId).toBe('m1');
    // attempt followed its credential onto the surviving id; orphan dropped
    expect(store().credAttempts.map((a) => [a.credId, a.service])).toEqual([['c1', 'mssql']]);
  });

  it('drops malformed entries on import', () => {
    const backup = JSON.parse(store().exportBackup());
    backup.credentials = [cred(), { nope: 1 }, null, 'x'];
    backup.credAttempts = [attempt(), { id: 'bad' }];
    backup.lootItems = [item(), 42];
    store().importBackup(JSON.stringify(backup));
    expect(store().credentials).toHaveLength(1);
    expect(store().credAttempts).toHaveLength(1);
    expect(store().lootItems).toHaveLength(1);
  });

  it('validateWorkspacePayload passes the loot fields through (and strips prototype keys)', () => {
    const polluted = JSON.parse(
      '{"machines":[],"credentials":[{"id":"c","type":"password","username":"u","secret":"s","__proto__":{"x":1}}],"credAttempts":[],"lootItems":[]}'
    );
    const res = validateWorkspacePayload(polluted);
    expect(res.success).toBe(true);
    expect(res.data?.credentials).toHaveLength(1);
    expect(Object.keys(res.data!.credentials![0])).not.toContain('__proto__');
    expect(res.data?.credAttempts).toEqual([]);
    expect(res.data?.lootItems).toEqual([]);
    expect(validateWorkspacePayload({ machines: [] }).data?.credentials).toBeUndefined();
  });
});

describe('backup redaction', () => {
  beforeEach(() => {
    localStorage.clear();
    seed([], [], []);
  });

  it('redactSecrets replaces every credential secret and flags it, without touching live state', () => {
    seed(
      [cred(), cred({ id: 'c2', type: 'key', username: 'root', domain: undefined, secret: '-----BEGIN OPENSSH PRIVATE KEY-----', notes: 'the password is hunter2' })],
      [attempt()],
      [item({ id: 'n', category: 'note', title: 'scratch', value: 'creds: admin / hunter2' }), item({ id: 'svc', category: 'service', title: 'SMB 445', value: 'Samba 4.5' })]
    );
    const redacted = JSON.parse(store().exportBackup({ redactSecrets: true }));
    expect(redacted.isRedacted).toBe(true);
    for (const c of redacted.credentials) {
      expect(c.secret).toBe(REDACTED);
      expect(c.redacted).toBe(true);
    }
    expect(redacted.credentials[0]).toMatchObject({ username: 'svc-sql', domain: 'CORP', notes: 'found in web.config' });
    expect(redacted.credentials[1].notes).toBe(REDACTED);
    expect(redacted.lootItems.find((l: LootItem) => l.id === 'n').value).toBe(REDACTED);
    expect(redacted.lootItems.find((l: LootItem) => l.id === 'svc').value).toBe('Samba 4.5');
    expect(redacted.credAttempts).toHaveLength(1);
    expect(JSON.stringify(redacted)).not.toContain('Summer2026!');
    expect(JSON.stringify(redacted)).not.toContain('OPENSSH PRIVATE KEY');
    // live state intact
    expect(store().credentials[0].secret).toBe('Summer2026!');
    expect(store().credentials[0].redacted).toBeUndefined();
  });

  it('importing a redacted backup never overwrites or downgrades a real credential (same id or same principal)', () => {
    seed([cred()], [attempt()], []);
    const redactedJson = store().exportBackup({ redactSecrets: true });

    // Same workspace: id collision
    expect(store().importBackup(redactedJson)).toBe(true);
    expect(store().credentials).toEqual([cred()]);

    // Same principal under a different id (e.g. backup taken on another machine)
    const other = JSON.parse(redactedJson);
    other.credentials[0].id = 'foreign-id';
    store().importBackup(JSON.stringify(other));
    expect(store().credentials).toEqual([cred()]);
    expect(store().credAttempts).toHaveLength(1);
  });

  it('a redacted backup into an empty workspace restores placeholders; a later real import upgrades them in place', () => {
    seed([cred()], [attempt()], []);
    const redactedJson = store().exportBackup({ redactSecrets: true });
    const realJson = store().exportBackup();

    seed([], [], []);
    store().importBackup(redactedJson);
    expect(store().credentials).toHaveLength(1);
    expect(store().credentials[0]).toMatchObject({ id: 'c1', secret: REDACTED, redacted: true });
    expect(store().credAttempts).toHaveLength(1);

    store().importBackup(realJson);
    expect(store().credentials).toEqual([cred()]);
    expect(store().credAttempts).toHaveLength(1);
  });

  it('a real credential with a different id upgrades the matching placeholder and keeps its attempts attached', () => {
    seed([cred({ secret: REDACTED, redacted: true })], [attempt()], []);
    const incoming = JSON.parse(store().exportBackup());
    incoming.credentials = [cred({ id: 'real-id' })];
    incoming.credAttempts = [];
    store().importBackup(JSON.stringify(incoming));
    expect(store().credentials).toHaveLength(1);
    expect(store().credentials[0]).toMatchObject({ id: 'c1', secret: 'Summer2026!' });
    expect(store().credentials[0].redacted).toBeUndefined();
    expect(store().credAttempts[0].credId).toBe('c1');
  });

  it('an empty-secret credential never collides with another one by key', () => {
    seed([cred({ id: 'e1', username: 'ghost', secret: '' })], [], []);
    const backup = JSON.parse(store().exportBackup());
    backup.credentials = [cred({ id: 'e2', username: 'ghost', secret: '' })];
    store().importBackup(JSON.stringify(backup));
    expect(store().credentials.map((c) => c.id).sort()).toEqual(['e1', 'e2']);
  });
});
