import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useCtfStore } from '../../store/useCtfStore';

describe('Sidebar component', () => {
  it('renders collapse toggle button and aside without overflow-hidden', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    // Aside must NOT have overflow-hidden so the floating collapse button is not clipped
    expect(aside?.className).not.toContain('overflow-hidden');

    const toggleBtn = screen.getByRole('button', { name: /Collapse Sidebar/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.className).toContain('-right-3');
  });

  it('toggles collapse state when clicking the arrow button', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('w-72');

    const toggleBtn = screen.getByRole('button', { name: /Collapse Sidebar/i });
    fireEvent.click(toggleBtn);

    expect(aside?.className).toContain('w-16');
    expect(screen.getByRole('button', { name: /Expand Sidebar/i })).toBeInTheDocument();
  });

  it('renders Vault navigation link', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('Vault')).toBeInTheDocument();
  });

  describe('badges follow the store', () => {
    const box = (id: string, extra: Record<string, unknown> = {}) =>
      ({ id, name: `Box ${id}`, tags: [], status: 'backlog', difficulty: 'Easy', platform: 'HTB', ...extra }) as never;
    const badgeOf = (label: string) => within(screen.getByRole('button', { name: new RegExp(label) }));

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
      useCtfStore.setState({
        soundEnabled: false,
        machines: [box('a'), box('b')],
        cheatsheets: Array.from({ length: 85 }, (_, i) => ({ id: `cs-${i}` })) as never,
        userNotes: [],
        customNotes: [],
        deletedNoteIds: [],
      });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('updates the tracker, vault, progress and analytics badges when a machine status changes', () => {
      render(<BrowserRouter><Sidebar /></BrowserRouter>);
      expect(badgeOf('Lab & Target Tracker').getByText('0/2')).toBeInTheDocument();
      expect(badgeOf('Vault').getByText('0')).toBeInTheDocument();
      expect(screen.queryByTestId('review-due-badge')).toBeNull();

      act(() => useCtfStore.getState().updateMachineStatus('a', 'foothold'));
      expect(badgeOf('Lab & Target Tracker').getByText('0/2')).toBeInTheDocument();
      expect(badgeOf('Vault').getByText('1')).toBeInTheDocument();

      act(() => useCtfStore.getState().updateMachineStatus('a', 'root'));
      expect(badgeOf('Lab & Target Tracker').getByText('1/2')).toBeInTheDocument();
      expect(badgeOf('Vault').getByText('1')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();

      act(() => useCtfStore.getState().updateMachine('b', { nextReviewAt: Date.now() - 1000 }));
      expect(screen.getByTestId('review-due-badge')).toHaveTextContent(/^1/);
    });

    it('labels the snippets badge with what it counts', () => {
      render(<BrowserRouter><Sidebar /></BrowserRouter>);
      expect(badgeOf('Snippets').getByText('85').closest('[title]')).toHaveAttribute('title', '85 snippets');

      act(() => useCtfStore.setState({ userNotes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] as never }));
      const badge = badgeOf('Snippets').getByText('88');
      expect(badge.closest('[title]')).toHaveAttribute('title', '85 snippets + 3 notes');
      expect(screen.getByText('85 snippets + 3 notes')).toHaveClass('sr-only');
    });

    it('counts authored notes in the snippets badge and title, and drops them when removed', () => {
      render(<BrowserRouter><Sidebar /></BrowserRouter>);
      expect(badgeOf('Snippets').getByText('85')).toBeInTheDocument();

      act(() => useCtfStore.getState().addCustomNote({ title: 'My new note' }));
      const noteId = useCtfStore.getState().customNotes[0].id;
      const badge = badgeOf('Snippets').getByText('86');
      expect(badge.closest('[title]')).toHaveAttribute('title', '85 snippets + 1 note');

      act(() => useCtfStore.setState({ userNotes: [{ id: 'n1' }, { id: 'n2' }] as never }));
      expect(badgeOf('Snippets').getByText('88').closest('[title]')).toHaveAttribute('title', '85 snippets + 3 notes');

      act(() => useCtfStore.getState().deleteNote(noteId));
      expect(badgeOf('Snippets').getByText('87').closest('[title]')).toHaveAttribute('title', '85 snippets + 2 notes');

      act(() => useCtfStore.setState({ deletedNoteIds: ['n1'] }));
      expect(badgeOf('Snippets').getByText('86').closest('[title]')).toHaveAttribute('title', '85 snippets + 1 note');
    });

    it('raises the due count when a scheduled review passes while the app stays open', () => {
      useCtfStore.setState({ machines: [box('a', { nextReviewAt: Date.now() + 90_000 })] });
      render(<BrowserRouter><Sidebar /></BrowserRouter>);
      expect(screen.queryByTestId('review-due-badge')).toBeNull();

      act(() => { vi.advanceTimersByTime(2 * 60_000); });
      expect(screen.getByTestId('review-due-badge')).toHaveTextContent(/^1/);
    });
  });
});
