import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { OperatorProfileModal } from '../../components/auth/OperatorProfileModal';
import { useAuthStore, DEFAULT_DANIEL_PROFILE } from '../../store/useAuthStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';

afterEach(() => {
  act(() => useConfirmStore.getState().settle(false));
  cleanup();
});

describe('OperatorProfileModal load sample solves', () => {
  it('does not restore until the danger confirmation is accepted', async () => {
    const restoreDanielSolves = vi.fn();
    useAuthStore.setState({
      user: DEFAULT_DANIEL_PROFILE,
      profiles: [DEFAULT_DANIEL_PROFILE],
      isAuthenticated: true,
      operatorProfileModalOpen: true,
    });
    useCtfStore.setState({
      currentProfileId: 'usr_daniel',
      userSolvesReset: true,
      soundEnabled: false,
      restoreDanielSolves,
    });

    render(<OperatorProfileModal />);
    fireEvent.click(screen.getByRole('button', { name: /Load sample solves/i }));

    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    expect(useConfirmStore.getState().pending?.options.tone).toBe('danger');
    expect(restoreDanielSolves).not.toHaveBeenCalled();

    act(() => useConfirmStore.getState().settle(false));
    await Promise.resolve();
    expect(restoreDanielSolves).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Load sample solves/i }));
    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    act(() => useConfirmStore.getState().settle(true));
    await waitFor(() => expect(restoreDanielSolves).toHaveBeenCalledTimes(1));
  });
});
