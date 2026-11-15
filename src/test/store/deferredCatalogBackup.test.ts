import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../../types';

/**
 * The catalog loads after first paint, so a backup or sync export (or an import) can run while it is still in
 * flight. These paths must wait for the one atomic merge and never see the pre-catalog rows.
 */
const PROFILE_KEY = 'zerobox_operator_profile_guest';
// In the full catalog, not in STARTER_MACHINES, so it only gains its catalog fields once the catalog merges.
const CATALOG_ID = 'htb-blackfield';

const customRow = (): Machine =>
  ({
    id: 'custom-1-corp',
    name: 'Corp DC',
    ip: '10.10.11.77',
    os: 'Windows',
    platform: 'Custom',
    difficulty: 'Medium',
    status: 'recon',
    tags: ['AD', 'kerberoast'],
    certifications: [],
    writeupUrl: 'https://example.test/corp-dc',
    isCustom: true,
    quickNotes: 'mine',
    timeSpentSeconds: 42,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }) as Machine;

/** A catalog row as persisted: lean, with the operator's progress and nothing the catalog supplies. */
const leanCatalogRow = (): Partial<Machine> => ({
  id: CATALOG_ID,
  name: 'Blackfield',
  platform: 'HTB',
  status: 'foothold',
  userFlag: 'HTB{proof}',
  timeSpentSeconds: 900,
});

async function freshStore() {
  localStorage.clear();
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ machines: [customRow(), leanCatalogRow()], userSolvesReset: false }));
  vi.resetModules();
  const { useCtfStore } = await import('../../store/useCtfStore');
  const backup = await import('../../store/backupFile');
  const sync = await import('../../store/syncActions');
  const { INITIAL_MACHINES } = await import('../../data/machinesCatalog');
  return { useCtfStore, backup, sync, catalogRow: INITIAL_MACHINES.find((m) => m.id === CATALOG_ID)! };
}

describe('loadCatalog in flight', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hands every concurrent caller the same load and keeps user rows through the one merge', async () => {
    const { useCtfStore } = await freshStore();
    expect(useCtfStore.getState().isCatalogLoaded).toBe(false);

    const first = useCtfStore.getState().loadCatalog();
    const second = useCtfStore.getState().loadCatalog();
    expect(second).toBe(first);
    await second;

    const state = useCtfStore.getState();
    expect(state.isCatalogLoaded).toBe(true);
    expect(state.isCatalogLoading).toBe(false);
    const custom = state.machines.find((m) => m.id === 'custom-1-corp')!;
    expect(custom).toMatchObject({
      ip: '10.10.11.77',
      tags: ['AD', 'kerberoast'],
      writeupUrl: 'https://example.test/corp-dc',
      quickNotes: 'mine',
    });
    // The catalog arrived whole, not in slices.
    expect(state.machines.length).toBeGreaterThan(500);
  });

  it('a failed load clears the in-flight state so a retry can run', async () => {
    const { useCtfStore } = await freshStore();
    const catalog = await import('../../data/loadMachinesCatalog');
    const spy = vi.spyOn(catalog, 'loadMachinesCatalog').mockRejectedValueOnce(new Error('offline'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useCtfStore.getState().loadCatalog();
    expect(useCtfStore.getState().isCatalogLoaded).toBe(false);
    expect(useCtfStore.getState().isCatalogLoading).toBe(false);
    spy.mockRestore();
    err.mockRestore();
    await useCtfStore.getState().loadCatalog();
    expect(useCtfStore.getState().isCatalogLoaded).toBe(true);
  });
});

describe('exports started before the catalog has merged', () => {
  it('buildBackupFile waits for the catalog and exports catalog-merged data plus the custom row', async () => {
    const { useCtfStore, backup, catalogRow } = await freshStore();
    // Nothing has asked for the catalog yet: the stored catalog row is still lean.
    expect(useCtfStore.getState().machines.find((m) => m.id === CATALOG_ID)?.officialSynopsis).toBeUndefined();

    const file = JSON.parse(await backup.buildBackupFile()) as { machines: Machine[] };

    expect(useCtfStore.getState().isCatalogLoaded).toBe(true);
    const row = file.machines.find((m) => m.id === CATALOG_ID)!;
    expect(row.officialSynopsis).toBe(catalogRow.officialSynopsis);
    expect(row.status).toBe('foothold');
    expect(row.userFlag).toBe('HTB{proof}');
    const custom = file.machines.find((m) => m.id === 'custom-1-corp')!;
    expect(custom).toMatchObject({ ip: '10.10.11.77', tags: ['AD', 'kerberoast'], writeupUrl: 'https://example.test/corp-dc' });
  });

  it('is correct when the export starts while the idle load is already in flight', async () => {
    const { useCtfStore, backup, catalogRow } = await freshStore();
    const loading = useCtfStore.getState().loadCatalog();
    const [file] = await Promise.all([backup.buildBackupFile(), loading]);
    const parsed = JSON.parse(file) as { machines: Machine[] };
    expect(parsed.machines.find((m) => m.id === CATALOG_ID)?.officialSynopsis).toBe(catalogRow.officialSynopsis);
    expect(parsed.machines.find((m) => m.id === 'custom-1-corp')?.writeupUrl).toBe('https://example.test/corp-dc');
  });

  it('exportSyncFile waits for the catalog too', async () => {
    const { useCtfStore, sync, catalogRow } = await freshStore();
    const text = await sync.exportSyncFile.call(undefined);
    expect(useCtfStore.getState().isCatalogLoaded).toBe(true);
    const parsed = JSON.parse(text) as { machines?: Machine[]; data?: { machines: Machine[] } };
    const machines = parsed.machines ?? parsed.data?.machines ?? [];
    expect(machines.find((m) => m.id === CATALOG_ID)?.officialSynopsis).toBe(catalogRow.officialSynopsis);
    expect(machines.find((m) => m.id === 'custom-1-corp')?.ip).toBe('10.10.11.77');
  });

  it('importBackupFile loads the catalog before replacing the machines and keeps the custom row', async () => {
    const { useCtfStore, backup } = await freshStore();
    const text = JSON.stringify({
      version: '2.0.0',
      machines: [customRow(), leanCatalogRow()],
      globalVars: {},
      cheatsheets: [],
      activitySessions: [],
      customNotes: [],
      deletedNoteIds: [],
    });
    const result = await backup.importBackupFile(text);
    expect(result.ok).toBe(true);
    expect(useCtfStore.getState().isCatalogLoaded).toBe(true);
    const machines = useCtfStore.getState().machines;
    expect(machines.find((m) => m.id === CATALOG_ID)?.officialSynopsis).toBeTruthy();
    expect(machines.find((m) => m.id === 'custom-1-corp')).toMatchObject({
      ip: '10.10.11.77',
      tags: ['AD', 'kerberoast'],
      writeupUrl: 'https://example.test/corp-dc',
    });
  });
});

describe('a catalog that failed to load', () => {
  /** loadCatalog() resolves on failure; the guards must notice isCatalogLoaded is still false. */
  async function storeWithFailingCatalog() {
    const ctx = await freshStore();
    const catalog = await import('../../data/loadMachinesCatalog');
    const guard = await import('../../store/catalogGuard');
    return { ...ctx, catalog, guard };
  }

  const failLoads = (catalog: typeof import('../../data/loadMachinesCatalog')) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    return vi.spyOn(catalog, 'loadMachinesCatalog').mockRejectedValue(new Error('offline'));
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildBackupFile refuses instead of exporting the starter list', async () => {
    const { useCtfStore, backup, catalog, guard } = await storeWithFailingCatalog();
    failLoads(catalog);
    await expect(backup.buildBackupFile()).rejects.toBeInstanceOf(guard.CatalogNotLoadedError);
    await expect(backup.buildBackupFile()).rejects.toThrow(guard.CATALOG_NOT_LOADED_MESSAGE);
    expect(useCtfStore.getState().isCatalogLoaded).toBe(false);
  });

  it('exportSyncFile refuses too', async () => {
    const { sync, catalog, guard } = await storeWithFailingCatalog();
    failLoads(catalog);
    await expect(sync.exportSyncFile()).rejects.toBeInstanceOf(guard.CatalogNotLoadedError);
  });

  it('mergeBackup returns a failed result and leaves the machines alone', async () => {
    const { useCtfStore, sync, catalog, guard } = await storeWithFailingCatalog();
    const file = await sync.exportSyncFile(); // loads the real catalog once to get a valid sync file
    useCtfStore.setState({ isCatalogLoaded: false, isCatalogLoading: false });
    const before = useCtfStore.getState().machines;
    const spy = failLoads(catalog);

    const result = await sync.mergeBackup(file);

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual({ status: 'failed', error: guard.CATALOG_NOT_LOADED_MESSAGE });
    expect(useCtfStore.getState().machines).toBe(before);
  });

  it('importBackupFile reports the catalog failure instead of replacing the machines', async () => {
    const { useCtfStore, backup, catalog, guard } = await storeWithFailingCatalog();
    failLoads(catalog);
    const before = useCtfStore.getState().machines;
    const result = await backup.importBackupFile(JSON.stringify({ version: '2.0.0', machines: [customRow()], globalVars: {}, cheatsheets: [] }));
    expect(result).toEqual({ ok: false, reason: 'catalog', message: guard.CATALOG_NOT_LOADED_MESSAGE });
    expect(useCtfStore.getState().machines).toBe(before);
  });

  it('works again once the catalog loads', async () => {
    const { backup, catalog } = await storeWithFailingCatalog();
    const spy = failLoads(catalog);
    await expect(backup.buildBackupFile()).rejects.toThrow();
    spy.mockRestore();
    const parsed = JSON.parse(await backup.buildBackupFile()) as { machines: Machine[] };
    expect(parsed.machines.find((m) => m.id === CATALOG_ID)?.officialSynopsis).toBeTruthy();
  });
});
