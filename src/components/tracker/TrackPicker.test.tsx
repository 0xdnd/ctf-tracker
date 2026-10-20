import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackPicker } from './TrackPicker';
import { TRACK_BY_ID } from '../../data/tracksData';
import type { Machine } from '../../types';

const oscp = TRACK_BY_ID.get('tjnull-oscp')!;
const cpts = TRACK_BY_ID.get('cpts-path')!;
const next = { id: 'htb-x', name: 'Lame' } as Machine;
const progress = new Map([
  [oscp.id, { done: 3, total: 10, percent: 30, next }],
  [cpts.id, { done: 0, total: 4, percent: 0, next: null }],
]);

const setup = (selected: string[] = []) => {
  const onSelect = vi.fn();
  const onOpenMulti = vi.fn();
  render(
    <TrackPicker
      tracks={[oscp, cpts]}
      progress={progress}
      selectedTrackIds={selected}
      onSelect={onSelect}
      onOpenMulti={onOpenMulti}
      buttonClassName="toolbar-btn"
    />,
  );
  return { onSelect, onOpenMulti, trigger: screen.getByRole('button', { name: /^Tracks/ }) };
};

describe('TrackPicker', () => {
  it('shows "Tracks" with no menu while nothing is selected', () => {
    const { trigger } = setup();
    expect(trigger).toHaveTextContent('Tracks');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('labels the button with the short name and progress for one track, and "N tracks" for several', () => {
    const { trigger } = setup([oscp.id]);
    expect(trigger).toHaveTextContent(`${oscp.shortName}3/10`);
    expect(trigger).toHaveAccessibleName(`Tracks: ${oscp.shortName} 3/10`);
  });

  it('labels the button "2 tracks" in multi mode', () => {
    const { trigger } = setup([oscp.id, cpts.id]);
    expect(trigger).toHaveTextContent('2 tracks');
  });

  it('opens a menu with one radio row per track, done/total and a progress bar', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Practice tracks' })).toBeInTheDocument();
    const rows = screen.getAllByRole('menuitemradio');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(`${oscp.shortName}3/10`);
    expect(rows[0]).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('menuitem', { name: /Clear track/ })).not.toBeInTheDocument();
  });

  it('opens from the keyboard with ArrowDown and moves focus with the arrow keys', () => {
    const { trigger } = setup();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const rows = screen.getAllByRole('menuitemradio');
    expect(rows[0]).toHaveFocus();
    fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(rows[1]).toHaveFocus();
    fireEvent.keyDown(rows[1], { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: /Pick several/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Pick several/ }), { key: 'ArrowDown' });
    expect(rows[0]).toHaveFocus();
    fireEvent.keyDown(rows[0], { key: 'End' });
    expect(screen.getByRole('menuitem', { name: /Pick several/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /Pick several/ }), { key: 'Home' });
    expect(rows[0]).toHaveFocus();
  });

  it('selects a single track, closes the menu and returns focus to the button', () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /CPTS Track/ }));
    expect(onSelect).toHaveBeenCalledWith('cpts-path');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('marks the active row checked, focuses it on open, and offers Clear track', () => {
    const { trigger, onSelect } = setup([cpts.id]);
    fireEvent.click(trigger);
    const active = screen.getByRole('menuitemradio', { name: /CPTS Track/ });
    expect(active).toHaveAttribute('aria-checked', 'true');
    expect(active).toHaveFocus();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear track' }));
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the filter drawer from "Pick several…"', () => {
    const { trigger, onOpenMulti } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /Pick several/ }));
    expect(onOpenMulti).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the button', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getAllByRole('menuitemradio')[0], { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on an outside press', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
