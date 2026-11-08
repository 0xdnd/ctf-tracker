import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

// setup.ts mocks the vault module globally; these tests exercise the real one against an in-memory IndexedDB double.
vi.unmock('../../utils/indexedDbVault');

const note = (id: string, rawMarkdown = id) => ({ id, title: id, rawMarkdown, commands: [] }) as unknown as CptsNoteEntry;
type Rec = { notes: CptsNoteEntry[]; wikilinkMap: Record<string, string> };
const stored = () => fake.records.get('vault_data') as Rec | undefined;

let fake: FakeIndexedDb;
beforeEach(() => {
  fake = installFakeIndexedDb({ drainQueuedRequests: true });
});
afterEach(() => {
  releaseRestoreWriteGate();
  fake.uninstall();
});

describe('mutateVault', () => {
  it('applies each change onto the stored vault, so concurrent writers both survive', async () => {
    const { saveVaultToIndexedDb, mutateVault } = await import('../../utils/indexedDbVault');
    await saveVaultToIndexedDb({ notes: [note('n1'), note('n2')], wikilinkMap: { n1: 'n1' } });

    const edit = (id: string, text: string) =>
      mutateVault((cur) => ({
        notes: cur.notes.map((n) => (n.id === id ? { ...n, rawMarkdown: text } : n)),
        wikilinkMap: cur.wikilinkMap,
      }));
    const [a, b] = await Promise.all([edit('n1', 'from tab A'), edit('n2', 'from tab B')]);

    expect(stored()!.notes.map((n) => n.rawMarkdown)).toEqual(['from tab A', 'from tab B']);
    expect(stored()!.wikilinkMap).toEqual({ n1: 'n1' });
    // Each caller gets what it wrote (the second one includes the first one's change).
    expect(a!.notes.find((n) => n.id === 'n1')!.rawMarkdown).toBe('from tab A');
    expect(b!.notes.map((n) => n.rawMarkdown)).toEqual(['from tab A', 'from tab B']);
  });

  it('tells the mutation whether a vault record exists', async () => {
    const { mutateVault } = await import('../../utils/indexedDbVault');
    const seen: boolean[] = [];
    await mutateVault((cur) => {
      seen.push(cur.exists);
      return { notes: [note('n1')], wikilinkMap: {} };
    });
    await mutateVault((cur) => {
      seen.push(cur.exists);
      return cur;
    });
    expect(seen).toEqual([false, true]);
  });

  it('writes nothing and resolves null while the write gate is engaged', async () => {
    const { saveVaultToIndexedDb, mutateVault } = await import('../../utils/indexedDbVault');
    await saveVaultToIndexedDb({ notes: [note('n1')], wikilinkMap: {} });
    const writes = fake.writeCount;
    engageSchemaWriteGate('restoring');
    const fn = vi.fn((cur: Rec) => ({ ...cur, notes: [] }));
    expect(await mutateVault(fn)).toBeNull();
    expect(fake.writeCount).toBe(writes);
    expect(stored()!.notes).toHaveLength(1);
  });

  it('rejects when the write fails, leaving the vault as it was', async () => {
    const { saveVaultToIndexedDb, mutateVault } = await import('../../utils/indexedDbVault');
    await saveVaultToIndexedDb({ notes: [note('n1')], wikilinkMap: {} });
    fake.failWrites = true;
    await expect(mutateVault((cur) => ({ ...cur, notes: [] }))).rejects.toThrow();
    expect(stored()!.notes).toHaveLength(1);
  });

  it('rejects and writes nothing when the mutation throws', async () => {
    const { saveVaultToIndexedDb, mutateVault } = await import('../../utils/indexedDbVault');
    await saveVaultToIndexedDb({ notes: [note('n1')], wikilinkMap: {} });
    const writes = fake.writeCount;
    await expect(
      mutateVault(() => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(fake.writeCount).toBe(writes);
  });
});
