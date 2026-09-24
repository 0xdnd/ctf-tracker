import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TargetReconDropzone } from './TargetReconDropzone';
import { Machine } from '../../types';

describe('TargetReconDropzone component', () => {
  const mockMachine: Machine = {
    id: 'htb-lame',
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: ['Samba', 'CVE'],
    certifications: ['OSCP'],
    timeSpentSeconds: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders dropzone with initial empty state', () => {
    const handleUpdate = vi.fn();
    render(
      <TargetReconDropzone
        machine={mockMachine}
        onUpdateMachine={handleUpdate}
      />
    );

    expect(screen.getByText(/RECON ARTIFACT DROPZONE & SERVICE DISCOVERY/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & Drop Scan File/i)).toBeInTheDocument();
    expect(screen.getByText(/No Services Yet Logged/i)).toBeInTheDocument();
  });

  it('switches between dropzone and paste text mode', () => {
    const handleUpdate = vi.fn();
    render(
      <TargetReconDropzone
        machine={mockMachine}
        onUpdateMachine={handleUpdate}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Paste Scan Output/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByPlaceholderText(/Paste raw Nmap, GNMAP, or Rustscan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to Dropzone/i })).toBeInTheDocument();
  });

  it('processes sample scan and triggers onUpdateMachine with mapped ports', () => {
    const handleUpdate = vi.fn();
    render(
      <TargetReconDropzone
        machine={mockMachine}
        onUpdateMachine={handleUpdate}
      />
    );

    const sampleBtn = screen.getByRole('button', { name: /Sample Scan/i });
    fireEvent.click(sampleBtn);

    expect(handleUpdate).toHaveBeenCalledWith(
      'htb-lame',
      expect.objectContaining({
        openPorts: expect.arrayContaining([21, 22, 80, 139, 445, 3306]),
        status: 'recon',
        scanSummary: expect.stringContaining('Open Ports Discovered'),
        services: expect.arrayContaining([
          expect.objectContaining({ port: 21, service: 'ftp' }),
          expect.objectContaining({ port: 80, service: 'http' }),
          expect.objectContaining({ port: 445, service: 'netbios-ssn' }),
        ]),
      })
    );
  });

  it('renders active services table when machine has services', () => {
    const machineWithServices: Machine = {
      ...mockMachine,
      openPorts: [21, 80, 445],
      services: [
        {
          port: 21,
          protocol: 'tcp',
          state: 'open',
          service: 'ftp',
          version: 'vsftpd 2.3.4',
          cveNotes: 'CVE-2011-2523 (vsftpd Backdoor RCE)',
          suggestedTools: ['ftp', 'hydra'],
        },
        {
          port: 80,
          protocol: 'tcp',
          state: 'open',
          service: 'http',
          version: 'Apache 2.4.49',
          cveNotes: 'CVE-2021-41773 (Apache Path Traversal/RCE)',
          suggestedTools: ['ffuf', 'gobuster'],
        },
      ],
    };

    const handleUpdate = vi.fn();
    render(
      <TargetReconDropzone
        machine={machineWithServices}
        onUpdateMachine={handleUpdate}
      />
    );

    expect(screen.getByText('21/tcp')).toBeInTheDocument();
    expect(screen.getByText('vsftpd 2.3.4')).toBeInTheDocument();
    expect(screen.getByText(/CVE-2011-2523/i)).toBeInTheDocument();
    expect(screen.getByText('80/tcp')).toBeInTheDocument();
    expect(screen.getByText('Apache 2.4.49')).toBeInTheDocument();
    expect(screen.getByText(/CVE-2021-41773/i)).toBeInTheDocument();
  });

  it('allows copying tactical tool commands', () => {
    const machineWithServices: Machine = {
      ...mockMachine,
      services: [
        {
          port: 80,
          protocol: 'tcp',
          state: 'open',
          service: 'http',
          suggestedTools: ['ffuf -u http://<TARGET_IP>/FUZZ'],
        },
      ],
    };

    const handleUpdate = vi.fn();
    render(
      <TargetReconDropzone
        machine={machineWithServices}
        onUpdateMachine={handleUpdate}
      />
    );

    const toolBtn = screen.getByTitle(/Click to copy: ffuf/i);
    expect(toolBtn).toBeInTheDocument();

    fireEvent.click(toolBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ffuf -u http://10.10.10.3/FUZZ');
  });

  it('clears scan data when clicking clear button', () => {
    const machineWithServices: Machine = {
      ...mockMachine,
      services: [{ port: 80, protocol: 'tcp', state: 'open', service: 'http' }],
    };

    const handleUpdate = vi.fn();
    render(
      <TargetReconDropzone
        machine={machineWithServices}
        onUpdateMachine={handleUpdate}
      />
    );

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    expect(handleUpdate).toHaveBeenCalledWith('htb-lame', {
      services: [],
      openPorts: [],
      scanSummary: undefined,
      rawScanOutput: undefined,
    });
  });
});
