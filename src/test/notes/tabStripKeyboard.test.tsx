import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { useNotesWorkspaceStore, cheatTabId } from '../../store/useNotesWorkspaceStore';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { NotesWorkspaceTabStrip } from '../../components/workspace/NotesWorkspaceTabStrip';

const ids = INITIAL_CHEATSHEET.slice(0, 3).map((c) => cheatTabId(c.id));

describe('notes tab strip keyboard', () => {
  beforeEach(() => {
    act(() => {
      useNotesWorkspaceStore.setState({ openTabIds: ids, activeTabId: ids[0], isSwitcherOpen: false });
    });
  });
  afterEach(() => cleanup());

  it('keeps only the active tab in the Tab order and exposes a real tablist box', () => {
    render(<NotesWorkspaceTabStrip />);
    const list = screen.getByRole('tablist');
    expect(getComputedStyle(list).display).not.toBe('contents');
    expect(list.className).not.toContain('contents');
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('moves selection with arrow keys, wraps, and Home/End jump', () => {
    render(<NotesWorkspaceTabStrip />);
    fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'ArrowRight' });
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(ids[1]);
    fireEvent.keyDown(screen.getAllByRole('tab')[1], { key: 'End' });
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(ids[2]);
    fireEvent.keyDown(screen.getAllByRole('tab')[2], { key: 'ArrowRight' });
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(ids[0]);
    fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'ArrowLeft' });
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(ids[2]);
  });

  it('closes the focused tab with Delete', () => {
    render(<NotesWorkspaceTabStrip />);
    fireEvent.keyDown(screen.getAllByRole('tab')[1], { key: 'Delete' });
    expect(useNotesWorkspaceStore.getState().openTabIds).toEqual([ids[0], ids[2]]);
  });

  it('moves focus to the new active tab after Delete', async () => {
    render(<NotesWorkspaceTabStrip />);
    fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'Delete' });
    const remaining = useNotesWorkspaceStore.getState();
    expect(remaining.openTabIds).toEqual([ids[1], ids[2]]);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getAllByRole('tab').find((t) => t.dataset.tabId === remaining.activeTabId));
    });
  });

  it('moves focus to the new active tab after a close button click', async () => {
    render(<NotesWorkspaceTabStrip />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Close tab/ })[0]);
    await waitFor(() => {
      const active = useNotesWorkspaceStore.getState().activeTabId;
      expect(document.activeElement).toBe(screen.getAllByRole('tab').find((t) => t.dataset.tabId === active));
    });
  });

  it('focuses the Open anything button when the last tab closes', async () => {
    act(() => {
      useNotesWorkspaceStore.setState({ openTabIds: [ids[0]], activeTabId: ids[0] });
    });
    render(<NotesWorkspaceTabStrip />);
    fireEvent.keyDown(screen.getByRole('tab'), { key: 'Delete' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open anything' })));
  });
});
