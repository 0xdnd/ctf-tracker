import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  bindExportGuard,
  ensurePersistence,
} from '../../utils/resilientStorage';

describe('ResilientStorage Engine', () => {
  let activeUnbind: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (activeUnbind) {
      activeUnbind();
      activeUnbind = null;
    }
  });

  describe('beforeunload Export Guard', () => {
    it('prevents unload when there are unexported changes', () => {
      let dirtyCount = 5;
      activeUnbind = bindExportGuard(() => dirtyCount);

      const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not prevent unload when dirtyCount is 0', () => {
      let dirtyCount = 0;
      activeUnbind = bindExportGuard(() => dirtyCount);

      const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Storage Persistence Check', () => {
    it('returns true when navigator.storage.persisted() resolves true', async () => {
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: {
          persisted: vi.fn().mockResolvedValue(true),
          persist: vi.fn().mockResolvedValue(true),
        },
        configurable: true,
      });

      const result = await ensurePersistence();
      expect(result).toBe(true);

      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
      });
    });

    it('attempts persist() when persisted() is false', async () => {
      const originalStorage = navigator.storage;
      const mockPersist = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'storage', {
        value: {
          persisted: vi.fn().mockResolvedValue(false),
          persist: mockPersist,
        },
        configurable: true,
      });

      const result = await ensurePersistence();
      expect(result).toBe(true);
      expect(mockPersist).toHaveBeenCalled();

      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
      });
    });
  });
});
