import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { EvidenceVaultPage } from '../../pages/EvidenceVaultPage';
import { useCtfStore } from '../../store/useCtfStore';
import { countVaultItems } from '../../utils/vaultCount';

const base = {
  platform: 'HTB',
  os: 'Linux',
  tags: [],
  certifications: [],
  difficulty: 'Easy',
  timeSpentSeconds: 0,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T09:00:00Z',
};
const svc = (port: number) => ({ port, protocol: 'tcp', state: 'open', service: 'http', version: '' });

const machines = [
  { ...base, id: 'm1', name: 'One', ip: '10.0.0.1', status: 'root', userFlag: 'abc', rootPwnedAt: '2026-09-01T10:00:00Z', services: [svc(80), svc(22)] },
  { ...base, id: 'm2', name: 'Two', ip: '10.0.0.2', status: 'foothold', userPwnedAt: '2026-09-02T10:00:00Z' },
  { ...base, id: 'm3', name: 'Three', ip: '10.0.0.3', status: 'backlog', services: [svc(443)] },
  { ...base, id: 'm4', name: 'Four', ip: '10.0.0.4', status: 'backlog' },
] as never[];

const credentials = [
  { id: 'c1', type: 'password', username: 'u', secret: 's', createdAt: '2026-09-03T10:00:00Z', sourceMachineId: 'm1' },
  { id: 'c2', type: 'hash', username: 'v', secret: 'h', createdAt: '2026-09-03T11:00:00Z' },
] as never[];

const lootItems = [{ id: 'l1', category: 'file', title: 'f', value: 'x', createdAt: '2026-09-04T10:00:00Z', machineId: 'm2' }] as never[];

const pageTotal = () => {
  const label = screen.getByText('Total artifacts');
  return Number(label.nextElementSibling?.textContent);
};

describe('Vault sidebar badge parity with the Vault page', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({ soundEnabled: false });
  });

  it('countVaultItems matches the page total for flags, services, credentials and loot', () => {
    useCtfStore.setState({ machines, credentials, lootItems });
    render(<BrowserRouter><EvidenceVaultPage /></BrowserRouter>);
    // user flag + root flag (pwnedAt) + user flag (pwnedAt) + 3 services + 2 credentials + 1 loot
    expect(pageTotal()).toBe(9);
    expect(countVaultItems(machines as never[], credentials, lootItems)).toBe(pageTotal());
  });

  it('matches on an empty vault', () => {
    useCtfStore.setState({ machines: [], credentials: [], lootItems: [] });
    render(<BrowserRouter><EvidenceVaultPage /></BrowserRouter>);
    expect(countVaultItems([], [], [])).toBe(0);
    expect(pageTotal()).toBe(0);
  });
});
