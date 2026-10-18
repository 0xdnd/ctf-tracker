import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import {
  buildBackupFile,
  checkBackupIntegrity,
  importBackupFile,
  registerBackupImageProvider,
  type BackupImageRecord,
} from '../../store/backupFile';
import {
  BACKUP_CHECKSUM_MISMATCH_MESSAGE,
  canonicalJson,
  computeBackupChecksum,
  verifyBackupChecksum,
} from '../../utils/backupChecksum';
import { decryptBackup, encryptBackup } from '../../utils/backupCrypto';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';
import { saveVaultToIndexedDb, upsertVaultNotesFromBackup } from '../../utils/indexedDbVault';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { Machine } from '../../types';

// setup.ts mocks the vault module globally; backup v3 reads and writes the real one (against an in-memory double).
vi.unmock('../../utils/indexedDbVault');

const get = () => useCtfStore.getState();
const OLD = '2024-01-01T00:00:00.000Z';
const PASSPHRASE = 'correct horse battery staple';

const box = (over: Partial<Machine> = {}): Machine =>
  ({
    id: 'custom-1-lab',
    name: 'Lab Box',
    ip: '10.10.10.5',
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    isCustom: true,
    createdAt: OLD,
    updatedAt: OLD,
    ...over,
  }) as Machine;

const note = (id: string, title = id): CptsNoteEntry =>
  ({
    id,
    title,
    titleEn: title,
    category: 'web',
    rawCategory: 'web',
    subCategory: '',
    tags: [],
    difficulty: 'easy',
    summary: `${title} summary`,
  }) as unknown as CptsNoteEntry;

const vaultNotes = (fake: FakeIndexedDb) =>
  ((fake.records.get('vault_data') as { notes?: CptsNoteEntry[] } | undefined)?.notes ?? []).map((n) => n.id).sort();

/** Everything a restore could touch, for "nothing changed" assertions. */
const snapshotAll = (fake: FakeIndexedDb) =>
  JSON.stringify({
    machines: get().machines,
    globalVars: get().globalVars,
    customNotes: get().customNotes,
    exam: useExamStore.getState().scratchNotes,
    examCandidate: useExamStore.getState().candidateName,
    vault: fake.records.get('vault_data') ?? null,
  });

let fake: FakeIndexedDb;

beforeEach(async () => {
  fake = installFakeIndexedDb();
  if (typeof globalThis.crypto?.subtle === 'undefined') vi.stubGlobal('crypto', webcrypto);
  localStorage.clear();
  useCtfStore.setState({
    machines: [box({ notes: 'found a login form' } as Partial<Machine>)],
    globalVars: { ...get().globalVars, lhost: '10.10.14.7', customVars: { API_TOKEN: 'tok-123', wordlist: 'rockyou' } },
    customNotes: [],
  });
  useExamStore.setState({ scratchNotes: 'exam log: pivot via chisel', candidateName: 'Backup Tester' });
  await saveVaultToIndexedDb({ notes: [note('n1', 'SQLi'), note('n2', 'SSRF')], wikilinkMap: { sqli: 'n1' } });
});

afterEach(() => {
  registerBackupImageProvider(null);
  releaseRestoreWriteGate();
  fake.uninstall();
  vi.unstubAllGlobals();
});

describe('backup v3: format', () => {
  it('canonical JSON ignores key order and pretty-printing', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe(
      canonicalJson(JSON.parse('{ "a": { "c": null, "d": [2, { "y": 2, "z": 1 }] }, "b": 1 }'))
    );
  });

  it('exports 3.0.0 with every 2.0.0 field, the exam snapshot, the vault notes and a valid checksum', async () => {
    const file = JSON.parse(await buildBackupFile());
    expect(file.version).toBe('3.0.0');
    for (const key of [
      'exportedAt', 'isRedacted', 'machines', 'globalVars', 'cheatsheets', 'activitySessions', 'customNotes',
      'userNotes', 'userWikilinkMap', 'deletedNoteIds', 'userSolvesReset', 'themePreset', 'graphEdges',
      'graphNodePositions', 'credentials', 'credAttempts', 'lootItems', 'goals',
    ]) {
      expect(file).toHaveProperty(key);
    }
    expect(file.examState).toMatchObject({ scratchNotes: 'exam log: pivot via chisel', candidateName: 'Backup Tester' });
    expect(file.examState).not.toHaveProperty('remainingSeconds'); // only the persisted (partialize) fields
    expect(file.indexedDb.notes.map((n: CptsNoteEntry) => n.id)).toEqual(['n1', 'n2']);
    expect(file.indexedDb).not.toHaveProperty('images');
    expect(file.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(await computeBackupChecksum(file)).toBe(file.checksum);
  });
});

describe('backup v3: import', () => {
  it('round-trips: core, exam state and vault notes come back (vault notes are upserted)', async () => {
    const text = await buildBackupFile();

    useCtfStore.setState({ machines: [], globalVars: { ...get().globalVars, lhost: '1.2.3.4' } });
    useExamStore.setState({ scratchNotes: 'overwritten', candidateName: 'Someone Else' });
    await saveVaultToIndexedDb({ notes: [note('n1', 'SQLi edited later'), note('n3', 'Local only')], wikilinkMap: {} });

    const result = await importBackupFile(text);
    expect(result).toEqual({ ok: true, verified: true, warnings: [] });
    expect(get().machines.find((m) => m.id === 'custom-1-lab')).toBeTruthy();
    expect(get().globalVars.lhost).toBe('10.10.14.7');
    expect(useExamStore.getState().scratchNotes).toBe('exam log: pivot via chisel');
    expect(useExamStore.getState().candidateName).toBe('Backup Tester');
    expect(vaultNotes(fake)).toEqual(['n1', 'n2', 'n3']);
    const vault = fake.records.get('vault_data') as { notes: CptsNoteEntry[]; wikilinkMap: Record<string, string> };
    expect(vault.notes.find((n) => n.id === 'n1')?.title).toBe('SQLi'); // the backup copy wins
    expect(vault.wikilinkMap).toEqual({ sqli: 'n1' });
  });

  it('rejects a tampered file with a clear error and changes nothing', async () => {
    const file = JSON.parse(await buildBackupFile());
    file.globalVars.lhost = '6.6.6.6';
    file.examState.scratchNotes = 'tampered';
    file.indexedDb.notes.push(note('evil'));
    const tampered = JSON.stringify(file, null, 2);

    useCtfStore.setState({ globalVars: { ...get().globalVars, lhost: '1.2.3.4' } });
    useExamStore.setState({ scratchNotes: 'current' });
    const before = snapshotAll(fake);

    const result = await importBackupFile(tampered);
    expect(result).toEqual({ ok: false, reason: 'checksum', message: BACKUP_CHECKSUM_MISMATCH_MESSAGE });
    expect(snapshotAll(fake)).toBe(before);

    // The other entry points refuse it too: the merge pre-check and a direct synchronous importBackup.
    expect(await checkBackupIntegrity(tampered)).toMatchObject({ reason: 'checksum' });
    expect(get().importBackup(tampered)).toBe(false);
    expect(snapshotAll(fake)).toBe(before);
  });

  it('rejects a file whose checksum field itself was edited', async () => {
    const file = JSON.parse(await buildBackupFile());
    file.checksum = file.checksum.replace(/^./, (c: string) => (c === '0' ? '1' : '0'));
    const before = snapshotAll(fake);
    expect(await importBackupFile(JSON.stringify(file))).toMatchObject({ ok: false, reason: 'checksum' });
    expect(snapshotAll(fake)).toBe(before);
  });

  it('round-trips through encryption: the checksum is computed on the plaintext and verified after decrypting', async () => {
    const plaintext = await buildBackupFile();
    const envelope = await encryptBackup(plaintext, PASSPHRASE);
    expect(envelope).not.toContain(JSON.parse(plaintext).checksum);

    useCtfStore.setState({ globalVars: { ...get().globalVars, lhost: '1.2.3.4' } });
    useExamStore.setState({ scratchNotes: 'overwritten' });

    const decrypted = await decryptBackup(envelope, PASSPHRASE);
    expect(decrypted).toBe(plaintext);
    expect(await importBackupFile(decrypted)).toEqual({ ok: true, verified: true, warnings: [] });
    expect(get().globalVars.lhost).toBe('10.10.14.7');
    expect(useExamStore.getState().scratchNotes).toBe('exam log: pivot via chisel');
  }, 60_000);

  it('still imports a 2.0.0 fixture exactly as before (no checksum, exam state untouched)', async () => {
    const fixture = JSON.stringify({
      version: '2.0.0',
      exportedAt: OLD,
      isRedacted: false,
      machines: [box({ id: 'custom-2-legacy', name: 'Legacy Box' })],
      globalVars: { ...get().globalVars, lhost: '10.10.14.2' },
      cheatsheets: get().cheatsheets,
      activitySessions: [],
      customNotes: [],
      userNotes: [],
      userWikilinkMap: {},
      deletedNoteIds: [],
      userSolvesReset: false,
    });
    useExamStore.setState({ scratchNotes: 'keep me' });

    expect(await importBackupFile(fixture)).toEqual({ ok: true, verified: false, warnings: [] });
    expect(get().machines.some((m) => m.id === 'custom-2-legacy')).toBe(true);
    expect(get().globalVars.lhost).toBe('10.10.14.2');
    expect(useExamStore.getState().scratchNotes).toBe('keep me');
    expect(vaultNotes(fake)).toEqual(['n1', 'n2']);
    // The synchronous store path is unchanged for it as well.
    expect(get().importBackup(fixture)).toBe(true);
  });

  it('refuses a 3.0.0 import while the schema write gate is engaged and changes nothing', async () => {
    const text = await buildBackupFile();
    useExamStore.setState({ scratchNotes: 'current' });
    const before = snapshotAll(fake);
    engageSchemaWriteGate('restoring');
    expect(await importBackupFile(text)).toMatchObject({ ok: false, reason: 'gated' });
    releaseRestoreWriteGate();
    expect(snapshotAll(fake)).toBe(before);
  });

  it('includes and restores images through a registered provider', async () => {
    const restored: BackupImageRecord[][] = [];
    registerBackupImageProvider({
      exportImages: async () => [{ id: 'img-1', mime: 'image/png', data: 'AAAA' }],
      restoreImages: async (images) => {
        restored.push(images);
      },
    });
    const text = await buildBackupFile();
    expect(JSON.parse(text).indexedDb.images).toEqual([{ id: 'img-1', mime: 'image/png', data: 'AAAA' }]);
    expect(await importBackupFile(text)).toMatchObject({ ok: true, verified: true });
    expect(restored).toEqual([[{ id: 'img-1', mime: 'image/png', data: 'AAAA' }]]);
  });
});

describe('backup v3: redaction', () => {
  it('redacts the core as before and the redacted file is still checksummed and importable', async () => {
    const text = await buildBackupFile({ redactSecrets: true });
    const file = JSON.parse(text);
    expect(file.isRedacted).toBe(true);
    expect(file.globalVars.lhost).toBe('10.10.14.X');
    expect(file.globalVars.customVars).toEqual({ API_TOKEN: '[REDACTED]', wordlist: 'rockyou' });
    expect(text).not.toContain('tok-123');
    expect(await verifyBackupChecksum(file)).toBe('verified');
    expect(await importBackupFile(text)).toMatchObject({ ok: true, verified: true });
  });

  it('leaves out images, notes and exam state entirely when redacted, with a valid checksum', async () => {
    registerBackupImageProvider({
      exportImages: async () => [{ id: 'img-1', mime: 'image/png', data: 'AAAA' }],
      restoreImages: async () => {},
    });
    const text = await buildBackupFile({ redactSecrets: true });
    const file = JSON.parse(text);
    expect(file.indexedDb).not.toHaveProperty('images');
    expect(file.indexedDb).not.toHaveProperty('notes');
    expect(file).not.toHaveProperty('examState');
    expect(text).not.toContain('exam log: pivot via chisel');
    expect(file.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(await computeBackupChecksum(file)).toBe(file.checksum);
  });
});

describe('backup v3: write-gate TOCTOU and checksum hardening (regression)', () => {
  it('importBackup returns false and changes nothing while gated (2.0.0 path)', () => {
    const fixture = JSON.stringify({
      version: '2.0.0',
      exportedAt: OLD,
      isRedacted: false,
      machines: [box({ id: 'custom-gated', name: 'Gated Box' })],
      globalVars: { ...get().globalVars, lhost: '9.9.9.9' },
      cheatsheets: get().cheatsheets,
      activitySessions: [],
      customNotes: [],
      userNotes: [],
      userWikilinkMap: {},
      deletedNoteIds: [],
      userSolvesReset: false,
    });
    const before = snapshotAll(fake);
    engageSchemaWriteGate('restoring');
    expect(get().importBackup(fixture)).toBe(false);
    expect(snapshotAll(fake)).toBe(before);
  });

  it('importBackup accepts a v3 core without checksum (absent compat for exportBackup/sync cores)', async () => {
    const core = get().exportBackup();
    const parsed = JSON.parse(core);
    expect(parsed.version).toBe('3.0.0');
    expect(parsed).not.toHaveProperty('checksum');
    expect(await verifyBackupChecksum(parsed)).toBe('absent');

    useCtfStore.setState({ machines: [], globalVars: { ...get().globalVars, lhost: '1.2.3.4' } });
    useExamStore.setState({ scratchNotes: 'wiped', candidateName: 'Wiped' });
    expect(get().importBackup(core)).toBe(true);
    expect(get().machines.find((m) => m.id === 'custom-1-lab')).toBeTruthy();
    expect(get().globalVars.lhost).toBe('10.10.14.7');
    expect(useExamStore.getState().scratchNotes).toBe('exam log: pivot via chisel');
  });

  it('importBackupFile accepts v3 without checksum as unverified (absent compat)', async () => {
    const core = get().exportBackup();
    useCtfStore.setState({ machines: [], globalVars: { ...get().globalVars, lhost: '1.2.3.4' } });
    useExamStore.setState({ scratchNotes: 'wiped' });
    const result = await importBackupFile(core);
    expect(result).toMatchObject({ ok: true, verified: false });
    expect(get().machines.find((m) => m.id === 'custom-1-lab')).toBeTruthy();
    expect(useExamStore.getState().scratchNotes).toBe('exam log: pivot via chisel');
  });

  it('upsertVaultNotesFromBackup throws when gated instead of silently succeeding', async () => {
    engageSchemaWriteGate('restoring');
    await expect(upsertVaultNotesFromBackup([note('evil')], {})).rejects.toThrow('Writes are blocked');
    expect(vaultNotes(fake)).toEqual(['n1', 'n2']);
  });

  it('upsertVaultNotesFromBackup throws when the gate engages after the read started (TOCTOU)', async () => {
    const pending = upsertVaultNotesFromBackup([note('n-toctou')], {});
    engageSchemaWriteGate('restoring');
    await expect(pending).rejects.toThrow('Writes are blocked');
    expect(vaultNotes(fake)).toEqual(['n1', 'n2']);
  });

  it('importBackupFile rejects a downgraded version carrying a stale checksum but accepts absent', async () => {
    const file = JSON.parse(await buildBackupFile());
    file.version = '2.0.0';
    const downgraded = JSON.stringify(file);
    const before = snapshotAll(fake);
    expect(await importBackupFile(downgraded)).toMatchObject({ ok: false, reason: 'checksum' });
    expect(snapshotAll(fake)).toBe(before);

    const noChecksum = JSON.parse(await buildBackupFile());
    delete noChecksum.checksum;
    noChecksum.version = '2.0.0';
    useCtfStore.setState({ machines: [] });
    expect(await importBackupFile(JSON.stringify(noChecksum))).toMatchObject({ ok: true });
  });

  it('importBackup warns via console when the exam restore is skipped', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const coreObj = JSON.parse(get().exportBackup());
      coreObj.examState = { bogus: true };
      expect(get().importBackup(JSON.stringify(coreObj))).toBe(true);
      expect(warn).toHaveBeenCalledWith('[ZeroBox] Exam restore skipped: writes blocked.');
    } finally {
      warn.mockRestore();
    }
  });

  it('importBackupFile surfaces an exam warning when writes get blocked right after the core applied', async () => {
    const text = await buildBackupFile();
    const getState = useCtfStore.getState;
    const orig = getState().importBackup;
    const spy = vi.spyOn(useCtfStore, 'getState').mockImplementation(
      () =>
        ({
          ...getState(),
          importBackup: ((s: string, o?: { verifiedChecksum?: string }) => {
            const applied = orig(s, o);
            if (applied) engageSchemaWriteGate('restoring');
            return applied;
          }) as typeof orig,
        }) as unknown as ReturnType<typeof getState>
    );
    try {
      const result = await importBackupFile(text);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.warnings).toContain(
          'Exam data could not be restored (writes blocked). Reload and try again.'
        );
      }
    } finally {
      spy.mockRestore();
      releaseRestoreWriteGate();
    }
  });
});
