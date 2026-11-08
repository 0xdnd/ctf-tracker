import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock IndexedDB vault utilities for clean node/jsdom test runs
vi.mock('../utils/indexedDbVault', () => {
  const saveVaultToIndexedDb = vi.fn().mockResolvedValue(undefined);
  return {
    loadVaultFromIndexedDb: vi.fn().mockResolvedValue(null),
    loadVaultStrict: vi.fn().mockResolvedValue(null),
    saveVaultToIndexedDb,
    // The mock holds no stored vault: callers fall back to their in-memory notes, and the result is "written" through
    // the saveVaultToIndexedDb mock above (so its call/rejection expectations keep covering note saves).
    mutateVault: vi.fn((fn: (current: { notes: unknown[]; wikilinkMap: Record<string, string>; exists: boolean }) => {
      notes: unknown[];
      wikilinkMap: Record<string, string>;
    }) => {
      const next = fn({ notes: [], wikilinkMap: {}, exists: false });
      return Promise.resolve(saveVaultToIndexedDb({ notes: next.notes, wikilinkMap: next.wikilinkMap })).then(() => next);
    }),
    clearVaultFromIndexedDb: vi.fn().mockResolvedValue(undefined),
    dumpVaultForBackup: vi.fn().mockResolvedValue({ notes: [], wikilinkMap: {} }),
    upsertVaultNotesFromBackup: vi.fn().mockResolvedValue(0),
    snapshotVaultBeforeImport: vi.fn().mockResolvedValue(false),
    loadLastImportSnapshot: vi.fn().mockResolvedValue(null),
    restoreLastImportSnapshot: vi.fn().mockResolvedValue(null),
    saveVaultStrict: vi.fn().mockResolvedValue(undefined),
    MAX_IMPORT_SNAPSHOTS: 3,
  };
});
