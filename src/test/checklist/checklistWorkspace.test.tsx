import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const confirmMock = vi.fn();
vi.mock('../../store/useConfirmStore', () => ({
  confirmAction: (...args: unknown[]) => confirmMock(...args),
}));

import { ChecklistWorkspace } from '../../components/checklist/ChecklistWorkspace';
import { useCtfStore } from '../../store/useCtfStore';

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
});
