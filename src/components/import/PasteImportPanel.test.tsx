import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { PasteImportPanel, SAMPLE_SOLVED_LIST } from './PasteImportPanel';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/helpers')>()),
  playCyberSound: vi.fn(),
  triggerRootCelebration: vi.fn(),
}));

const box = (over: Partial<Machine>): Machine => ({
  id: 'x', name: 'X', ip: '10.10.x.x', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'backlog',
  tags: [], certifications: [], timeSpentSeconds: 0,
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', ...over,
});

const seed = [
  box({ id: 'htb-lame', name: 'Lame' }),
  box({ id: 'htb-forest', name: 'Forest' }),
  box({ id: 'htb-sauna', name: 'Sauna', status: 'completed' }),
  box({ id: 'thm-retro', name: 'Retro', platform: 'THM' }),
  box({ id: 'htb-retro', name: 'Retro', platform: 'HTB' }),
];

const textbox = () => screen.getByLabelText(/Box names/);
const type = (v: string) => fireEvent.change(textbox(), { target: { value: v } });

beforeEach(() => {
  vi.mocked(playCyberSound).mockClear();
  vi.mocked(triggerRootCelebration).mockClear();
  useToastStore.setState({ toasts: [] });
  useCtfStore.setState({ machines: seed.map((m) => ({ ...m })), soundEnabled: false, loadCatalog: vi.fn() } as never);
});
afterEach(cleanup);

describe('PasteImportPanel', () => {
  it('marks the textarea placeholder as an example, not real input', () => {
    render(<PasteImportPanel />);
    expect(textbox().getAttribute('placeholder')).toMatch(/^e\.g\.\n/);
  });

  it('changes nothing until Apply, then marks new boxes solved and toasts progress', () => {
    const onApplied = vi.fn();
    render(<PasteImportPanel onApplied={onApplied} />);
    type('Lame, Sauna, Forrest');
    expect(screen.getByRole('button', { name: /^Apply: 1 new, 1 already solved, 1 unmatched$/ })).toBeEnabled();
    expect(useCtfStore.getState().machines.find((m) => m.id === 'htb-lame')?.status).toBe('backlog');

    // Every review row carries a platform badge.
    const rows = within(screen.getByRole('list', { name: 'Matched boxes' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    rows.forEach((r) => expect(r).toHaveTextContent(/HTB|THM|PG|VulnHub/));

    // Picking a suggestion adds that box to the pending import.
    fireEvent.click(screen.getByRole('button', { name: /Add Forest \(HTB\)/ }));
    expect(screen.getByRole('button', { name: /^Apply: 2 new, 1 already solved, 0 unmatched$/ })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /^Apply:/ }));
    const byId = new Map(useCtfStore.getState().machines.map((m) => [m.id, m]));
    expect(byId.get('htb-lame')?.status).toBe('completed');
    expect(byId.get('htb-forest')?.status).toBe('completed');
    expect(onApplied).toHaveBeenCalledWith(2);
    expect(useToastStore.getState().toasts[0].message).toBe('Progress: 3 of 5 solved.');
    expect(textbox()).toHaveValue('');
  });

  it('lists every unmatched name, not just the first eight', () => {
    render(<PasteImportPanel />);
    type(Array.from({ length: 12 }, (_, i) => `Qzxv${i}wk`).join('\n'));
    expect(within(screen.getByRole('list', { name: 'Names not found' })).getAllByRole('listitem')).toHaveLength(12);
  });

  it('biases unprefixed shared names with the platform dropdown', () => {
    render(<PasteImportPanel />);
    type('Retro');
    expect(screen.getByRole('list', { name: 'Matched boxes' })).toHaveTextContent('THM');
    fireEvent.change(screen.getByLabelText('Platform for names without one'), { target: { value: 'HTB' } });
    expect(screen.getByRole('list', { name: 'Matched boxes' })).toHaveTextContent('HTB');
  });

  it('previews an example list without writing anything', () => {
    useCtfStore.setState({ soundEnabled: true } as never);
    const before = structuredClone(useCtfStore.getState().machines);
    const onApplied = vi.fn();
    render(<PasteImportPanel onApplied={onApplied} />);
    type('Forest');
    fireEvent.click(screen.getByRole('button', { name: 'Preview with an example' }));

    expect(textbox()).toHaveValue(SAMPLE_SOLVED_LIST);
    expect(textbox()).toHaveAttribute('readonly');
    const back = screen.getByRole('button', { name: 'Back to my list' });
    expect(back).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('This is an example. Paste your own list to import.');
    within(screen.getByRole('list', { name: 'Matched boxes' })).getAllByRole('listitem')
      .forEach((r) => expect(r).toHaveTextContent('Example only'));

    const applyBtn = screen.getByRole('button', { name: /Preview only/ });
    expect(applyBtn).toHaveAccessibleName('Preview only: nothing is saved');
    expect(applyBtn).toBeDisabled();
    fireEvent.click(applyBtn);

    expect(useCtfStore.getState().machines).toEqual(before);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    expect(triggerRootCelebration).not.toHaveBeenCalled();
    expect(playCyberSound).not.toHaveBeenCalled();
    expect(onApplied).not.toHaveBeenCalled();

    fireEvent.click(back);
    expect(textbox()).toHaveValue('Forest');
    expect(textbox()).not.toHaveAttribute('readonly');
    expect(textbox()).toHaveFocus();
    expect(screen.getByRole('button', { name: /^Apply: 1 new/ })).toBeEnabled();
  });

  it('still applies a real pasted list with sound and celebration', () => {
    useCtfStore.setState({ soundEnabled: true } as never);
    render(<PasteImportPanel />);
    type('Lame');
    fireEvent.click(screen.getByRole('button', { name: /^Apply: 1 new/ }));
    expect(useCtfStore.getState().machines.find((m) => m.id === 'htb-lame')?.status).toBe('completed');
    expect(triggerRootCelebration).toHaveBeenCalledTimes(1);
    expect(playCyberSound).toHaveBeenCalledWith('root');
  });

  it('has no axe violations with results showing', async () => {
    const { container } = render(<PasteImportPanel />);
    type('Lame, Sauna, Forrest');
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it('has no axe violations in preview mode', async () => {
    const { container } = render(<PasteImportPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview with an example' }));
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
