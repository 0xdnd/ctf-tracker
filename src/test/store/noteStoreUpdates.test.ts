import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCtfStore, getProfileStorageKey, safeLocalStorage } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { loadVaultFromIndexedDb, saveVaultToIndexedDb } from '../../utils/indexedDbVault';

// Snapshot clean store states for isolation
const initialCtfState = useCtfStore.getState();
const initialWorkspaceState = useNotesWorkspaceStore.getState();

describe('M1 Store Foundation: noteStoreUpdates.test.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useCtfStore.setState(initialCtfState, true);
    useNotesWorkspaceStore.setState(initialWorkspaceState, true);
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. Custom Notes Updating & Profile Save
  // --------------------------------------------------------------------------
  describe('1. Updating Custom Notes', () => {
    it('updates rawMarkdown and dateModified on an existing custom note and preserves metadata', () => {
      const existingCustomNote: CptsNoteEntry = {
        id: 'custom-note-alpha',
        title: 'Initial Custom Note',
        titleEn: 'Initial Custom Note',
        category: 'Privilege Escalation',
        rawCategory: 'Privilege Escalation',
        subCategory: 'Linux',
        tags: ['custom', 'privesc'],
        difficulty: 'Medium',
        summary: 'Original summary',
        commands: ['sudo -l'],
        relPath: 'Custom/Initial Note.md',
        rawMarkdown: '# Original Content\n\nInitial notes.',
        dateModified: '2026-09-01T12:00:00.000Z',
      };

      useCtfStore.setState({
        currentProfileId: 'usr_tester',
        customNotes: [existingCustomNote],
      });

      const newContent = '# Updated Content\n\nNew payload: `whoami`';
      useCtfStore.getState().updateNoteContent('custom-note-alpha', newContent);

      const updated = useCtfStore.getState().customNotes.find((n) => n.id === 'custom-note-alpha');
      expect(updated).toBeDefined();
      expect(updated?.rawMarkdown).toBe(newContent);
      expect(updated?.title).toBe('Initial Custom Note');
      expect(updated?.category).toBe('Privilege Escalation');
      expect(updated?.tags).toEqual(['custom', 'privesc']);
      expect(updated?.dateModified).toBeDefined();
      expect(updated?.dateModified).not.toBe('2026-09-01T12:00:00.000Z');
      expect(new Date(updated!.dateModified!).getTime()).toBeGreaterThan(
        new Date('2026-09-01T12:00:00.000Z').getTime()
      );
    });

    it('triggers profile save when custom note is updated', () => {
      vi.useFakeTimers();
      const profileId = 'usr_operator';
      const existingCustomNote: CptsNoteEntry = {
        id: 'custom-note-save-check',
        title: 'Save Check Note',
        titleEn: 'Save Check Note',
        category: 'Recon',
        rawCategory: 'Recon',
        subCategory: 'Active',
        tags: ['recon'],
        difficulty: 'Easy',
        summary: 'Testing persistence',
        commands: [],
        relPath: 'Custom/SaveCheck.md',
        rawMarkdown: 'Before save',
      };

      useCtfStore.setState({
        currentProfileId: profileId,
        customNotes: [existingCustomNote],
      });

      useCtfStore.getState().updateNoteContent('custom-note-save-check', 'After save markdown');

      // Fast-forward debounce timer (1200ms)
      vi.advanceTimersByTime(1500);

      const storageKey = getProfileStorageKey(profileId);
      const rawStored = safeLocalStorage.getItem(storageKey);
      expect(rawStored).toBeTruthy();

      const parsed = JSON.parse(rawStored!);
      const storedNote = parsed.customNotes.find((n: any) => n.id === 'custom-note-save-check');
      expect(storedNote).toBeDefined();
      expect(storedNote.rawMarkdown).toBe('After save markdown');
      expect(storedNote.dateModified).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 2. User Vault Notes Updating & IndexedDB Save
  // --------------------------------------------------------------------------
  describe('2. Updating User Vault Notes', () => {
    it('updates rawMarkdown and dateModified on a user vault note and triggers saveVaultToIndexedDb', () => {
      const userVaultNote: CptsNoteEntry = {
        id: 'user-vault-note-101',
        title: 'Private Vault Note',
        titleEn: 'Private Vault Note',
        category: 'Active Directory',
        rawCategory: 'Active Directory',
        subCategory: 'Kerberos',
        tags: ['vault', 'kerberos'],
        difficulty: 'Hard',
        summary: 'Private vault methodology',
        commands: ['klist'],
        relPath: 'Vault/Private Note.md',
        rawMarkdown: '# Private Vault\n\nSecret notes.',
      };

      const mockWikilinkMap = { 'private vault': 'user-vault-note-101' };

      useCtfStore.setState({
        userNotes: [userVaultNote],
        userWikilinkMap: mockWikilinkMap,
        customNotes: [],
      });

      const updatedMarkdown = '# Private Vault (Updated)\n\nKerberoasting syntax added.';
      useCtfStore.getState().updateNoteContent('user-vault-note-101', updatedMarkdown);

      // Verify in-memory userNotes state
      const state = useCtfStore.getState();
      const target = state.userNotes.find((n) => n.id === 'user-vault-note-101');
      expect(target).toBeDefined();
      expect(target?.rawMarkdown).toBe(updatedMarkdown);
      expect(target?.dateModified).toBeDefined();

      // Verify customNotes is NOT polluted
      expect(state.customNotes).toEqual([]);

      // Verify IndexedDB save is invoked with updated note array and wikilinkMap
      expect(saveVaultToIndexedDb).toHaveBeenCalledTimes(1);
      expect(saveVaultToIndexedDb).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              id: 'user-vault-note-101',
              rawMarkdown: updatedMarkdown,
            }),
          ]),
          wikilinkMap: mockWikilinkMap,
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Imported Note Edit Safety
  // --------------------------------------------------------------------------
  describe('3. Imported note edits are never dropped (no bundled catalog)', () => {
    const importedNote: CptsNoteEntry = {
      id: 'imported-recon-101',
      title: 'Recon checklist',
      titleEn: 'Recon checklist',
      category: 'Recon',
      rawCategory: 'Recon',
      subCategory: 'Scanning',
      tags: ['nmap'],
      difficulty: 'Easy',
      summary: 'My recon steps',
      commands: ['nmap -sC -sV $TARGET'],
      relPath: 'Recon/Recon checklist.md',
      rawMarkdown: '# Recon\n\nOriginal body.',
    };
    const wikilinkMap = { 'recon checklist': 'imported-recon-101' };

    it('saves repeated edits to an imported note in place, without duplicates or customNotes copies', async () => {
      useCtfStore.setState({ customNotes: [], userNotes: [importedNote], userWikilinkMap: wikilinkMap });

      await useCtfStore.getState().updateNoteContent(importedNote.id, 'First edit');
      await useCtfStore.getState().updateNoteContent(importedNote.id, 'Second edit');

      const state = useCtfStore.getState();
      expect(state.userNotes).toHaveLength(1);
      expect(state.userNotes[0].rawMarkdown).toBe('Second edit');
      expect(state.userNotes[0].title).toBe('Recon checklist');
      expect(state.customNotes).toEqual([]);
      expect(saveVaultToIndexedDb).toHaveBeenLastCalledWith({
        notes: [expect.objectContaining({ id: importedNote.id, rawMarkdown: 'Second edit' })],
        wikilinkMap,
      });

      // The workspace resolves the edited imported note
      useNotesWorkspaceStore.setState({ openTabIds: [importedNote.id], activeTabId: importedNote.id });
      expect(useNotesWorkspaceStore.getState().getActiveNote()?.rawMarkdown).toBe('Second edit');
    });

    it('saves an edit made before the imported vault has hydrated from IndexedDB', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(loadVaultFromIndexedDb).mockResolvedValueOnce({ notes: [importedNote], wikilinkMap } as never);
      useCtfStore.setState({ customNotes: [], userNotes: [], userWikilinkMap: {} });

      await useCtfStore.getState().updateNoteContent(importedNote.id, '# Edited early');

      const state = useCtfStore.getState();
      expect(state.userNotes).toHaveLength(1);
      expect(state.userNotes[0].rawMarkdown).toBe('# Edited early');
      expect(state.userWikilinkMap).toEqual(wikilinkMap);
      expect(state.customNotes).toEqual([]);
      expect(saveVaultToIndexedDb).toHaveBeenCalledWith({
        notes: [expect.objectContaining({ id: importedNote.id, rawMarkdown: '# Edited early' })],
        wikilinkMap,
      });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('keeps editing legacy notes that were promoted into customNotes by older versions', async () => {
      const legacyPromoted: CptsNoteEntry = { ...importedNote, id: '01-recon-port-scanning', rawMarkdown: 'Old edit' };
      useCtfStore.setState({ customNotes: [legacyPromoted], userNotes: [] });

      await useCtfStore.getState().updateNoteContent('01-recon-port-scanning', 'Newer edit');

      expect(useCtfStore.getState().customNotes).toHaveLength(1);
      expect(useCtfStore.getState().customNotes[0].rawMarkdown).toBe('Newer edit');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Workspace View Mode Persistence (setViewMode)
  // --------------------------------------------------------------------------
  describe('4. Workspace ViewMode Persistence', () => {
    it('sets viewMode to split and persists to localStorage[zerobox_notes_workspace]', () => {
      expect(useNotesWorkspaceStore.getState().viewMode).toBe('reading');

      useNotesWorkspaceStore.getState().setViewMode('split');
      expect(useNotesWorkspaceStore.getState().viewMode).toBe('split');

      const raw = localStorage.getItem('zerobox_notes_workspace');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.viewMode).toBe('split');
    });

    it('round-trips between reading, raw, and split modes cleanly', () => {
      const store = useNotesWorkspaceStore.getState();

      store.setViewMode('raw');
      expect(useNotesWorkspaceStore.getState().viewMode).toBe('raw');
      expect(JSON.parse(localStorage.getItem('zerobox_notes_workspace')!).state.viewMode).toBe('raw');

      store.setViewMode('split');
      expect(useNotesWorkspaceStore.getState().viewMode).toBe('split');
      expect(JSON.parse(localStorage.getItem('zerobox_notes_workspace')!).state.viewMode).toBe('split');

      store.setViewMode('reading');
      expect(useNotesWorkspaceStore.getState().viewMode).toBe('reading');
      expect(JSON.parse(localStorage.getItem('zerobox_notes_workspace')!).state.viewMode).toBe('reading');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Defensive Edge Cases & Invariants
  // --------------------------------------------------------------------------
  describe('5. Defensive Edge Cases', () => {
    it('gracefully handles non-existent note ID without crashing or corrupting state', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const initialCustom = useCtfStore.getState().customNotes;
      const initialUser = useCtfStore.getState().userNotes;

      await expect(
        Promise.resolve(useCtfStore.getState().updateNoteContent('ghost-note-404', 'Some content'))
      ).resolves.not.toThrow();

      expect(useCtfStore.getState().customNotes).toEqual(initialCustom);
      expect(useCtfStore.getState().userNotes).toEqual(initialUser);
      expect(saveVaultToIndexedDb).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[ZeroBox] Note with id "ghost-note-404" not found for update.');
      warnSpy.mockRestore();
    });

    it('supports empty string rawMarkdown and updates dateModified', () => {
      const customNote: CptsNoteEntry = {
        id: 'note-empty-test',
        title: 'Empty Test',
        titleEn: 'Empty Test',
        category: 'Test',
        rawCategory: 'Test',
        subCategory: 'Test',
        tags: [],
        difficulty: 'Easy',
        summary: '',
        commands: [],
        relPath: 'Test.md',
        rawMarkdown: 'initial non-empty content',
      };

      useCtfStore.setState({ customNotes: [customNote] });
      useCtfStore.getState().updateNoteContent('note-empty-test', '');

      const updated = useCtfStore.getState().customNotes.find((n) => n.id === 'note-empty-test');
      expect(updated?.rawMarkdown).toBe('');
      expect(updated?.dateModified).toBeDefined();
    });

    it('safely handles unicode, code fences, and special characters', () => {
      const complexContent = `---
title: Attack Guide
category: AD
---
# Attack & Exploitation 🚀

\`\`\`bash
# Run kerberoast with target filter
GetUserSPNs.py -request -dc-ip <LHOST> "corp.local/user:Pass!@#$"
\`\`\`

> [!WARNING]
> Ensure OPSEC safety checks before running.
`;

      useCtfStore.setState({
        customNotes: [
          {
            id: 'complex-note',
            title: 'Complex Note',
            titleEn: 'Complex Note',
            category: 'AD',
            rawCategory: 'AD',
            subCategory: 'Recon',
            tags: ['ad'],
            difficulty: 'Hard',
            summary: '',
            commands: [],
            relPath: 'Complex.md',
            rawMarkdown: 'old',
          },
        ],
      });

      useCtfStore.getState().updateNoteContent('complex-note', complexContent);
      const updated = useCtfStore.getState().customNotes.find((n) => n.id === 'complex-note');
      expect(updated?.rawMarkdown).toBe(complexContent);
    });
  });
});
