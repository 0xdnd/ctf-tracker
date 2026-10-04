import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OperatorProfileModal } from '../../components/auth/OperatorProfileModal';
import { useAuthStore, DEFAULT_DANIEL_PROFILE } from '../../store/useAuthStore';
import { useCtfStore, mergeMachinesWithCatalog } from '../../store/useCtfStore';
import { DEMO_SOLVED_ROSTER } from '../../data/demoSolvedRoster';
import { Machine } from '../../types';

describe('OperatorProfileModal Hook Order & Lifecycle Fortification', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: DEFAULT_DANIEL_PROFILE,
      profiles: [DEFAULT_DANIEL_PROFILE],
      isAuthenticated: true,
      operatorProfileModalOpen: false,
    });

    useCtfStore.setState({
      currentProfileId: 'usr_daniel',
      userSolvesReset: false,
      machines: mergeMachinesWithCatalog(DEMO_SOLVED_ROSTER as Machine[], false),
      soundEnabled: false,
    });
  });

  it('renders null when operatorProfileModalOpen is false without hook violations', () => {
    useAuthStore.setState({ operatorProfileModalOpen: false });
    const { container } = render(<OperatorProfileModal />);
    expect(container.firstChild).toBeNull();
  });

  it('toggles open and closed repeatedly without "Rendered fewer hooks than expected" failure', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    // 1. Initial closed render
    const { rerender } = render(<OperatorProfileModal />);
    expect(screen.queryByText(/Operator Identity & Profiles/i)).not.toBeInTheDocument();

    // 2. Open modal
    act(() => {
      useAuthStore.getState().setOperatorProfileModalOpen(true);
    });
    rerender(<OperatorProfileModal />);
    expect(screen.getByText(/Operator Identity & Profiles/i)).toBeInTheDocument();

    // 3. Close modal (this previously triggered the early return skipping 2 useMemo hooks)
    act(() => {
      useAuthStore.getState().setOperatorProfileModalOpen(false);
    });
    rerender(<OperatorProfileModal />);
    expect(screen.queryByText(/Operator Identity & Profiles/i)).not.toBeInTheDocument();

    // 4. Reopen modal
    act(() => {
      useAuthStore.getState().setOperatorProfileModalOpen(true);
    });
    rerender(<OperatorProfileModal />);
    expect(screen.getByText(/Operator Identity & Profiles/i)).toBeInTheDocument();

    // Verify no React hook mismatch errors were logged
    const hookErrors = consoleErrorSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && (arg.includes('fewer hooks') || arg.includes('rendered more hooks')))
    );
    expect(hookErrors.length).toBe(0);

    consoleErrorSpy.mockRestore();
  });

  it('allows quick-editing active callsign directly from hero banner and saves cleanly', () => {
    act(() => {
      useAuthStore.getState().setOperatorProfileModalOpen(true);
    });
    render(<OperatorProfileModal />);

    // Click quick-edit button on active callsign
    const editBtn = screen.getByTitle('Quick-Edit Active Callsign');
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    // Enter new callsign in the banner input
    const input = screen.getByPlaceholderText('New Callsign');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'SpecterGhost' } });

    // Click save checkmark button
    const saveBtn = screen.getByTitle(/Save Callsign/i);
    fireEvent.click(saveBtn);

    // Store must be atomically updated
    expect(useAuthStore.getState().user?.callsign).toBe('SpecterGhost');
    expect(useAuthStore.getState().profiles[0].callsign).toBe('SpecterGhost');
  });

  it('allows canceling banner edit with Escape key without closing modal', () => {
    act(() => {
      useAuthStore.getState().setOperatorProfileModalOpen(true);
    });
    render(<OperatorProfileModal />);

    const editBtn = screen.getByTitle('Quick-Edit Active Callsign');
    fireEvent.click(editBtn);

    const input = screen.getByPlaceholderText('New Callsign');
    fireEvent.change(input, { target: { value: 'AbandonedCallsign' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Callsign remains untouched
    expect(useAuthStore.getState().user?.callsign).toBe('0xdnd');
    // Modal is still open
    expect(useAuthStore.getState().operatorProfileModalOpen).toBe(true);
  });
});
