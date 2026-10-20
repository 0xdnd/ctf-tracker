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

const setup = (activeTrackId: string | null) => {
  const onSelect = vi.fn();
  const onOpenMachine = vi.fn();
  render(
    <TrackChipRow
      tracks={[oscp, cpts]}
      progress={progress}
      activeTrackId={activeTrackId}
      selectedTrackIds={activeTrackId ? [activeTrackId] : []}
      onSelect={onSelect}
      onOpenMachine={onOpenMachine}
    />,
  );
  return { onSelect, onOpenMachine };
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
});
