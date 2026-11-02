import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock IndexedDB vault utilities for clean node/jsdom test runs
vi.mock('../utils/indexedDbVault', () => ({
  loadVaultFromIndexedDb: vi.fn().mockResolvedValue(null),
  saveVaultToIndexedDb: vi.fn().mockResolvedValue(undefined),
  clearVaultFromIndexedDb: vi.fn().mockResolvedValue(undefined),
  dumpVaultForBackup: vi.fn().mockResolvedValue({ notes: [], wikilinkMap: {} }),
  upsertVaultNotesFromBackup: vi.fn().mockResolvedValue(0),
  snapshotVaultBeforeImport: vi.fn().mockResolvedValue(false),
  loadLastImportSnapshot: vi.fn().mockResolvedValue(null),
  restoreLastImportSnapshot: vi.fn().mockResolvedValue(null),
  saveVaultStrict: vi.fn().mockResolvedValue(undefined),
  MAX_IMPORT_SNAPSHOTS: 3,
}));
