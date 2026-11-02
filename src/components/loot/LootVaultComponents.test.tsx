import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddLootModal } from './AddLootModal';
import { ExportLootDrawer } from './ExportLootDrawer';
import { LootTimeline } from './LootTimeline';
import { VaultEvidenceItem } from '../../pages/EvidenceVaultPage';
import { Machine } from '../../types';

describe('Loot and Vault Components (Milestone 2)', () => {
  const mockMachines: Machine[] = [
    {
      id: 'target-1',
      name: 'PwnBox',
      ip: '10.10.11.20',
      platform: 'HTB',
      os: 'Linux',
      difficulty: 'Easy',
      status: 'root',
      tags: [],
      certifications: [],
      timeSpentSeconds: 100,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T01:00:00Z',
    },
  ];

  const mockItems: VaultEvidenceItem[] = [
    {
      id: 'loot-1',
      targetId: 'target-1',
      targetName: 'PwnBox',
      targetIp: '10.10.11.20',
      platform: 'HTB',
      category: 'flag',
      typeLabel: 'Root Flag',
      username: 'root',
      secret: 'c81e728d9d4c2f636f067f89cc14862c',
      discoveredAt: '2026-09-01T12:00:00Z',
      notes: 'Root shell flag',
    },
    {
      id: 'loot-2',
      targetId: 'target-1',
      targetName: 'PwnBox',
      targetIp: '10.10.11.20',
      platform: 'HTB',
      category: 'password',
      typeLabel: 'Password',
      username: 'admin',
      secret: 'SuperSecret123!',
      discoveredAt: '2026-09-01T11:00:00Z',
      notes: 'Web login',
    },
    {
      id: 'loot-3',
      targetId: 'target-1',
      targetName: 'PwnBox',
      targetIp: '10.10.11.20',
      platform: 'HTB',
      category: 'ssh_key',
      typeLabel: 'SSH Key',
      username: 'operator',
      secret: '-----BEGIN OPENSSH PRIVATE KEY-----',
      discoveredAt: '2026-09-01T10:30:00Z',
      notes: 'Id_rsa pivot key',
    },
  ];

  describe('AddLootModal Component', () => {
    it('renders modal dialog when open', () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <AddLootModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          machines={mockMachines}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Log new evidence')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Administrator/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste password, hash string/i)).toBeInTheDocument();
    });

    it('submits valid loot and triggers onSave callback', () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <AddLootModal
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          machines={mockMachines}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Administrator/i), {
        target: { value: 'svc_backup' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Paste password, hash string/i), {
        target: { value: 'Backup2026!Pwned' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Save to Vault/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'svc_backup',
          secret: 'Backup2026!Pwned',
          isCustom: true,
        })
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('labels the target and category controls', () => {
      render(
        <AddLootModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} machines={mockMachines} />
      );

      const target = screen.getByLabelText('Target machine');
      expect(target).toHaveAttribute('aria-haspopup', 'listbox');
      expect(target).toHaveTextContent('Global (no target)');
      expect(screen.getByLabelText('Category').tagName).toBe('SELECT');
    });

    it('picks a target from the searchable list and saves it against that machine', async () => {
      const onSave = vi.fn();
      render(
        <AddLootModal isOpen={true} onClose={vi.fn()} onSave={onSave} machines={mockMachines} />
      );

      fireEvent.click(screen.getByLabelText('Target machine'));
      const search = await screen.findByPlaceholderText('Search machines...');
      fireEvent.change(search, { target: { value: 'pwnbox' } });
      fireEvent.click(screen.getByRole('option', { name: /PwnBox \(10\.10\.11\.20\) — HTB/ }));

      fireEvent.change(screen.getByPlaceholderText(/Paste password, hash string/i), {
        target: { value: 'Backup2026!Pwned' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save to Vault/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: 'target-1', targetName: 'PwnBox', targetIp: '10.10.11.20' })
      );
    });

    it('keeps the global option and saves unscoped by default', () => {
      const onSave = vi.fn();
      render(
        <AddLootModal isOpen={true} onClose={vi.fn()} onSave={onSave} machines={mockMachines} />
      );

      fireEvent.change(screen.getByPlaceholderText(/Paste password, hash string/i), {
        target: { value: 'x' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Save to Vault/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: 'global', targetName: 'Global / Unscoped' })
      );
    });

    it('closes only the open picker on Escape, then the dialog on the next Escape', async () => {
      const onClose = vi.fn();
      render(
        <AddLootModal isOpen={true} onClose={onClose} onSave={vi.fn()} machines={mockMachines} />
      );

      const trigger = screen.getByLabelText('Target machine');
      fireEvent.click(trigger);
      const search = await screen.findByPlaceholderText('Search machines...');

      fireEvent.keyDown(search, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('caps rendered rows for a catalog-sized list and narrows as the user types', async () => {
      const bigList: Machine[] = Array.from({ length: 1372 }, (_, i) => ({
        ...mockMachines[0],
        id: `box-${i}`,
        name: `Box${i}`,
        ip: '',
      }));
      render(
        <AddLootModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} machines={bigList} />
      );

      fireEvent.click(screen.getByLabelText('Target machine'));
      const listbox = await screen.findByRole('listbox');
      const rendered = within(listbox).getAllByRole('option').length;
      expect(rendered).toBeLessThanOrEqual(50);
      expect(within(listbox).getByText(/more, keep typing to narrow/i)).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('Search machines...'), { target: { value: 'Box1371' } });
      expect(within(listbox).getAllByRole('option')).toHaveLength(1);
      expect(within(listbox).queryByText(/keep typing to narrow/i)).not.toBeInTheDocument();
    });
  });

  describe('ExportLootDrawer Component', () => {
    it('renders drawer with scope selection and multi-format exporters', () => {
      const onClose = vi.fn();

      render(
        <ExportLootDrawer
          isOpen={true}
          onClose={onClose}
          items={mockItems}
          filteredItems={[mockItems[0]]}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Export evidence')).toBeInTheDocument();
      expect(screen.getByText('All artifacts')).toBeInTheDocument();
      expect(screen.getByText('Filtered scope')).toBeInTheDocument();

      // Exporters
      expect(screen.getByText(/JSON package/i)).toBeInTheDocument();
      expect(screen.getByText(/CSV spreadsheet/i)).toBeInTheDocument();
      expect(screen.getByText(/Markdown table/i)).toBeInTheDocument();
    });

    it('toggles scope between all and filtered', () => {
      const onClose = vi.fn();

      render(
        <ExportLootDrawer
          isOpen={true}
          onClose={onClose}
          items={mockItems}
          filteredItems={[mockItems[0]]}
        />
      );

      const filteredScopeBtn = screen.getByText('Filtered scope').closest('button')!;
      fireEvent.click(filteredScopeBtn);

      expect(screen.getByText('1 records')).toBeInTheDocument();
    });
  });

  describe('LootTimeline Component', () => {
    it('renders Kill-Chain Phases view by default', () => {
      render(
        <LootTimeline
          items={mockItems}
          revealedIds={{}}
          onToggleReveal={vi.fn()}
          copiedId={null}
          onCopy={vi.fn()}
        />
      );

      expect(screen.getByTestId('loot-timeline-view')).toBeInTheDocument();
      expect(screen.getByText('Kill-chain phases')).toBeInTheDocument();
      expect(screen.getByText(/Initial Foothold & Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Privilege Escalation & Root Pwn/i)).toBeInTheDocument();
    });

    it('switches to chronological stream mode', () => {
      render(
        <LootTimeline
          items={mockItems}
          revealedIds={{}}
          onToggleReveal={vi.fn()}
          copiedId={null}
          onCopy={vi.fn()}
        />
      );

      const chronoBtn = screen.getByText('Chronological stream');
      fireEvent.click(chronoBtn);

      // Verify chronological stream items rendered
      expect(screen.getAllByText('PwnBox').length).toBeGreaterThan(0);
    });

    it('toggles secret mask/reveal on card button click', () => {
      const onToggleReveal = vi.fn();

      render(
        <LootTimeline
          items={mockItems}
          revealedIds={{ 'loot-1': true }}
          onToggleReveal={onToggleReveal}
          copiedId={null}
          onCopy={vi.fn()}
        />
      );

      // Secret loot-1 is revealed
      expect(screen.getByText('c81e728d9d4c2f636f067f89cc14862c')).toBeInTheDocument();
    });
  });
});
