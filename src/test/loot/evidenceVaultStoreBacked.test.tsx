import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EvidenceVaultPage, credentialToEvidenceItem, lootItemToEvidenceItem } from '../../pages/EvidenceVaultPage';
import { useCtfStore } from '../../store/useCtfStore';
import { getLootStorageKey, getLegacyProfileLootKey, loadLootState } from '../../store/lootPersistence';
import type { Machine } from '../../types';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
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

const BOX = {
  id: 'box-1',
  name: 'Forest',
  ip: '10.10.10.161',
  platform: 'HTB',
  os: 'Windows',
  tags: [],
  certifications: [],
  difficulty: 'Medium',
  status: 'foothold',
  timeSpentSeconds: 0,
  createdAt: '2026-09-02T09:00:00Z',
  updatedAt: '2026-09-02T10:00:00Z',
} as unknown as Machine;

const stored = () => JSON.parse(localStorage.getItem(getLootStorageKey('guest')) as string);

describe('EvidenceVaultPage backed by the credential/loot store slice', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      currentProfileId: 'guest',
      machines: [BOX],
      soundEnabled: false,
      credentials: [],
      credAttempts: [],
      lootItems: [],
    });
  });

  afterEach(() => cleanup());

  const setup = () =>
    render(
      <MemoryRouter>
        <EvidenceVaultPage />
      </MemoryRouter>
    );

  it('lists store credentials and loot items, resolving the source machine', () => {
    useCtfStore.getState().addCredential({ type: 'password', username: 'svc-alfresco', domain: 'HTB', secret: 'S3cret!', sourceMachineId: 'box-1' });
    useCtfStore.getState().addLootItem({ category: 'flag', title: 'Custom Flag', value: 'HTB{store}', username: 'user' });
    setup();
    expect(screen.getByText('HTB\\svc-alfresco')).toBeInTheDocument();
    expect(screen.getByText('Custom Flag')).toBeInTheDocument();
    expect(screen.getAllByText('Forest').length).toBeGreaterThan(0);
    expect(screen.getByText('Global / Unscoped')).toBeInTheDocument();
  });

  it('logging evidence writes through the store and persists under the v2 key, not the legacy one', async () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: /Log evidence/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Administrator/i), { target: { value: 'backup_admin' } });
    fireEvent.change(screen.getByPlaceholderText(/Paste password, hash/i), { target: { value: 'Spring2026!Pwned' } });
    fireEvent.click(screen.getByRole('button', { name: /Save to Vault/i }));

    await waitFor(() => expect(screen.queryByText('Log new evidence')).not.toBeInTheDocument());
    expect(screen.getByText('backup_admin')).toBeInTheDocument();
    expect(useCtfStore.getState().credentials).toMatchObject([{ type: 'password', username: 'backup_admin', secret: 'Spring2026!Pwned' }]);
    expect(stored().schemaVersion).toBe(1);
    expect(stored().credentials).toHaveLength(1);
    expect(localStorage.getItem(getLegacyProfileLootKey('guest'))).toBeNull();
  });

  it('logging the same credential twice does not create a duplicate row', async () => {
    useCtfStore.getState().addCredential({ type: 'password', username: 'dup_user', secret: 'same' });
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: /Log evidence/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Administrator/i), { target: { value: 'dup_user' } });
    fireEvent.change(screen.getByPlaceholderText(/Paste password, hash/i), { target: { value: 'same' } });
    fireEvent.click(screen.getByRole('button', { name: /Save to Vault/i }));
    await waitFor(() => expect(screen.queryByText('Log new evidence')).not.toBeInTheDocument());
    expect(useCtfStore.getState().credentials).toHaveLength(1);
    expect(screen.getAllByText('dup_user')).toHaveLength(1);
  });

  it('a logged flag is stored as a loot item, not a credential', async () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: /Log evidence/i })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('combobox')[1], { target: { value: 'flag' } });
    fireEvent.change(screen.getByPlaceholderText(/Paste password, hash/i), { target: { value: 'HTB{manual_flag}' } });
    fireEvent.click(screen.getByRole('button', { name: /Save to Vault/i }));
    await waitFor(() => expect(screen.queryByText('Log new evidence')).not.toBeInTheDocument());
    expect(useCtfStore.getState().credentials).toEqual([]);
    expect(useCtfStore.getState().lootItems).toMatchObject([{ category: 'flag', value: 'HTB{manual_flag}', title: 'Custom Flag' }]);
    expect(stored().lootItems).toHaveLength(1);
  });

  it('shows another profile\'s loot after a profile switch', () => {
    useCtfStore.getState().addCredential({ type: 'password', username: 'guest_user', secret: 'g' });
    const { rerender } = setup();
    expect(screen.getByText('guest_user')).toBeInTheDocument();

    localStorage.setItem(
      getLegacyProfileLootKey('vault_other'),
      JSON.stringify([{ id: 'legacy-1', targetId: 'global', category: 'password', typeLabel: 'Password', username: 'other_user', secret: 'o', discoveredAt: '2026-01-01T00:00:00.000Z', notes: '' }])
    );
    act(() => useCtfStore.getState().loadProfileData('vault_other'));
    rerender(
      <MemoryRouter>
        <EvidenceVaultPage />
      </MemoryRouter>
    );
    expect(screen.queryByText('guest_user')).not.toBeInTheDocument();
    expect(screen.getByText('other_user')).toBeInTheDocument();
    expect(loadLootState('vault_other').credentials).toHaveLength(1);
  });

  it('maps store records to page rows (credential buckets, domain principal, unresolved machine)', () => {
    const row = credentialToEvidenceItem(
      { id: 'k', type: 'key', username: 'root', secret: 'PEM', sourceMachineId: 'gone', createdAt: '2026-01-01T00:00:00.000Z' },
      [BOX]
    );
    expect(row).toMatchObject({ category: 'ssh_key', typeLabel: 'SSH Key', targetId: 'global', targetName: 'Global / Unscoped', isCustom: true });
    const ticket = credentialToEvidenceItem(
      { id: 't', type: 'ticket', username: 'krbtgt', domain: 'CORP', secret: 'kirbi', sourceMachineId: 'box-1', createdAt: '2026-01-01T00:00:00.000Z' },
      [BOX]
    );
    expect(ticket).toMatchObject({ category: 'token', typeLabel: 'Ticket', username: 'CORP\\krbtgt', targetId: 'box-1', targetName: 'Forest' });
    const svc = lootItemToEvidenceItem(
      { id: 's', category: 'service', title: 'SMB 445', value: 'Samba', createdAt: '2026-01-01T00:00:00.000Z' },
      [BOX]
    );
    expect(svc).toMatchObject({ category: 'service', typeLabel: 'SMB 445', secret: 'Samba' });
  });
});
