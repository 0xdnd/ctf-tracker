import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useCtfStore } from '../../store/useCtfStore';
import { BackupModal } from '../../components/backup/BackupModal';
import { NewMachineModal } from '../../components/tracker/NewMachineModal';
import { ReconAutomationModal } from '../../components/automation/ReconAutomationModal';
import { PentestReportModal } from '../../components/writeup/PentestReportModal';
import { NewCptsNoteModal } from '../../components/cheatsheet/NewCptsNoteModal';
import { NotesImportModal } from '../../components/cheatsheet/NotesImportModal';
import { KeyboardShortcutsModal } from '../../components/common/KeyboardShortcutsModal';
import { LicenseModal } from '../../components/common/LicenseModal';
import { OperatorDossierModal } from '../../components/common/OperatorDossierModal';
import { OperatorFlexCardModal } from '../../components/common/OperatorFlexCardModal';
import { QuickAssignIpModal } from '../../components/common/QuickAssignIpModal';
import { MobileNav } from '../../components/layout/MobileNav';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const pressEscape = () => {
  act(() => {
    fireEvent.keyDown(window, { key: 'Escape' });
  });
};

const machine = {
  id: 'm1',
  name: 'Lame',
  ip: '10.10.10.3',
  os: 'Linux',
  platform: 'HTB',
  tags: ['smb'],
} as unknown as Machine;

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  useCtfStore.setState({
    backupModalOpen: false,
    newMachineModalOpen: false,
    reconAutomationModalOpen: false,
    shortcutsModalOpen: false,
    licenseModalOpen: false,
    operatorModalOpen: false,
    flexCardModalOpen: false,
    notesImportModalOpen: false,
    assignIpMachineId: null,
    mobileMenuOpen: false,
  });
});

interface StoreCase {
  label: string;
  flag: string;
  name: string | RegExp;
  element: React.ReactElement;
}

const STORE_CASES: StoreCase[] = [
  { label: 'BackupModal', flag: 'backupModalOpen', name: 'Backup and bulk import', element: <BackupModal /> },
  { label: 'NewMachineModal', flag: 'newMachineModalOpen', name: 'Add new target', element: <NewMachineModal /> },
  {
    label: 'ReconAutomationModal',
    flag: 'reconAutomationModalOpen',
    name: /TACTICAL AUTOMATION HUB/i,
    element: <ReconAutomationModal />,
  },
  { label: 'NotesImportModal', flag: 'notesImportModalOpen', name: /Notes vault/, element: <NotesImportModal /> },
  { label: 'KeyboardShortcutsModal', flag: 'shortcutsModalOpen', name: 'Keyboard shortcuts', element: <KeyboardShortcutsModal /> },
  { label: 'LicenseModal', flag: 'licenseModalOpen', name: 'License and attribution', element: <LicenseModal /> },
  { label: 'OperatorDossierModal', flag: 'operatorModalOpen', name: 'Creator dossier', element: <OperatorDossierModal /> },
  { label: 'OperatorFlexCardModal', flag: 'flexCardModalOpen', name: 'Achievement card', element: <OperatorFlexCardModal /> },
];

describe('modal semantics: store-driven dialogs', () => {
  it.each(STORE_CASES)('$label exposes a named dialog and closes on Escape', ({ flag, name, element }) => {
    useCtfStore.setState({ [flag]: true } as never);
    render(element);

    const dialog = screen.getByRole('dialog', { name });
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    pressEscape();
    expect((useCtfStore.getState() as unknown as Record<string, unknown>)[flag]).toBe(false);
  });

  it('KeyboardShortcutsModal renders without an enter animation (instant)', () => {
    useCtfStore.setState({ shortcutsModalOpen: true });
    render(<KeyboardShortcutsModal />);
    const backdrop = document.querySelector('[data-modal-backdrop]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    expect(backdrop.style.opacity).toBe('');
  });

  it('QuickAssignIpModal exposes a named dialog and closes on Escape', () => {
    useCtfStore.setState({ machines: [machine], assignIpMachineId: 'm1' });
    render(<QuickAssignIpModal />);

    const dialog = screen.getByRole('dialog', { name: /Assign spawned target IP/ });
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    pressEscape();
    expect(useCtfStore.getState().assignIpMachineId).toBeNull();
  });
});

describe('modal semantics: prop-driven dialogs', () => {
  it('PentestReportModal exposes a named dialog and Escape calls onClose', () => {
    const onClose = vi.fn();
    render(<PentestReportModal machine={machine} isOpen onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Executive report' }).getAttribute('aria-modal')).toBe('true');
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('PentestReportModal names the locked state for active labs', () => {
    const onClose = vi.fn();
    render(<PentestReportModal machine={{ ...machine, isActive: true } as Machine} isOpen onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /Report Prohibited/ })).toBeTruthy();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('NewCptsNoteModal exposes a named dialog and Escape calls onClose', () => {
    const onClose = vi.fn();
    render(<NewCptsNoteModal isOpen onClose={onClose} onSave={vi.fn()} existingDirectories={['Methodology']} />);
    expect(screen.getByRole('dialog', { name: /New field manual note/ }).getAttribute('aria-modal')).toBe('true');
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('modal semantics: MobileNav drawer', () => {
  it('exposes a named dialog, locks scroll, and closes on Escape', () => {
    useCtfStore.setState({ mobileMenuOpen: true });
    render(
      <MemoryRouter>
        <MobileNav />
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    pressEscape();
    expect(useCtfStore.getState().mobileMenuOpen).toBe(false);
  });
});
