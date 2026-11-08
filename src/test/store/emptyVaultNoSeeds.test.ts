import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import * as vaultDb from '../../utils/indexedDbVault';

describe('empty vault boot', () => {
  beforeEach(() => {
    useCtfStore.setState({ userNotes: [], customNotes: [], userWikilinkMap: {}, userNotesHydrated: false });
  });

  it('starts with zero notes and writes no sample notes', async () => {
    vi.spyOn(vaultDb, 'loadVaultFromIndexedDb').mockResolvedValue(null);
    const save = vi.spyOn(vaultDb, 'saveVaultToIndexedDb').mockResolvedValue(undefined as never);
    await useCtfStore.getState().loadUserNotesFromDb();
    const s = useCtfStore.getState();
    expect(s.userNotes).toEqual([]);
    expect(s.userWikilinkMap).toEqual({});
    expect(s.userNotesHydrated).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('still loads notes an existing user already has stored', async () => {
    const stored = [{ id: 'note-00--pt', title: 'Kept', rawMarkdown: '# Kept' }] as never;
    vi.spyOn(vaultDb, 'loadVaultFromIndexedDb').mockResolvedValue({ notes: stored, wikilinkMap: {} } as never);
    await useCtfStore.getState().loadUserNotesFromDb();
    expect(useCtfStore.getState().userNotes).toHaveLength(1);
  });
});
