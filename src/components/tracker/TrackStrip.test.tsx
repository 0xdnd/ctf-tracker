import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackStrip } from './TrackStrip';
import { TRACK_BY_ID } from '../../data/tracksData';
import type { Machine } from '../../types';

const oscp = TRACK_BY_ID.get('tjnull-oscp')!;
const cpts = TRACK_BY_ID.get('cpts-path')!;
const next = { id: 'htb-x', name: 'Lame' } as Machine;

const setup = (track = oscp, extra: { hideCompleted?: boolean; next?: Machine | null } = {}) => {
  const onOpenMachine = vi.fn();
  const onToggleHideCompleted = vi.fn();
  render(
    <TrackStrip
      track={track}
      progress={{ done: 3, total: 10, percent: 30, next: extra.next === undefined ? next : extra.next }}
      onOpenMachine={onOpenMachine}
      hideCompleted={extra.hideCompleted ?? false}
      onToggleHideCompleted={onToggleHideCompleted}
    />,
  );
  return { onOpenMachine, onToggleHideCompleted };
};

describe('TrackStrip', () => {
  it('shows source, date, progress and the next machine', () => {
    const { onOpenMachine } = setup();
    expect(screen.getByText(new RegExp(`Source: ${oscp.source}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`As of ${oscp.asOf}`))).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    expect(screen.getByText('3/10 · 30%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next: Lame/ }));
    expect(onOpenMachine).toHaveBeenCalledWith('htb-x');
  });

  it('leaves out source and date when the track has none', () => {
    setup(cpts);
    expect(cpts.source).toBeUndefined();
    expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/As of/)).not.toBeInTheDocument();
  });

  it('says every machine is done when nothing is left', () => {
    setup(oscp, { next: null });
    expect(screen.queryByRole('button', { name: /Next:/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Every machine in this track is done/)).toBeInTheDocument();
  });

  it('toggles hide completed and reflects it in aria-pressed', () => {
    const first = setup();
    const toggle = screen.getByRole('button', { name: 'Hide completed' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(first.onToggleHideCompleted).toHaveBeenCalledTimes(1);
  });

  it('marks hide completed pressed when solved machines are hidden', () => {
    setup(oscp, { hideCompleted: true });
    expect(screen.getByRole('button', { name: 'Hide completed' })).toHaveAttribute('aria-pressed', 'true');
  });
});
