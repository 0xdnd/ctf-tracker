import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NotesWorkspaceTargetBar } from '../../components/workspace/NotesWorkspaceTargetBar';
import { useCtfStore } from '../../store/useCtfStore';

const stubMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const renderBar = () => {
  const props = { onSearch: vi.fn(), onNewNote: vi.fn(), onCopyAll: vi.fn(), canCopyAll: true };
  render(<NotesWorkspaceTargetBar {...props} />);
  return props;
};

beforeEach(() => {
  useCtfStore.setState({ soundEnabled: false });
});
afterEach(cleanup);

describe('NotesWorkspaceTargetBar on phones', () => {
  it('keeps one row: loot, LHOST and the note tools move into a single menu', () => {
    stubMatchMedia(true);
    const props = renderBar();
    expect(screen.queryByTestId('quick-loot-btn')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search notes' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More note actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'New note' }));
    expect(props.onNewNote).toHaveBeenCalledTimes(1);
  });

  it('shows the full bar on wider screens', () => {
    stubMatchMedia(false);
    renderBar();
    expect(screen.getByTestId('quick-loot-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search notes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More note actions' })).toBeNull();
  });
});
