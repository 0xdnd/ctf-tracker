import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackChipRow } from './TrackChipRow';
import { TRACK_BY_ID } from '../../data/tracksData';
import type { Machine } from '../../types';

const oscp = TRACK_BY_ID.get('tjnull-oscp')!;
const cpts = TRACK_BY_ID.get('cpts-path')!;
const next = { id: 'htb-x', name: 'Lame' } as Machine;
const progress = new Map([
  [oscp.id, { done: 3, total: 10, percent: 30, next }],
  [cpts.id, { done: 0, total: 4, percent: 0, next: null }],
]);

const setup = (activeTrackId: string | null, extra: { selected?: string[]; hideCompleted?: boolean } = {}) => {
  const onSelect = vi.fn();
  const onOpenMachine = vi.fn();
  const onOpenMulti = vi.fn();
  const onToggleHideCompleted = vi.fn();
  render(
    <TrackChipRow
      tracks={[oscp, cpts]}
      progress={progress}
      activeTrackId={activeTrackId}
      selectedTrackIds={extra.selected ?? (activeTrackId ? [activeTrackId] : [])}
      onSelect={onSelect}
      onOpenMachine={onOpenMachine}
      onOpenMulti={onOpenMulti}
      hideCompleted={extra.hideCompleted ?? false}
      onToggleHideCompleted={onToggleHideCompleted}
    />,
  );
  return { onSelect, onOpenMachine, onOpenMulti, onToggleHideCompleted };
};

describe('TrackChipRow', () => {
  it('shows one chip per track with done/total and no strip while nothing is selected', () => {
    setup(null);
    expect(screen.getByRole('button', { name: /OSCP Track/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('selects a track on tap and clears it when the active chip is tapped again', () => {
    const first = setup(null);
    fireEvent.click(screen.getByRole('button', { name: /CPTS Track/ }));
    expect(first.onSelect).toHaveBeenCalledWith('cpts-path');
  });

  it('shows source, date, progress and the next machine for the active track', () => {
    const { onSelect, onOpenMachine } = setup(oscp.id);
    expect(screen.getByRole('button', { name: /OSCP Track/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(new RegExp(`Source: ${oscp.source}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`As of ${oscp.asOf}`))).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    fireEvent.click(screen.getByRole('button', { name: /Next: Lame/ }));
    expect(onOpenMachine).toHaveBeenCalledWith('htb-x');
    fireEvent.click(screen.getByRole('button', { name: /OSCP Track/ }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('leaves out source and date when the track has none', () => {
    setup(cpts.id);
    expect(cpts.source).toBeUndefined();
    expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/As of/)).not.toBeInTheDocument();
  });

  it('shows no MULTI chip for zero or one selected track', () => {
    setup(null);
    expect(screen.queryByRole('button', { name: /MULTI/ })).not.toBeInTheDocument();
  });

  it('shows an active MULTI chip that opens the drawer when several tracks are selected, with no strip', () => {
    const { onOpenMulti } = setup(null, { selected: [oscp.id, cpts.id] });
    const multi = screen.getByRole('button', { name: /MULTI \(2\)/ });
    expect(multi).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /OSCP Track/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    fireEvent.click(multi);
    expect(onOpenMulti).toHaveBeenCalledTimes(1);
  });

  it('toggles hide completed from the strip and reflects it in aria-pressed', () => {
    const first = setup(oscp.id);
    const toggle = screen.getByRole('button', { name: 'Hide completed' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(first.onToggleHideCompleted).toHaveBeenCalledTimes(1);
  });

  it('marks hide completed pressed when the status filter hides solved machines', () => {
    setup(oscp.id, { hideCompleted: true });
    expect(screen.getByRole('button', { name: 'Hide completed' })).toHaveAttribute('aria-pressed', 'true');
  });
});
