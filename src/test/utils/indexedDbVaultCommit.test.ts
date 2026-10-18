import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';

// setup.ts mocks the vault module globally; this file tests the real one against an in-memory IndexedDB double.
vi.unmock('../../utils/indexedDbVault');

const settledWithin = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([
    p.then(() => 'resolved' as const, () => 'rejected' as const),
    new Promise<'pending'>((r) => setTimeout(() => r('pending'), ms)),
  ]);

let fake: FakeIndexedDb;
beforeEach(() => {
  fake = installFakeIndexedDb();
});
afterEach(() => fake.uninstall());

describe('saveVaultToIndexedDb commits before resolving', () => {
  it('resolves once the transaction completed and the record is stored', async () => {
    const { saveVaultToIndexedDb } = await import('../../utils/indexedDbVault');
    let release!: () => void;
    fake.gate = new Promise<void>((r) => (release = r));
    const save = saveVaultToIndexedDb({ notes: [], wikilinkMap: {} });
    expect(await settledWithin(save, 30)).toBe('pending'); // not committed yet
    release();
    await save;
    expect(fake.records.has('vault_data')).toBe(true);
  });

  it('rejects when the transaction aborts (quota), instead of hanging or reporting success', async () => {
    const { saveVaultToIndexedDb } = await import('../../utils/indexedDbVault');
    fake.failWrites = true;
    expect(await settledWithin(saveVaultToIndexedDb({ notes: [], wikilinkMap: {} }), 200)).toBe('rejected');
  });
});
