import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

const globalVars: GlobalVariables = { lhost: '10.10.14.1', lport: '4444', targetIp: '10.10.10.10', interface: 'tun0', customVars: {} };

// The open note's store content changes because another tab saved it (NOTES_UPDATED reload or storage merge).
const base: CptsNoteEntry = {
  id: 'n-remote',
  title: 'Remote note',
  titleEn: 'Remote note',
  category: 'Recon',
  rawCategory: 'Recon',
  subCategory: '',
  tags: [],
  difficulty: 'Easy',
  summary: '',
  commands: [],
  relPath: 'Recon/Remote note.md',
  rawMarkdown: 'original text',
};
const withText = (rawMarkdown: string): CptsNoteEntry => ({ ...base, rawMarkdown });

let updateNoteContent: ReturnType<typeof vi.fn>;
const textarea = () => screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
const view = (note: CptsNoteEntry, viewMode: 'raw' | 'split' = 'raw') => (
  <ObsidianTabContent note={note} isActive={true} globalVars={globalVars} soundEnabled={false} onNavigateToNote={vi.fn()} viewMode={viewMode} />
);
const conflictToasts = () => useToastStore.getState().toasts.filter((t) => t.title === 'Note changed in another tab');

describe('editor receives a change made in another tab', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    updateNoteContent = vi.fn().mockResolvedValue(undefined);
    useCtfStore.setState({ updateNoteContent } as unknown as Parameters<typeof useCtfStore.setState>[0]);
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['raw', 'split'] as const)('without unsaved edits the %s editor shows the remote text', (mode) => {
    const r = render(view(withText('original text'), mode));
    r.rerender(view(withText('remote text'), mode));
    expect(textarea().value).toBe('remote text');
    expect(conflictToasts()).toHaveLength(0);
    expect(updateNoteContent).not.toHaveBeenCalled();
  });

  it.each(['raw', 'split'] as const)('with unsaved edits the %s editor keeps the local text and warns once', (mode) => {
    const r = render(view(withText('original text'), mode));
    fireEvent.change(textarea(), { target: { value: 'my unsaved text' } });
    r.rerender(view(withText('remote text'), mode));

    expect(textarea().value).toBe('my unsaved text');
    expect(conflictToasts()).toEqual([
      expect.objectContaining({
        message: "Your unsaved edits are kept; saving will overwrite the other tab's version.",
      }),
    ]);

    // Same remote text again: no second toast. Saving writes the local text (last save wins).
    r.rerender(view(withText('remote text'), mode));
    expect(conflictToasts()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(updateNoteContent).toHaveBeenLastCalledWith('n-remote', 'my unsaved text');
  });

  it('the store echo of this editor\'s own save is not treated as a remote change', async () => {
    const r = render(view(withText('original text')));
    fireEvent.change(textarea(), { target: { value: 'saved here' } });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(updateNoteContent).toHaveBeenCalledWith('n-remote', 'saved here');
    r.rerender(view(withText('saved here')));
    expect(textarea().value).toBe('saved here');
    expect(conflictToasts()).toHaveLength(0);

    // After the save the editor counts as clean again, so a later remote change is adopted.
    r.rerender(view(withText('remote after save')));
    expect(textarea().value).toBe('remote after save');
    expect(conflictToasts()).toHaveLength(0);
  });
});
