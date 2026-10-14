import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  MultiRecordImportModal,
  MultiRecordPreviewTable,
  planMultiRecordImport,
  formatPortList,
  mergeServices,
} from './MultiRecordImportModal';
import type { Machine } from '../../types';
import type { ParsedMultiHost } from '../../utils/scanParserUtils';

const port = (n: number, service: string) => ({ port: n, protocol: 'tcp', state: 'open', service, version: '', suggestedTools: [] });

const records: ParsedMultiHost[] = [
  { ip: '10.0.0.1', hostnames: ['alpha'], ports: [port(22, 'ssh'), port(80, 'http')] },
  { ip: '10.0.0.2', hostnames: [], ports: [] },
];

const SCAN = `Nmap scan report for alpha (10.0.0.1)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http

Nmap scan report for 10.0.0.2
PORT    STATE SERVICE
445/tcp open  microsoft-ds
`;

const tracked = { id: 'm1', name: 'Existing', ip: '10.0.0.2' };

describe('planMultiRecordImport', () => {
  it('marks records at a tracked IP as updates and the rest as creates', () => {
    const rows = planMultiRecordImport(records, [tracked]);
    expect(rows.map((r) => r.action)).toEqual(['create', 'update']);
    expect(rows[1].existing?.id).toBe('m1');
  });
});

describe('MultiRecordPreviewTable', () => {
  it('lists each record with its port list and action', () => {
    render(<MultiRecordPreviewTable rows={planMultiRecordImport(records, [tracked])} />);
    expect(formatPortList(records[0])).toBe('22/tcp ssh, 80/tcp http');
    expect(screen.getByText('22/tcp ssh, 80/tcp http')).toBeTruthy();
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('Create')).toBeTruthy();
    expect(screen.getByText('Update Existing')).toBeTruthy();
  });
});

describe('mergeServices', () => {
  it('unions by port and protocol with the scan winning', () => {
    const merged = mergeServices(
      [{ port: 80, protocol: 'tcp', state: 'open', service: 'old' }],
      [{ port: 22, protocol: 'tcp', state: 'open', service: 'ssh' }, { port: 80, protocol: 'tcp', state: 'open', service: 'http' }],
    );
    expect(merged.map((s) => `${s.port}:${s.service}`)).toEqual(['22:ssh', '80:http']);
  });
});

describe('MultiRecordImportModal', () => {
  it('previews pasted text and creates/updates on confirm', () => {
    const add = vi.fn();
    const update = vi.fn();
    const onClose = vi.fn();
    const existing = {
      ...tracked,
      os: 'Linux',
      platform: 'Custom',
      difficulty: 'Easy',
      status: 'backlog',
      tags: [],
      certifications: [],
      timeSpentSeconds: 0,
      createdAt: '',
      updatedAt: '',
    } as Machine;
    render(
      <MultiRecordImportModal open onClose={onClose} machines={[existing]} addCustomMachine={add} updateMachine={update} />,
    );
    const confirmBtn = screen.getByRole('button', { name: /Import 0 records/ }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Scan output'), { target: { value: SCAN } });
    expect(screen.getByText(/2 records: 1 to create, 1 to update/)).toBeTruthy();
    expect(screen.getByText('22/tcp ssh, 80/tcp http')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Import 2 records/ }));
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0]).toMatchObject({ ip: '10.0.0.1', name: 'alpha' });
    expect(update).toHaveBeenCalledWith('m1', expect.objectContaining({ openPorts: [445] }));
    expect(onClose).toHaveBeenCalled();
  });
});
