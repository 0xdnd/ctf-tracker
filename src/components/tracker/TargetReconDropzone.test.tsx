import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TargetReconDropzone } from './TargetReconDropzone';
import { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';

const confirmMock = vi.hoisted(() => vi.fn());
vi.mock('../../store/useConfirmStore', () => ({
  confirmAction: (...args: unknown[]) => confirmMock(...args),
}));

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

  it('clears scan data only after the confirmation resolves true', async () => {
    confirmMock.mockResolvedValue(true);
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

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith('htb-lame', {
        services: [],
        openPorts: [],
        scanSummary: undefined,
        rawScanOutput: undefined,
      });
    });
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it('keeps scan data when the clear confirmation is cancelled', async () => {
    confirmMock.mockResolvedValue(false);
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

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  describe('multi-host scans', () => {
    const host = (ip: string, name: string, ports: Array<[number, string]>) => `
  <host>
    <address addr="${ip}" addrtype="ipv4"/>
    <hostnames><hostname name="${name}"/></hostnames>
    <os><osmatch name="Linux 5.4"/></os>
    <ports>${ports
      .map(([p, svc]) => `<port protocol="tcp" portid="${p}"><state state="open"/><service name="${svc}"/></port>`)
      .join('')}</ports>
  </host>`;
    const threeHostXml = `<?xml version="1.0"?><nmaprun scanner="nmap">${host('10.0.0.1', 'alpha.lab', [[22, 'ssh'], [80, 'http']])}${host(
      '10.0.0.2',
      'bravo.lab',
      [[445, 'microsoft-ds']]
    )}${host('10.0.0.3', 'charlie.lab', [[21, 'ftp'], [3306, 'mysql']])}</nmaprun>`;

    const pasteScan = (xml: string, onUpdate = vi.fn()) => {
      render(<TargetReconDropzone machine={mockMachine} onUpdateMachine={onUpdate} />);
      fireEvent.click(screen.getByRole('button', { name: /Paste Scan Output/i }));
      fireEvent.change(screen.getByPlaceholderText(/Paste raw Nmap, GNMAP, or Rustscan/i), { target: { value: xml } });
      fireEvent.click(screen.getByRole('button', { name: /Parse & Apply Scan/i }));
      return onUpdate;
    };

    beforeEach(() => {
      useCtfStore.setState({ machines: [] } as never);
    });

    it('lists all hosts and creates only the selected ones with their ports', () => {
      const onUpdate = pasteScan(threeHostXml);

      expect(onUpdate).not.toHaveBeenCalled();
      expect(screen.getByText(/3 hosts found in this scan/i)).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(4); // select-all + 3 hosts
      expect(screen.getByRole('button', { name: /Create 3 targets/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: /10\.0\.0\.2/ }));
      fireEvent.click(screen.getByRole('button', { name: /Create 2 targets/i }));

      const created = useCtfStore.getState().machines;
      expect(created).toHaveLength(2);
      const alpha = created.find((m) => m.ip === '10.0.0.1')!;
      const charlie = created.find((m) => m.ip === '10.0.0.3')!;
      expect(created.find((m) => m.ip === '10.0.0.2')).toBeUndefined();
      expect(alpha.name).toBe('alpha.lab');
      expect(alpha.os).toBe('Linux');
      expect(alpha.openPorts).toEqual([22, 80]);
      expect(alpha.services?.map((svc) => svc.service)).toEqual(['ssh', 'http']);
      expect(alpha.status).toBe('recon');
      expect(charlie.openPorts).toEqual([21, 3306]);
      expect(charlie.tags).toEqual(expect.arrayContaining(['ftp', 'mysql']));
      expect(screen.getByRole('status')).toHaveTextContent('Created 2 targets');
    });

    it('select-all toggles every new host off and on', () => {
      pasteScan(threeHostXml);
      const selectAll = screen.getByRole('checkbox', { name: /Select all new hosts/i });
      fireEvent.click(selectAll);
      expect(screen.getByRole('button', { name: /Create 0 targets/i })).toBeDisabled();
      fireEvent.click(selectAll);
      expect(screen.getByRole('button', { name: /Create 3 targets/i })).toBeEnabled();
    });

    it('flags hosts whose IP already exists as a machine and does not recreate them', () => {
      useCtfStore.setState({ machines: [{ ...mockMachine, id: 'existing-1', name: 'Existing Box', ip: '10.0.0.2' }] } as never);
      pasteScan(threeHostXml);

      expect(screen.getByText(/Already tracked as Existing Box/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /10\.0\.0\.2/ })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /Create 2 targets/i }));

      const machines = useCtfStore.getState().machines;
      expect(machines).toHaveLength(3);
      expect(machines.filter((m) => m.ip === '10.0.0.2')).toHaveLength(1);
    });

    it('can still apply the first host to the current target', () => {
      const onUpdate = pasteScan(threeHostXml);
      fireEvent.click(screen.getByRole('button', { name: /Apply first host to this target/i }));
      expect(onUpdate).toHaveBeenCalledWith('htb-lame', expect.objectContaining({ openPorts: [22, 80] }));
      expect(useCtfStore.getState().machines).toHaveLength(0);
    });

    it('leaves single-host behaviour unchanged (no host list, direct apply)', () => {
      const single = `<?xml version="1.0"?><nmaprun>${host('10.0.0.9', 'solo.lab', [[22, 'ssh']])}</nmaprun>`;
      const onUpdate = pasteScan(single);
      expect(screen.queryByText(/hosts found in this scan/i)).not.toBeInTheDocument();
      expect(onUpdate).toHaveBeenCalledWith('htb-lame', expect.objectContaining({ openPorts: [22] }));
    });
  });
});
