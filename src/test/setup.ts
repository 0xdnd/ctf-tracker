import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock IndexedDB vault utilities for clean node/jsdom test runs
vi.mock('../utils/indexedDbVault', () => ({
  loadVaultFromIndexedDb: vi.fn().mockResolvedValue(null),
  saveVaultToIndexedDb: vi.fn().mockResolvedValue(undefined),
  clearVaultFromIndexedDb: vi.fn().mockResolvedValue(undefined),
}));
