import { describe, it, expect, beforeEach } from 'vitest';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';

type PersistApi = {
  persist: {
    getOptions: () => {
      merge: (persisted: unknown, current: unknown) => Record<string, unknown>;
      partialize: (s: unknown) => Record<string, unknown>;
    };
    rehydrate: () => Promise<void>;
  };
};
const api = useNotesWorkspaceStore as unknown as PersistApi;
const merge = (persisted: unknown) => api.persist.getOptions().merge(persisted, useNotesWorkspaceStore.getState());

beforeEach(() => localStorage.clear());

describe('dock sidebar state migration', () => {
  it('an old payload with the list collapsed opens with no left view', () => {
    const merged = merge({ openTabIds: [], notesListCollapsed: true });
    expect(merged.dockLeftView).toBeNull();
    expect(merged.dockRightOpen).toBe(false);
    expect('notesListCollapsed' in merged).toBe(false);
  });

  it('an old payload with the list open opens on Files', () => {
    expect(merge({ notesListCollapsed: false }).dockLeftView).toBe('files');
    expect(merge({}).dockLeftView).toBe('files');
  });

  it('a persisted null stays closed even with the old key present', () => {
    expect(merge({ dockLeftView: null, notesListCollapsed: false }).dockLeftView).toBeNull();
  });

  it('keeps valid views, repairs junk and keeps dockRightOpen', () => {
    expect(merge({ dockLeftView: 'tags', dockRightOpen: true })).toMatchObject({ dockLeftView: 'tags', dockRightOpen: true });
    expect(merge({ dockLeftView: 'bogus', dockRightOpen: 'yes' })).toMatchObject({ dockLeftView: 'files', dockRightOpen: false });
  });

  it('partialize persists the new keys only', () => {
    const out = api.persist.getOptions().partialize({ ...useNotesWorkspaceStore.getState(), dockLeftView: 'search', dockRightOpen: true });
    expect(out).toMatchObject({ dockLeftView: 'search', dockRightOpen: true });
    expect('notesListCollapsed' in out).toBe(false);
  });

  it('hydrates an old stored payload from localStorage', async () => {
    localStorage.setItem(
      'zerobox_notes_workspace',
      JSON.stringify({ state: { openTabIds: ['x'], activeTabId: 'x', notesListCollapsed: true }, version: 0 }),
    );
    await api.persist.rehydrate();
    expect(useNotesWorkspaceStore.getState().dockLeftView).toBeNull();
    expect(useNotesWorkspaceStore.getState().openTabIds).toEqual(['x']);
  });

  it('toggleDockLeftView opens a view and closes it when pressed again', () => {
    const s = useNotesWorkspaceStore.getState();
    s.setDockLeftView('files');
    useNotesWorkspaceStore.getState().toggleDockLeftView('search');
    expect(useNotesWorkspaceStore.getState().dockLeftView).toBe('search');
    useNotesWorkspaceStore.getState().toggleDockLeftView('search');
    expect(useNotesWorkspaceStore.getState().dockLeftView).toBeNull();
  });
});
