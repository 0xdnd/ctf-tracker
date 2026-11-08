import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { useCtfStore } from '../../store/useCtfStore';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import type { GlobalVariables } from '../../types';

const globalVars = {
  lhost: '10.10.14.42', lport: '4444', targetIp: '10.10.11.5', domain: 'corp.local', username: 'u', password: 'p',
} as unknown as GlobalVariables;

function mk(id: string, title: string, body: string): CptsNoteEntry {
  return { id, title, category: 'Test', rawMarkdown: body } as unknown as CptsNoteEntry;
}

function renderFor(note: CptsNoteEntry) {
  return render(
    <ObsidianTabContent
      note={note}
      isActive
      globalVars={globalVars}
      soundEnabled={false}
      onNavigateToNote={vi.fn()}
      viewMode="reading"
    />,
  );
}

describe('live backlinks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetNoteIndexCacheForTests();
    useCtfStore.setState({ customNotes: [], userNotes: [], deletedNoteIds: [] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a backlink once another note is edited to link here', async () => {
    const a = mk('A', 'Alpha Note', 'x');
    const b = mk('B', 'Beta Note', 'body');
    useCtfStore.setState({ customNotes: [a, b] });
    renderFor(b);
    expect(screen.queryByText(/OBSIDIAN BACKLINKS/)).toBeNull();

    await act(async () => {
      await useCtfStore.getState().updateNoteContent('A', 'see [[Beta Note]]');
    });
    // The debounce timer is scheduled by an effect, which runs when the first act flushes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByText(/OBSIDIAN BACKLINKS/)).toBeTruthy();
    expect(screen.getByText('Alpha Note')).toBeTruthy();
  });

  it('does not list a deleted note that links here', async () => {
    const a = mk('A', 'Alpha Note', 'see [[Beta Note]]');
    const b = mk('B', 'Beta Note', 'body');
    useCtfStore.setState({ customNotes: [a, b], deletedNoteIds: ['A'] });
    renderFor(b);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.queryByText(/OBSIDIAN BACKLINKS/)).toBeNull();
    expect(screen.queryByText('Alpha Note')).toBeNull();
  });
});
