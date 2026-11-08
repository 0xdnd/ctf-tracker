import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../../components/layout/Sidebar';
import { NotesRibbon } from '../../components/notes/NotesRibbon';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';

const { openInNewTab } = vi.hoisted(() => ({ openInNewTab: vi.fn() }));
vi.mock('../../utils/openInNewTab', async (orig) => ({
  ...(await orig<typeof import('../../utils/openInNewTab')>()),
  openInNewTab,
}));

beforeEach(() => {
  openInNewTab.mockClear();
  useCtfStore.setState({ soundEnabled: false });
  useNotesWorkspaceStore.setState({ isOpen: false });
});
afterEach(() => cleanup());

const renderSidebar = () => render(<BrowserRouter><Sidebar /></BrowserRouter>);

describe('open in new tab buttons', () => {
  it('sidebar button opens the field manual in a new tab', () => {
    renderSidebar();
    const btn = screen.getByRole('button', { name: 'Open notes in new tab' });
    expect(btn).toHaveAttribute('title', 'Open notes in new tab');
    fireEvent.click(btn);
    expect(openInNewTab).toHaveBeenCalledWith('/field-manual');
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(false);
  });

  it('ribbon button opens the tracker in a new tab and Back keeps its behavior', () => {
    const onBack = vi.fn();
    render(<NotesRibbon activePanel={null} onSelectPanel={vi.fn()} onOpenSwitcher={vi.fn()} onBack={onBack} />);
    const btn = screen.getByRole('button', { name: 'Open ZeroBox in new tab' });
    expect(btn).toHaveAttribute('title', 'Open ZeroBox in new tab');
    fireEvent.click(btn);
    expect(openInNewTab).toHaveBeenCalledWith('/tracker');
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to ZeroBox' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('sidebar Notes link', () => {
  it('is a real link to the field manual', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Notes Workspace' })).toHaveAttribute('href', '/field-manual');
  });

  it('plain click still toggles the sidecar (default prevented)', () => {
    renderSidebar();
    const notAborted = fireEvent.click(screen.getByRole('link', { name: 'Notes Workspace' }));
    expect(notAborted).toBe(false);
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }])(
    'modified click %o is left to the browser',
    (mods) => {
      renderSidebar();
      const notAborted = fireEvent.click(screen.getByRole('link', { name: 'Notes Workspace' }), mods);
      expect(notAborted).toBe(true);
      expect(useNotesWorkspaceStore.getState().isOpen).toBe(false);
    },
  );
});
