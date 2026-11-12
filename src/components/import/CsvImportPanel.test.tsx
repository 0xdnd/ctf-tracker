import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { CsvImportPanel } from './CsvImportPanel';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { buildMachinesCsv } from '../../utils/machinesCsv';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const box = (over: Partial<Machine>): Machine => ({
  id: 'x', name: 'X', ip: '10.10.x.x', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'backlog',
  tags: [], certifications: [], timeSpentSeconds: 0,
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', ...over,
});

const seed = (): Machine[] => [
  box({ id: 'htb-lame', name: 'Lame' }),
  box({ id: 'htb-forest', name: 'Forest' }),
  box({ id: 'htb-sauna', name: 'Sauna', status: 'completed', quickNotes: 'mine', rootPwnedAt: '2025-03-04T00:00:00.000Z' }),
];

const CSV = 'Name,Platform,Status\r\nLame,HTB,root\r\nSauna,HTB,backlog\r\nBrand New,,foothold\r\n,,root\r\n';

const choose = (content: string, name = 'machines.csv') => {
  const input = screen.getByLabelText(/^CSV file/) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([content], name, { type: 'text/csv' })] } });
};

const count = (label: string) => {
  const dt = screen.getByText(label, { selector: 'dt' });
  return dt.parentElement?.querySelector('dd')?.textContent;
};

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  useCtfStore.setState({ machines: seed(), isCatalogLoaded: true, loadCatalog: vi.fn(), soundEnabled: false } as never);
});
afterEach(cleanup);

describe('CsvImportPanel', () => {
  it('previews three groups and errors, then writes only after Import is pressed', async () => {
    const before = useCtfStore.getState().machines;
    const onApplied = vi.fn();
    render(<CsvImportPanel onApplied={onApplied} />);
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    choose(CSV);
    await screen.findByRole('table');
    expect(count('Will link to catalog')).toBe('1');
    expect(count('Skipped')).toBe('1');
    expect(count('Will add as custom')).toBe('1');
    expect(count('Rows with errors')).toBe('1');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Row', 'Name', 'Platform', 'Status', 'Result']);
    expect(within(table).getByText('Error: Name is empty.')).toBeInTheDocument();
    expect(screen.getByText('Nothing changes until you press Import.')).toBeInTheDocument();
    expect(useCtfStore.getState().machines).toBe(before);

    fireEvent.click(screen.getByRole('button', { name: 'Import 2 machines' }));

    const after = useCtfStore.getState().machines;
    expect(after.find((m) => m.id === 'htb-lame')?.status).toBe('root');
    expect(after.find((m) => m.id === 'htb-sauna')).toBe(before.find((m) => m.id === 'htb-sauna'));
    expect(after.find((m) => m.name === 'Brand New')).toMatchObject({ status: 'foothold', isCustom: true });
    const toast = useToastStore.getState().toasts.at(-1);
    expect(toast?.message).toBe('1 linked to catalog, 1 added as custom, 1 skipped, 1 row with errors.');
    expect(onApplied).toHaveBeenCalledWith({ linked: 1, added: 1, skipped: 1 });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('Cancel writes nothing and clears the preview', async () => {
    const before = useCtfStore.getState().machines;
    render(<CsvImportPanel />);
    choose(CSV);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(useCtfStore.getState().machines).toBe(before);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('re-importing the app export changes nothing and offers nothing to import', async () => {
    const before = useCtfStore.getState().machines;
    render(<CsvImportPanel />);
    choose(buildMachinesCsv(before));
    await screen.findByRole('table');
    expect(count('Will link to catalog')).toBe('0');
    expect(count('Will add as custom')).toBe('0');
    expect(count('Skipped')).toBe('3');
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(screen.getByText('Nothing new to import from this file.')).toBeInTheDocument();
    expect(useCtfStore.getState().machines).toBe(before);
  });

  it('offers column pickers when there is no Name column', async () => {
    render(<CsvImportPanel />);
    choose('Box title,Where,Result\nLame,HTB,done\n');
    // "Box title" is not an alias, so the pickers appear.
    const nameSelect = await screen.findByLabelText('Name column');
    expect(screen.getByText('Choose the column that holds the machine names.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.change(nameSelect, { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Platform column'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Status column'), { target: { value: '2' } });
    await screen.findByRole('table');
    expect(count('Will link to catalog')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Import 1 machine' }));
    expect(useCtfStore.getState().machines.find((m) => m.id === 'htb-lame')?.status).toBe('completed');
  });

  it('rejects a file over 2 MB and a file with too many rows', async () => {
    render(<CsvImportPanel />);
    const big = new File(['x'], 'big.csv');
    Object.defineProperty(big, 'size', { value: 2 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText(/^CSV file/), { target: { files: [big] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/limit is 2 MB/);

    choose('Name\n' + Array.from({ length: 5001 }, (_, i) => `Box${i}`).join('\n'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/5,000/));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('waits for the catalog before planning', async () => {
    useCtfStore.setState({ isCatalogLoaded: false } as never);
    render(<CsvImportPanel />);
    choose(CSV);
    expect(await screen.findByText('Loading the machine catalog...')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('has no axe violations with a preview showing', async () => {
    const { container } = render(<CsvImportPanel />);
    choose(CSV);
    await screen.findByRole('table');
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
