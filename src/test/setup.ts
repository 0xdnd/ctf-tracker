import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock IndexedDB vault utilities for clean node/jsdom test runs
vi.mock('../utils/indexedDbVault', () => ({
  loadVaultFromIndexedDb: vi.fn().mockResolvedValue(null),
  saveVaultToIndexedDb: vi.fn().mockResolvedValue(undefined),
  clearVaultFromIndexedDb: vi.fn().mockResolvedValue(undefined),
}));

// The CPTS catalog is lazy-loaded in the app; tests expect it to be available synchronously.
// Only the dependency-free registry is imported here so test-level vi.mock() calls still apply.
const { loadCptsVault } = await import('../utils/cptsVaultRegistry');
await loadCptsVault();
