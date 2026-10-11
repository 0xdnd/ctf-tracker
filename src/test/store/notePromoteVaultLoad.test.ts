import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fresh module graph: the shared test setup preloads the catalog into the default registry.
describe('updateNoteContent with an unloaded CPTS vault', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('loads the vault first, then promotes the catalog note so the edit is not dropped', async () => {
    const registry = await import('../../utils/cptsVaultRegistry');
    const { useCtfStore } = await import('../../store/useCtfStore');
    expect(registry.isCptsVaultLoaded()).toBe(false);
    expect(registry.CPTS_NOTES.length).toBe(0);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    useCtfStore.setState({ customNotes: [], userNotes: [] });
    // Resolve a real catalog id by loading a separate module graph's copy of the data.
    const raw = (await import('../../data/cptsNotesIndex.json')) as { default?: unknown };
    const payload = (raw.default ?? raw) as { notes?: { id: string }[] } | { id: string }[];
    const noteId = (Array.isArray(payload) ? payload : payload.notes || [])[0].id;

    const edited = '# Edited before vault loaded';
    await useCtfStore.getState().updateNoteContent(noteId, edited);

    expect(registry.isCptsVaultLoaded()).toBe(true);
    const promoted = useCtfStore.getState().customNotes.find((n) => n.id === noteId);
    expect(promoted?.rawMarkdown).toBe(edited);
    expect(warn).not.toHaveBeenCalled();
  });
});
