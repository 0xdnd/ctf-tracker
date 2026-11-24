import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GridCardCompact } from './GridCardCompact';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const make = (status: Machine['status']): Machine =>
  ({
    id: 'm1',
    name: 'Meow',
    ip: '10.10.10.1',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status,
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
  }) as unknown as Machine;

const noop = () => undefined;

const mount = (
  status: Machine['status'],
  onStatusChange?: (id: string, s: Machine['status']) => void,
  extra: Partial<Machine> = {},
  handlers: { onToggleUserFlag?: (id: string) => void; onToggleRootFlag?: (id: string, hasRoot: boolean) => void } = {},
) =>
  render(
    <GridCardCompact
      machine={{ ...make(status), ...extra }}
      isActiveTarget={false}
      isHintRevealed={false}
      onToggleHint={noop}
      onSelectMachine={noop}
      onToggleUserFlag={handlers.onToggleUserFlag ?? noop}
      onToggleRootFlag={handlers.onToggleRootFlag ?? noop}
      onEngageTarget={noop}
      onOpenReport={noop}
      onOpenWriteup={noop}
      onOpenDetail={noop}
      soundEnabled={false}
      onSetAssignIp={noop}
      onStatusChange={onStatusChange}
    />,
  );

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /More actions for Meow/ }));

describe('GridCardCompact stage moves', () => {
  beforeEach(() => {
    useCtfStore.setState({ soundEnabled: false });
  });

  it('offers next and previous stage in the overflow menu and reports the move', () => {
    const onStatusChange = vi.fn();
    mount('recon', onStatusChange);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Move Meow to Foothold/ }));
    expect(onStatusChange).toHaveBeenCalledWith('m1', 'foothold');
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Move Meow back to Backlog/ }));
    expect(onStatusChange).toHaveBeenCalledWith('m1', 'backlog');
  });

  it('hides "back" on the first stage and "next" on the last', () => {
    const first = mount('backlog', vi.fn());
    openMenu();
    expect(screen.queryByRole('menuitem', { name: /back to/ })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /Move Meow to Active recon/ })).toBeTruthy();
    first.unmount();
    mount('completed', vi.fn());
    openMenu();
    expect(screen.queryByRole('menuitem', { name: /Move Meow to / })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /back to System pwned/ })).toBeTruthy();
  });

  it('shows no stage items without a handler', () => {
    mount('recon');
    openMenu();
    expect(screen.queryByRole('menuitem', { name: /Move Meow/ })).toBeNull();
  });
});

describe('GridCardCompact flags and chips', () => {
  it('shows a compact two-segment pill whose state is not colour-only', () => {
    mount('foothold', undefined, { userPwnedAt: '2026-01-01T00:00:00.000Z' } as Partial<Machine>);
    const group = screen.getByRole('group', { name: 'Flags' });
    expect(group.querySelectorAll('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Toggle user flag for Meow \(currently captured\)/ }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Toggle root flag for Meow \(currently pending\)/ }).querySelector('svg')).toBeNull();
  });

  it('toggles flags from the pill and from the overflow menu', () => {
    const onUser = vi.fn();
    const onRoot = vi.fn();
    mount('recon', vi.fn(), {}, { onToggleUserFlag: onUser, onToggleRootFlag: onRoot });
    fireEvent.click(screen.getByRole('button', { name: /Toggle user flag for Meow/ }));
    expect(onUser).toHaveBeenCalledWith('m1');
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Mark root flag captured for Meow/ }));
    expect(onRoot).toHaveBeenCalledWith('m1', false);
  });

  it('offers no flags on an active (protected) box', () => {
    mount('recon', vi.fn(), { isActive: true } as Partial<Machine>);
    expect(screen.queryByRole('group', { name: 'Flags' })).toBeNull();
    openMenu();
    expect(screen.queryByRole('menuitem', { name: /flag/i })).toBeNull();
  });

  it('writes the overflow count out as "+N more" with the hidden names in the label', () => {
    mount('recon', undefined, { tags: ['smb', 'samba'] });
    const pill = screen.getByRole('button', { name: /more: / });
    expect(pill).toHaveTextContent(/^\+\d+ more$/);
    expect(pill).toHaveAttribute('aria-label', expect.stringContaining('smb'));
  });
});
