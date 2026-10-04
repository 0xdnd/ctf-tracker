import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MachineDetailModal } from './MachineDetailModal';
import { useCtfStore } from '../../store/useCtfStore';
import { MemoryRouter } from 'react-router-dom';

describe('InspectorDrawer (MachineDetailModal)', () => {
  const testMachine = {
    id: 'inspector-test-box',
    name: 'TacticalHost',
    ip: '10.10.11.100',
    os: 'Linux' as const,
    platform: 'HTB' as const,
    difficulty: 'Medium' as const,
    status: 'recon' as const,
    tags: ['Web', 'SSTI'],
    certifications: [],
    roomUrl: '',
    timeSpentSeconds: 120,
    quickNotes: 'Initial recon showed port 80 and 22 open.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    useCtfStore.setState({
      machines: [testMachine],
      selectedMachineId: 'inspector-test-box',
      activeTargetId: null,
      soundEnabled: false,
    });
  });

  it('renders right-side slide-over inspector drawer with machine header and click-to-copy IP', () => {
    render(
      <MemoryRouter>
        <MachineDetailModal />
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog', { name: /Machine details for TacticalHost/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.className).toContain('fixed inset-y-0 right-0');
    expect(dialog.className).toContain('machined-edge');

    // Host title and IP badge
    expect(screen.getByText('TacticalHost')).toBeInTheDocument();
    expect(screen.getByText('10.10.11.100')).toBeInTheDocument();
  });

  it('renders Flags Vault with user flag and root flag inputs and copy buttons', () => {
    render(
      <MemoryRouter>
        <MachineDetailModal />
      </MemoryRouter>
    );

    expect(screen.getByText(/FLAGS VAULT/i)).toBeInTheDocument();
    const userFlagInput = screen.getByLabelText(/Enter user flag/i);
    expect(userFlagInput).toBeInTheDocument();

    const rootFlagInput = screen.getByLabelText(/Enter root flag/i);
    expect(rootFlagInput).toBeInTheDocument();

    // Type user flag
    fireEvent.change(userFlagInput, { target: { value: 'HTB{user_pwn_verified}' } });
    expect(useCtfStore.getState().machines[0].userFlag).toBe('HTB{user_pwn_verified}');
  });

  it('renders Target Field Notes & Loot section and updates store on change', () => {
    render(
      <MemoryRouter>
        <MachineDetailModal />
      </MemoryRouter>
    );

    expect(screen.getByText(/TARGET FIELD NOTES & LOOT/i)).toBeInTheDocument();
    const notesArea = screen.getByLabelText(/Target Field Notes/i) as HTMLTextAreaElement;
    expect(notesArea).toBeInTheDocument();
    expect(notesArea.value).toBe('Initial recon showed port 80 and 22 open.');

    // Edit notes
    fireEvent.change(notesArea, { target: { value: 'Gained foothold via SSTI on /profile.' } });
    expect(useCtfStore.getState().machines[0].quickNotes).toBe('Gained foothold via SSTI on /profile.');
  });
});
