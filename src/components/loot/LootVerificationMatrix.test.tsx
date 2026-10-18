import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LootVerificationMatrix } from './LootVerificationMatrix';
import { Credential, Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';

const mockCredentials: Credential[] = [
  {
    id: 'cred-1',
    type: 'password',
    username: 'administrator',
    secret: 'Password123!',
    domain: 'CORP',
    createdAt: new Date().toISOString(),
    verifications: {
      'mach-1': { status: 'admin', updatedAt: new Date().toISOString() },
    },
  },
  {
    id: 'cred-2',
    type: 'hash',
    username: 'guest',
    secret: 'aad3b435b51404eeaad3b435b51404ee',
    createdAt: new Date().toISOString(),
  },
];

const mockMachines: Machine[] = [
  {
    id: 'mach-1',
    name: 'DC01',
    ip: '10.10.10.1',
    platform: 'HTB',
    difficulty: 'Medium',
    os: 'Windows',
    status: 'recon',
    tags: ['Active Directory', 'Kerberos'],
    certifications: ['CPTS'],
    timeSpentSeconds: 1200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mach-2',
    name: 'WEB01',
    ip: '10.10.10.2',
    platform: 'HTB',
    difficulty: 'Easy',
    os: 'Linux',
    status: 'completed',
    tags: ['Web', 'SQLi'],
    certifications: ['OSCP'],
    timeSpentSeconds: 3600,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('LootVerificationMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCtfStore.setState({
      credentials: mockCredentials,
      machines: mockMachines,
    });
  });

  it('renders matrix with credentials and target machines', () => {
    render(<LootVerificationMatrix credentials={mockCredentials} machines={mockMachines} />);

    expect(screen.getByText('Cross-Host Loot Verification Matrix')).toBeInTheDocument();
    expect(screen.getByText(/CORP\\administrator/i)).toBeInTheDocument();
    expect(screen.getByText(/guest/i)).toBeInTheDocument();
    expect(screen.getByText('DC01')).toBeInTheDocument();
    expect(screen.getByText('WEB01')).toBeInTheDocument();
  });

  it('shows existing verification status badge', () => {
    render(<LootVerificationMatrix credentials={mockCredentials} machines={mockMachines} />);

    const pwnedCell = screen.getByTitle(/Click to cycle status for DC01 \(Current: Pwn3d! \(Admin\)\)/i);
    expect(pwnedCell).toBeInTheDocument();
    expect(pwnedCell).toHaveTextContent(/Pwn3d!/i);
  });

  it('cycles verification status on cell click', () => {
    const setLootVerificationSpy = vi.spyOn(useCtfStore.getState(), 'setLootVerification');

    render(<LootVerificationMatrix credentials={mockCredentials} machines={mockMachines} />);

    // Click on cred-2 for mach-1 which is currently 'untested' -> should become 'user'
    const untestedButtons = screen.getAllByTitle(/Click to cycle status for DC01 \(Current: Untested\)/i);
    expect(untestedButtons.length).toBeGreaterThan(0);
    fireEvent.click(untestedButtons[0]);

    expect(setLootVerificationSpy).toHaveBeenCalledWith('cred-2', 'mach-1', {
      status: 'failed',
      protocol: 'smb',
    });
  });

  it('supports Batch NXC copy action', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    render(<LootVerificationMatrix credentials={mockCredentials} machines={mockMachines} />);

    const batchButtons = screen.getAllByTitle(/Copy NetExec batch scan command across all target hosts/i);
    expect(batchButtons.length).toBeGreaterThan(0);

    fireEvent.click(batchButtons[0]);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
      expect(writeTextSpy.mock.calls[0][0]).toContain('nxc smb');
    });
  });
});
