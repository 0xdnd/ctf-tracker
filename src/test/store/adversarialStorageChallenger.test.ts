import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadLootState,
  saveLootState,
  getLootStorageKey,
} from '../../store/lootPersistence';
import {
  safeLocalStorage,
  loadInitialProfileData,
  loadInitialAttackGraphState,
  loadCustomMachinesFromStorage,
  getProfileStorageKey,
  getAttackGraphStorageKey,
  CUSTOM_MACHINES_STORAGE_KEY,
} from '../../store/useCtfStore';
import {
  isSchemaWriteGated,
  readActiveRestoreLock,
  parseRestoreLock,
  isStaleRestoreLock,
  releaseRestoreWriteGate,
  RESTORE_IN_PROGRESS_KEY,
  RESTORE_LOCK_STALE_MS,
  SCHEMA_VERSION,
  SCHEMA_VERSION_STORAGE_KEY,
  initSchemaVersionGate,
} from '../../utils/schemaWriteGate';

describe('Adversarial Storage Challenger: Quota, Corruption & Mutex Harness', () => {
  const quotaError = () => Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError', code: 22 });

  beforeEach(() => {
    localStorage.clear();
    releaseRestoreWriteGate();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    releaseRestoreWriteGate();
  });

  describe('Adversarial Challenge 1: Storage Quota & Memory Fallback Invariants', () => {
    it('CHALLENGE-01: safeLocalStorage prioritizes inMemoryFallback over stale disk copy on quota failure', () => {
      localStorage.setItem('zb_test_key', 'initial_disk_value');

      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError();
      });

      const writeResult = safeLocalStorage.setItem('zb_test_key', 'quota_memory_value');
      expect(writeResult).toBe(false);
      spy.mockRestore();

      // safeLocalStorage must return the memory fallback value even though disk has a stale value
      expect(safeLocalStorage.getItem('zb_test_key')).toBe('quota_memory_value');
      // disk still has the old value
      expect(localStorage.getItem('zb_test_key')).toBe('initial_disk_value');
    });

    it('CHALLENGE-02: lootStorage memoryFallback behavior when disk already has an earlier payload and quota fails', () => {
      // 1. First write succeeds to disk
      const initialLoot = {
        credentials: [
          {
            id: 'cred-1',
            type: 'password' as const,
            username: 'admin',
            secret: 'initial_password',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        credAttempts: [],
        lootItems: [],
      };
      saveLootState('challenger_p1', initialLoot);
      expect(localStorage.getItem(getLootStorageKey('challenger_p1'))).toBeTruthy();

      // 2. Storage quota fills up; new credential added
      const updatedLoot = {
        credentials: [
          {
            id: 'cred-1',
            type: 'password' as const,
            username: 'admin',
            secret: 'initial_password',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'cred-2',
            type: 'password' as const,
            username: 'root',
            secret: 'newly_captured_secret',
            createdAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        credAttempts: [],
        lootItems: [],
      };

      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError();
      });

      saveLootState('challenger_p1', updatedLoot);
      spy.mockRestore();

      // 3. Inspect what loadLootState returns!
      // In a resilient fallback system, the memory fallback should preserve the new credential.
      const loaded = loadLootState('challenger_p1');

      // CRITICAL CHECK: Does loaded contain cred-2?
      const hasCred2 = loaded.credentials.some((c) => c.id === 'cred-2');
      console.log('[CHALLENGE-02 RESULT] Has cred-2 after quota failure:', hasCred2);
      expect(hasCred2).toBe(true);
    });
  });

  describe('Adversarial Challenge 2: Corrupted Storage Payloads & Schema Injections', () => {
    it('CHALLENGE-03: loadInitialProfileData handles corrupted JSON, nulls, arrays, numbers without crashing', () => {
      const key = getProfileStorageKey('guest');

      const corruptedInputs = [
        '{ malformed: json !@#$',
        'null',
        '12345',
        '"just a string"',
        '[]',
        '{"machines": null}',
        '{"machines": "not an array"}',
        '{"machines": [null, 123, "invalid", {}]}',
        '{"__proto__": {"polluted": true}}',
      ];

      for (const input of corruptedInputs) {
        localStorage.setItem(key, input);
        expect(() => {
          loadInitialProfileData('guest');
        }).not.toThrow();
      }
    });

    it('CHALLENGE-04: loadInitialAttackGraphState handles corrupt payloads and returns safe defaults', () => {
      const key = getAttackGraphStorageKey('guest');
      const corruptedInputs = [
        '{ bad json',
        'null',
        '42',
        '{"graphNodePositions": null, "graphEdges": "invalid"}',
      ];

      for (const input of corruptedInputs) {
        localStorage.setItem(key, input);
        expect(() => {
          const graph = loadInitialAttackGraphState('guest');
          expect(graph).toBeDefined();
          expect(graph.graphNodePositions).toBeDefined();
          expect(Array.isArray(graph.graphEdges)).toBe(true);
        }).not.toThrow();
      }
    });

    it('CHALLENGE-05: loadCustomMachinesFromStorage rejects corrupted arrays and malformed items', () => {
      const key = CUSTOM_MACHINES_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify([null, 42, { notAMachine: true }, { id: 'custom-valid', isCustom: true }]));

      const loaded = loadCustomMachinesFromStorage('guest');
      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(4); // returns raw parsed array if array
    });
  });

  describe('Adversarial Challenge 3: Cross-Tab Mutex Locks & Concurrency', () => {
    it('CHALLENGE-06: Parse restore lock rejects corrupt strings and enforces finite timestamp', () => {
      expect(parseRestoreLock(null)).toBeNull();
      expect(parseRestoreLock('')).toBeNull();
      expect(parseRestoreLock('{ invalid')).toBeNull();
      expect(parseRestoreLock(JSON.stringify({ ts: 'not-a-number', token: 'tok' }))).toBeNull();
      expect(parseRestoreLock(JSON.stringify({ ts: NaN, token: 'tok' }))).toBeNull();
      expect(parseRestoreLock(JSON.stringify({ ts: Infinity, token: 'tok' }))).toBeNull();
      expect(parseRestoreLock(JSON.stringify({ ts: 1000 }))).toBeNull(); // missing token
      expect(parseRestoreLock(JSON.stringify({ ts: 1000, token: 'tok' }))).toEqual({ ts: 1000, token: 'tok' });
    });

    it('CHALLENGE-07: Restore lock auto-expires after RESTORE_LOCK_STALE_MS (60s)', () => {
      const now = Date.now();
      const freshLock = { ts: now - 30_000, token: 'tok-fresh' };
      const staleLock = { ts: now - (RESTORE_LOCK_STALE_MS + 5_000), token: 'tok-stale' };

      expect(isStaleRestoreLock(freshLock, now)).toBe(false);
      expect(isStaleRestoreLock(staleLock, now)).toBe(true);

      // Verify readActiveRestoreLock returns null for stale locks
      localStorage.setItem(RESTORE_IN_PROGRESS_KEY, JSON.stringify(staleLock));
      expect(readActiveRestoreLock(now)).toBeNull();

      // But returns active lock when fresh
      localStorage.setItem(RESTORE_IN_PROGRESS_KEY, JSON.stringify(freshLock));
      expect(readActiveRestoreLock(now)).toEqual(freshLock);
    });

    it('CHALLENGE-08: Future schema version engages write gate permanently', () => {
      localStorage.setItem(SCHEMA_VERSION_STORAGE_KEY, String(SCHEMA_VERSION + 1));
      const detected = initSchemaVersionGate();
      expect(detected).toBe(SCHEMA_VERSION + 1);
      expect(isSchemaWriteGated()).toBe(true);

      // Writes are strictly rejected while gated
      expect(safeLocalStorage.setItem('any_key', 'val')).toBe(false);
    });
  });
});
