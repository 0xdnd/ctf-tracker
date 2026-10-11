import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const STORAGE_KEY = 'zerobox_notes_workspace';

const seedPersisted = (state: Record<string, unknown>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
};

// Fresh module graph per test: the shared test setup preloads the catalog into the default registry.
const loadFreshStore = async () => {
  vi.resetModules();
  const registry = await import('../../utils/cptsVaultRegistry');
  const store = await import('../../store/useNotesWorkspaceStore');
  return { registry, ...store };
};

describe('useNotesWorkspaceStore lazy CPTS vault loading', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.doUnmock('../../data/cptsNotesIndex.json');
    vi.restoreAllMocks();
  });

  it('starts idle with an empty catalog and keeps persisted tabs untouched', async () => {
    seedPersisted({ openTabIds: ['not-yet-known-note', 'zz-legacy'], activeTabId: 'not-yet-known-note', viewMode: 'raw' });
    const { registry, useNotesWorkspaceStore } = await loadFreshStore();

    const state = useNotesWorkspaceStore.getState();
    expect(registry.isCptsVaultLoaded()).toBe(false);
    expect(state.vaultStatus).toBe('idle');
    expect(state.openTabIds).toEqual(['not-yet-known-note', 'zz-legacy']);
    expect(state.activeTabId).toBe('not-yet-known-note');
    expect(state.viewMode).toBe('raw');
    // Getters must not crash while the catalog is still missing.
    expect(state.getOpenNotes()).toEqual([]);
    expect(state.getActiveNote()).toBeNull();
  });

  it('toggleOpen before load does not drop persisted tabs', async () => {
    seedPersisted({ openTabIds: ['a-tab', 'b-tab'], activeTabId: 'b-tab' });
    const { useNotesWorkspaceStore } = await loadFreshStore();

    useNotesWorkspaceStore.getState().toggleOpen();
    const state = useNotesWorkspaceStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.openTabIds).toEqual(['a-tab', 'b-tab']);
    expect(state.activeTabId).toBe('b-tab');
    await vi.waitFor(() => expect(useNotesWorkspaceStore.getState().vaultStatus).toBe('ready'));
  });

  it('merges once ready: keeps valid persisted tabs, drops unknown ones', async () => {
    const { registry, useNotesWorkspaceStore } = await loadFreshStore();
    await registry.loadCptsVault();
    const realId = registry.CPTS_NOTES[0].id;
    expect(realId).toBeTruthy();

    localStorage.clear();
    seedPersisted({ openTabIds: [realId, 'zz-legacy'], activeTabId: 'zz-legacy', fontSize: 'lg' });
    // Re-create the store with the catalog already loaded to exercise the synchronous merge path.
    vi.resetModules();
    const reg2 = await import('../../utils/cptsVaultRegistry');
    await reg2.loadCptsVault();
    const { useNotesWorkspaceStore: store2 } = await import('../../store/useNotesWorkspaceStore');
    expect(store2.getState().vaultStatus).toBe('ready');
    expect(store2.getState().openTabIds).toEqual([realId]);
    expect(store2.getState().activeTabId).toBe(realId);
    expect(store2.getState().fontSize).toBe('lg');
    expect(useNotesWorkspaceStore).toBeDefined();
  });

  it('ensureVaultLoaded loads on demand, sanitizes tabs afterwards, and is idempotent', async () => {
    const { registry } = await loadFreshStore();
    await registry.loadCptsVault();
    const realId = registry.CPTS_NOTES[0].id;

    localStorage.clear();
    seedPersisted({ openTabIds: ['zz-legacy', realId], activeTabId: 'zz-legacy', isPinned: false });
    const { registry: reg, useNotesWorkspaceStore } = await loadFreshStore();
    expect(useNotesWorkspaceStore.getState().vaultStatus).toBe('idle');

    const first = useNotesWorkspaceStore.getState().ensureVaultLoaded();
    const second = useNotesWorkspaceStore.getState().ensureVaultLoaded();
    expect(useNotesWorkspaceStore.getState().vaultStatus).toBe('loading');
    await Promise.all([first, second]);

    const state = useNotesWorkspaceStore.getState();
    expect(state.vaultStatus).toBe('ready');
    expect(reg.CPTS_NOTES.length).toBeGreaterThan(0);
    expect(state.openTabIds).toEqual([realId]);
    expect(state.activeTabId).toBe(realId);
    expect(state.isPinned).toBe(false);
    expect(state.getActiveNote()?.id).toBe(realId);

    const sizeAfterFirst = reg.CPTS_NOTES.length;
    await useNotesWorkspaceStore.getState().ensureVaultLoaded();
    expect(reg.CPTS_NOTES.length).toBe(sizeAfterFirst);
    expect(useNotesWorkspaceStore.getState().vaultStatus).toBe('ready');
  });

  it('never persists vault status and keeps notes intact', async () => {
    seedPersisted({ openTabIds: ['x-tab'], activeTabId: 'x-tab' });
    const { useNotesWorkspaceStore } = await loadFreshStore();
    useNotesWorkspaceStore.getState().setFontSize('xl');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.state.vaultStatus).toBeUndefined();
    expect(saved.state.openTabIds).toEqual(['x-tab']);
    expect(saved.state.fontSize).toBe('xl');
  });

  it('moves to the error state when the data chunk fails, keeps tabs, and can retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedPersisted({ openTabIds: ['x-tab', 'y-tab'], activeTabId: 'y-tab' });
    vi.resetModules();
    vi.doMock('../../data/cptsNotesIndex.json', () => {
      throw new Error('chunk load failed');
    });
    const registry = await import('../../utils/cptsVaultRegistry');
    const { useNotesWorkspaceStore } = await import('../../store/useNotesWorkspaceStore');

    await expect(useNotesWorkspaceStore.getState().ensureVaultLoaded()).resolves.toBeUndefined();
    const state = useNotesWorkspaceStore.getState();
    expect(state.vaultStatus).toBe('error');
    expect(registry.isCptsVaultLoaded()).toBe(false);
    expect(state.openTabIds).toEqual(['x-tab', 'y-tab']);
    expect(state.activeTabId).toBe('y-tab');
    expect(state.getOpenNotes()).toEqual([]);

    // Retry succeeds once the chunk is reachable again.
    vi.doUnmock('../../data/cptsNotesIndex.json');
    vi.resetModules();
    const retry = await import('../../store/useNotesWorkspaceStore');
    await retry.useNotesWorkspaceStore.getState().ensureVaultLoaded();
    expect(retry.useNotesWorkspaceStore.getState().vaultStatus).toBe('ready');
  });
});
