import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { HostLootPanel } from './HostLootPanel';
import { getMachineLoot } from '../../utils/machineLoot';
import type { Machine } from '../../types';
import type { CredAttempt, Credential, LootItem } from '../../types/loot';

const M = 'box-1';

const machine = (id = M) => ({ id, name: id }) as Machine;
const cred = (id: string, extra: Partial<Credential> = {}): Credential => ({
  id,
  type: 'password',
  username: id,
  secret: `secret-${id}`,
  createdAt: '2026-01-01',
  ...extra,
});
const att = (credId: string, result: CredAttempt['result']): CredAttempt => ({
  id: `${credId}-${result}`,
  credId,
  machineId: M,
  service: 'smb',
  result,
  at: '2026-01-01',
});

const lootFor = (credentials: Credential[], machineId: string, credAttempts: CredAttempt[] = [], lootItems: LootItem[] = []) =>
  getMachineLoot({ credentials, credAttempts, lootItems }, machineId);

const ui = (m: Machine, ml: ReturnType<typeof lootFor>) => (
  <MemoryRouter>
    <HostLootPanel key={m.id} machine={m} machineLoot={ml} />
  </MemoryRouter>
);

const groupOf = (name: string) => screen.getByRole('heading', { name }).parentElement as HTMLElement;

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => cleanup());

describe('HostLootPanel', () => {
  it('renders each group with the right rows', () => {
    const credentials = [
      cred('works', { domain: 'CORP', verifications: { [M]: { status: 'admin', protocol: 'winrm' } } }),
      cred('found', { sourceMachineId: M }),
      cred('bad', { verifications: { [M]: { status: 'failed' } } }),
      cred('tried'),
      cred('fresh'),
    ];
    const items: LootItem[] = [
      { id: 'i1', category: 'file', title: 'passwd copy', value: '/etc/passwd', machineId: M, createdAt: '2026-01-01' },
    ];
    render(ui(machine(), lootFor(credentials, M, [att('tried', 'tried')], items)));
    expect(screen.getByRole('heading', { name: 'Loot on this host' })).toBeInTheDocument();
    expect(within(groupOf('Works here')).getByText('CORP\\works')).toBeInTheDocument();
    expect(within(groupOf('Works here')).getByText('Admin')).toBeInTheDocument();
    expect(within(groupOf('Works here')).getByText(/winrm/)).toBeInTheDocument();
    expect(within(groupOf('Found here')).getByText('found')).toBeInTheDocument();
    expect(within(groupOf('Failed')).getByText('bad')).toBeInTheDocument();
    expect(within(groupOf('Tried, no result')).getByText('tried')).toBeInTheDocument();
    expect(within(groupOf('Try these here (2)')).getByText('fresh')).toBeInTheDocument();
    expect(within(groupOf('Other loot')).getByText('passwd copy')).toBeInTheDocument();
    expect(within(groupOf('Other loot')).getByText('/etc/passwd')).toBeInTheDocument();
  });

  it('masks the secret by default and reveals it on toggle', () => {
    render(ui(machine(), lootFor([cred('fresh')], M)));
    expect(screen.queryByText('secret-fresh')).not.toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal secret for fresh' }));
    expect(screen.getByText('secret-fresh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide secret for fresh' }));
    expect(screen.queryByText('secret-fresh')).not.toBeInTheDocument();
  });

  it('shows Redacted with reveal and copy disabled', () => {
    render(ui(machine(), lootFor([cred('gone', { redacted: true, secret: '', sourceMachineId: M })], M)));
    expect(screen.getByText('Redacted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal secret for gone' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy secret for gone' })).toBeDisabled();
  });

  it('copies the secret via navigator.clipboard.writeText', () => {
    render(ui(machine(), lootFor([cred('fresh')], M)));
    fireEvent.click(screen.getByRole('button', { name: 'Copy secret for fresh' }));
    expect(writeText).toHaveBeenCalledWith('secret-fresh');
  });

  it('resets reveal when rerendered for a different machine', () => {
    const credentials = [cred('fresh', { verifications: { 'box-2': { status: 'user' } } })];
    const { rerender } = render(ui(machine(), lootFor(credentials, M)));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal secret for fresh' }));
    expect(screen.getByText('secret-fresh')).toBeInTheDocument();
    // Different machine, same credential row (works there): the key remounts the panel.
    rerender(ui(machine('box-2'), lootFor(credentials, 'box-2')));
    expect(screen.getByRole('button', { name: 'Reveal secret for fresh' })).toBeInTheDocument();
    expect(screen.queryByText('secret-fresh')).not.toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(ui(machine(), lootFor([], M)));
    expect(screen.getByText('No loot linked to this machine yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Vault' })).toBeInTheDocument();
  });

  it('links to the Vault for this machine', () => {
    render(ui(machine(), lootFor([cred('fresh')], M)));
    expect(screen.getByRole('link', { name: 'Open in Vault' })).toHaveAttribute('href', `/vault?target=${M}`);
  });
});
