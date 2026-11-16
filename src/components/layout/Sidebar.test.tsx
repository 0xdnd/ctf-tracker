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

  it('keeps the layout switch when collapsed, as icon-only buttons with names', () => {
    useCtfStore.setState({ activeTab: 'tracker', viewMode: 'kanban' } as never);
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByTestId('view-grid')).toHaveTextContent('Cards');
    fireEvent.click(screen.getByRole('button', { name: /Collapse Sidebar/i }));
    const grid = screen.getByRole('button', { name: 'Grid Cards View' });
    expect(grid).toHaveAttribute('data-testid', 'view-grid');
    expect(grid).not.toHaveTextContent('Cards');
    expect(screen.getByTestId('view-kanban')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(grid);
    expect(useCtfStore.getState().viewMode).toBe('grid');
  });

  it('renders Vault navigation link', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('Evidence Vault')).toBeInTheDocument();
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
      expect(badgeOf('Tracker').getByText('0/2')).toBeInTheDocument();
      expect(badgeOf('Evidence Vault').getByText('0')).toBeInTheDocument();
      expect(screen.queryByTestId('review-due-badge')).toBeNull();

      act(() => useCtfStore.getState().updateMachineStatus('a', 'foothold'));
      expect(badgeOf('Tracker').getByText('0/2')).toBeInTheDocument();
      expect(badgeOf('Evidence Vault').getByText('1')).toBeInTheDocument();

      act(() => useCtfStore.getState().updateMachineStatus('a', 'root'));
      expect(badgeOf('Tracker').getByText('1/2')).toBeInTheDocument();
      // The Vault badge counts what the Vault page lists: user flag plus root flag now
      expect(badgeOf('Evidence Vault').getByText('2')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();

      act(() => useCtfStore.getState().updateMachine('b', { nextReviewAt: Date.now() - 1000 }));
      expect(screen.getByTestId('review-due-badge')).toHaveTextContent(/^1/);
    });

    it('counts only snippets in the badge, never notes', () => {
      render(<BrowserRouter><Sidebar /></BrowserRouter>);
      expect(badgeOf('Snippets').getByText('85')).toBeInTheDocument();

      act(() => useCtfStore.setState({ userNotes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] as never }));
      act(() => useCtfStore.getState().addCustomNote({ title: 'My new note' }));
      expect(badgeOf('Snippets').getByText('85')).toBeInTheDocument();
      expect(screen.queryByText('88')).not.toBeInTheDocument();
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
