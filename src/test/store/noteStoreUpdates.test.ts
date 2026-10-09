import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCtfStore, getProfileStorageKey, safeLocalStorage } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { CPTS_NOTES, CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { saveVaultToIndexedDb } from '../../utils/indexedDbVault';

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
  // 3. Baseline Catalog Promotion & Immutability
  // --------------------------------------------------------------------------
  describe('3. Baseline Catalog Promotion & Immutability', () => {
    it('promotes baseline CPTS_NOTES entry to customNotes without mutating baseline static catalog', async () => {
      expect(CPTS_NOTES.length).toBeGreaterThan(0);
      const baselineNote = CPTS_NOTES[0];
      const baselineId = baselineNote.id;
      const originalBaselineMarkdown = baselineNote.rawMarkdown || baselineNote.summary;

      // Ensure customNotes is empty initially
      useCtfStore.setState({
        customNotes: [],
        userNotes: [],
      });

      const editedMarkdown = '# Customized Baseline Guide\n\nAdded custom flags and notes.';
      await useCtfStore.getState().updateNoteContent(baselineId, editedMarkdown);

      // Invariant 1: Static CPTS_NOTES catalog remains completely IMMUTABLE
      const baselineAfter = CPTS_NOTES.find((n) => n.id === baselineId);
      expect(baselineAfter).toBeDefined();
      expect(baselineAfter?.rawMarkdown || baselineAfter?.summary).toBe(originalBaselineMarkdown);
      expect(baselineAfter?.rawMarkdown).not.toBe(editedMarkdown);

      // Invariant 2: Note has been promoted into customNotes
      const customNotes = useCtfStore.getState().customNotes;
      expect(customNotes.length).toBe(1);
      const promoted = customNotes.find((n) => n.id === baselineId);
      expect(promoted).toBeDefined();
      expect(promoted?.rawMarkdown).toBe(editedMarkdown);
      expect(promoted?.title).toBe(baselineNote.title);
      expect(promoted?.dateModified).toBeDefined();

      // Invariant 3: getActiveNote in workspace returns the promoted custom note over baseline
      useNotesWorkspaceStore.setState({ activeTabId: baselineId });
      const activeNote = useNotesWorkspaceStore.getState().getActiveNote();
      expect(activeNote).toBeDefined();
      expect(activeNote?.rawMarkdown).toBe(editedMarkdown);
    });

    it('subsequent edits to a promoted note update customNotes without creating duplicate entries', async () => {
      const baselineId = CPTS_NOTES[0].id;
      useCtfStore.setState({ customNotes: [], userNotes: [] });

      // First edit promotes
      await useCtfStore.getState().updateNoteContent(baselineId, 'First edit');
      expect(useCtfStore.getState().customNotes.length).toBe(1);

      // Second edit updates the promoted record
      await useCtfStore.getState().updateNoteContent(baselineId, 'Second edit');
      expect(useCtfStore.getState().customNotes.length).toBe(1);
      expect(useCtfStore.getState().customNotes[0].rawMarkdown).toBe('Second edit');
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
