import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const confirmMock = vi.fn();
vi.mock('../../store/useConfirmStore', () => ({
  confirmAction: (...args: unknown[]) => confirmMock(...args),
}));

import { ChecklistWorkspace } from '../../components/checklist/ChecklistWorkspace';
import { useCtfStore } from '../../store/useCtfStore';
import { generateApplicablePhases } from '../../data/methodologyFramework';
import type { Machine } from '../../types';

const machine = {
  id: 'm-test',
  name: 'TestBox',
  os: 'Linux',
  platform: 'HackTheBox',
  difficulty: 'Easy',
  openPorts: [80],
} as any;

describe('ChecklistWorkspace', () => {
  beforeEach(() => {
    confirmMock.mockReset();
  });

  it('renders progress HUD and toggles a phase accordion', () => {
    render(<ChecklistWorkspace machine={machine} />);
    expect(screen.getByText(/Methodology completion/i)).toBeInTheDocument();
    const triggers = screen.getAllByText(/^0\d$/).map((n) => n.closest('button') as HTMLButtonElement);
    const second = triggers[1];
    fireEvent.click(second);
    expect(second.parentElement?.querySelector('textarea, [class*="overflow-hidden"]')).toBeTruthy();
  });

  it('resets the checklist only after confirmAction resolves true', async () => {
    const reset = vi.fn();
    useCtfStore.setState({ resetMachineChecklist: reset } as any);
    confirmMock.mockResolvedValue(true);
    render(<ChecklistWorkspace machine={machine} />);
    fireEvent.click(screen.getByTitle('Reset Checklist Progress'));
    await waitFor(() => expect(reset).toHaveBeenCalledWith('m-test'));
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger' }));
  });

  it('does not reset when confirmation is declined', async () => {
    const reset = vi.fn();
    useCtfStore.setState({ resetMachineChecklist: reset } as any);
    confirmMock.mockResolvedValue(false);
    render(<ChecklistWorkspace machine={machine} />);
    fireEvent.click(screen.getByTitle('Reset Checklist Progress'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(reset).not.toHaveBeenCalled();
  });

  it('imports open ports from pasted nmap text via the shared scan parser and merges them', () => {
    const setPorts = vi.fn();
    useCtfStore.setState({ setMachineOpenPorts: setPorts } as any);
    render(<ChecklistWorkspace machine={machine} />);
    fireEvent.click(screen.getByText('Import Nmap Scan'));
    fireEvent.change(screen.getByLabelText('Paste Nmap scan stdout'), {
      target: {
        value:
          'Nmap scan report for 10.10.10.5\nPORT    STATE  SERVICE\n22/tcp  open   ssh\n80/tcp  open   http\n81/tcp  closed unknown\n445/tcp open   microsoft-ds\n',
      },
    });
    fireEvent.click(screen.getByText('Extract Ports & Update Checklist'));
    expect(setPorts).toHaveBeenCalledWith('m-test', [22, 80, 445]);
  });

  it('exposes the nmap import as a named dialog that closes on Escape', async () => {
    render(<ChecklistWorkspace machine={machine} />);
    fireEvent.click(screen.getByText('Import Nmap Scan'));
    const dialog = screen.getByRole('dialog', { name: 'Import Nmap scan output' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('ChecklistWorkspace Next up card (methodology variant)', () => {
  const originalSetChecklistItemStatus = useCtfStore.getState().setChecklistItemStatus;

  afterEach(() => {
    useCtfStore.setState({ setChecklistItemStatus: originalSetChecklistItemStatus } as any);
  });

  it('does not render the Next up card, or remove the Current objective line, for the default variant', () => {
    render(<ChecklistWorkspace machine={machine} />);
    expect(screen.getByText(/Current objective:/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark done/i })).not.toBeInTheDocument();
  });

  it('picks the first applicable not-done item as Next up', () => {
    render(<ChecklistWorkspace machine={machine} variant="methodology" />);
    expect(screen.queryByText(/Current objective:/i)).not.toBeInTheDocument();
    const card = within(screen.getByTestId('next-up-card'));
    expect(card.getByText('Fast SYN Scan (Top 1000 TCP Ports)')).toBeInTheDocument();
    expect(card.getByText(/Phase 01/i)).toBeInTheDocument();
  });

  it('prefers the active item over the first not-done item', () => {
    const activeMachine = {
      ...machine,
      checklist: {
        openPorts: machine.openPorts,
        activeItemId: 'p02-banner-grab',
        itemsState: { 'p02-banner-grab': { status: 'in_progress' } },
      },
    };
    render(<ChecklistWorkspace machine={activeMachine} variant="methodology" />);
    expect(within(screen.getByTestId('next-up-card')).getByText('Banner Grabbing & Service Response Check')).toBeInTheDocument();
  });

  it('is hidden for active-target machines, where checklist edits are no-ops', () => {
    render(<ChecklistWorkspace machine={{ ...machine, isActive: true }} variant="methodology" />);
    expect(screen.queryByRole('button', { name: /Mark done/i })).not.toBeInTheDocument();
  });

  it('shows a completion message once every applicable item is done or n/a', () => {
    const phases = generateApplicablePhases(machine as Machine, machine.openPorts || []);
    const itemsState: Record<string, { status: 'done' }> = {};
    phases.forEach((phase) =>
      phase.subcategories.forEach((subcat) =>
        subcat.items.forEach((item) => {
          itemsState[item.id] = { status: 'done' };
        })
      )
    );
    const doneMachine = { ...machine, checklist: { openPorts: machine.openPorts, activeItemId: null, itemsState } };
    render(<ChecklistWorkspace machine={doneMachine} variant="methodology" />);
    expect(screen.getByText(/done or marked N\/A/i)).toBeInTheDocument();
  });

  it('Mark done advances the Next up card to the next applicable item', () => {
    function Harness() {
      const [m, setM] = useState<Machine>(machine as Machine);
      useCtfStore.setState({
        setChecklistItemStatus: ((_machineId: string, itemId: string, status: string) => {
          setM((prev) => {
            const existing = prev.checklist || { openPorts: prev.openPorts || [], activeItemId: null, itemsState: {} };
            return {
              ...prev,
              checklist: {
                ...existing,
                activeItemId: status === 'in_progress' ? itemId : existing.activeItemId,
                itemsState: { ...existing.itemsState, [itemId]: { status } },
              },
            } as Machine;
          });
        }) as any,
      } as any);
      return <ChecklistWorkspace machine={m} variant="methodology" />;
    }

    render(<Harness />);
    expect(within(screen.getByTestId('next-up-card')).getByText('Fast SYN Scan (Top 1000 TCP Ports)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mark done/i }));
    expect(within(screen.getByTestId('next-up-card')).getByText('Full 65,535 TCP Exhaustive Port Sweep')).toBeInTheDocument();
  });
});
