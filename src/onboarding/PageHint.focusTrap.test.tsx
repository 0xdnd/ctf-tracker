import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingLayer } from './OnboardingLayer';
import { useOnboardingStore } from './useOnboardingStore';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';
import { useFocusTrap } from '../hooks/useFocusTrap';

/** Stand-in for Settings / Backup: a focus-trapped modal that closes on Escape. */
const TrappedModal: React.FC = () => {
  const [open, setOpen] = useState(true);
  const ref = useFocusTrap<HTMLDivElement>({ isActive: open, onClose: () => setOpen(false) });
  if (!open) return <div data-testid="modal-closed" />;
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Settings" data-testid="modal">
      <button>modal-first</button>
      <button>modal-last</button>
    </div>
  );
};

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <TrappedModal />
      <OnboardingLayer />
    </MemoryRouter>,
  );

describe('PageHint over a focus-trapped modal', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingStore.setState({
      tourDone: true,
      dismissedHints: [],
      tipsOff: false,
      tourActive: false,
      stepIndex: 0,
      guide: null,
      handsOn: null,
      requestedBackupTab: null,
      backupTab: null,
    });
    useExamStore.setState({ status: 'idle' });
    useNotesWorkspaceStore.setState({ isOpen: false });
    // The settings intro is owned by the Settings modal, so it shows over it.
    useCtfStore.setState({ settingsModalOpen: true, viewMode: 'kanban', selectedMachineId: null });
  });

  afterEach(() => {
    useCtfStore.setState({ settingsModalOpen: false });
  });

  it('puts the hint buttons in the modal Tab cycle so the keyboard can reach and dismiss them', () => {
    mount();
    const hint = screen.getByTestId('page-hint');
    const hintButtons = Array.from(hint.querySelectorAll('button'));
    expect(hintButtons.length).toBeGreaterThan(0);
    const hintLast = hintButtons[hintButtons.length - 1];
    const modalFirst = screen.getByRole('button', { name: 'modal-first' });
    const modalLast = screen.getByRole('button', { name: 'modal-last' });

    // Tab past the last modal control is no longer swallowed: the browser can move on to the hint
    modalLast.focus();
    expect(fireEvent.keyDown(modalLast, { key: 'Tab' })).toBe(true);

    // Shift+Tab from the first modal control wraps backwards onto the hint
    modalFirst.focus();
    expect(fireEvent.keyDown(modalFirst, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(hintLast);

    // Tab from the last hint control wraps back into the modal
    expect(fireEvent.keyDown(hintLast, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(modalFirst);

    // A focused hint button dismisses it
    hintLast.focus();
    act(() => {
      fireEvent.click(hintLast);
    });
    expect(screen.queryByTestId('page-hint')).toBeNull();
    expect(useOnboardingStore.getState().dismissedHints.length + (useOnboardingStore.getState().guide ? 1 : 0)).toBeGreaterThan(0);
  });

  it('Escape still closes the modal while focus is on the hint', () => {
    mount();
    const hint = screen.getByTestId('page-hint');
    const first = hint.querySelector('button') as HTMLButtonElement;
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.getByTestId('modal-closed')).toBeInTheDocument();
  });
});
