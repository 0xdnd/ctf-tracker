import { describe, it, expect, beforeEach } from 'vitest';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';

const store = () => useNotesWorkspaceStore;

describe('workspace store recents and note switcher', () => {
  beforeEach(() => {
    store().setState({ recentNoteIds: [], isNoteSwitcherOpen: false, openTabIds: [], activeTabId: null, isOpen: false });
  });

  it('keeps the last 10 ids, most recent first', () => {
    for (let i = 1; i <= 12; i++) store().getState().recordRecentNote(`n${i}`);
    const ids = store().getState().recentNoteIds;
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe('n12');
    expect(ids[9]).toBe('n3');
  });

  it('moves a re-recorded id to the front without duplicates', () => {
    ['a', 'b', 'c'].forEach((id) => store().getState().recordRecentNote(id));
    store().getState().recordRecentNote('a');
    expect(store().getState().recentNoteIds).toEqual(['a', 'c', 'b']);
  });

  it('ignores cheat: ids', () => {
    store().getState().recordRecentNote('cheat:x');
    expect(store().getState().recentNoteIds).toEqual([]);
  });

  it('persists recentNoteIds but not isNoteSwitcherOpen', () => {
    store().getState().recordRecentNote('a');
    store().getState().openNoteSwitcher();
    const opts = (store() as unknown as { persist: { getOptions: () => { partialize: (s: unknown) => Record<string, unknown> } } }).persist.getOptions();
    const out = opts.partialize(store().getState());
    expect(out.recentNoteIds).toEqual(['a']);
    expect(out).not.toHaveProperty('isNoteSwitcherOpen');
  });

  it('opens and closes the note switcher independently of isSwitcherOpen', () => {
    store().getState().openNoteSwitcher();
    expect(store().getState().isNoteSwitcherOpen).toBe(true);
    expect(store().getState().isSwitcherOpen).toBe(false);
    store().getState().closeNoteSwitcher();
    expect(store().getState().isNoteSwitcherOpen).toBe(false);
  });

  it('openNote and setActiveTab record recents', () => {
    store().getState().openNote('a', { stayClosed: true });
    store().getState().setActiveTab('b');
    expect(store().getState().recentNoteIds).toEqual(['b', 'a']);
  });
});
