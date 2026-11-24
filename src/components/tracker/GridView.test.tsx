import { describe, it, expect, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GridView } from './GridView';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const makeMachines = (count: number, prefix = 'box'): Machine[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    name: `${prefix}${i}`,
    ip: '',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
  })) as unknown as Machine[];

const cardCount = () => document.querySelectorAll('.card-enter').length;
const flush = async () => {
  for (let i = 0; i < 20; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const mount = (machines: Machine[]) =>
  render(
    <MemoryRouter>
      <GridView filteredMachines={machines} />
    </MemoryRouter>
  );

describe('GridView progressive mount', () => {
  beforeEach(() => {
    useCtfStore.setState({ activeTargetId: null, soundEnabled: false });
  });

  it('mounts a first batch, then fills the first page in small steps', async () => {
    mount(makeMachines(100));
    expect(cardCount()).toBe(6);
    expect(screen.queryByText(/Load more targets/)).toBeNull();
    await flush();
    expect(cardCount()).toBe(32);
    expect(screen.getByText(/Load more targets/).textContent).toContain('32 of 100');
  });

  it('shows a short list at once and no Load more button', () => {
    mount(makeMachines(4));
    expect(cardCount()).toBe(4);
    expect(screen.queryByText(/Load more targets/)).toBeNull();
  });

  it('adds the next page the same way after Load more', async () => {
    mount(makeMachines(100));
    await flush();
    const button = screen.getByText(/Load more targets/).closest('button') as HTMLButtonElement;
    button.focus();
    fireEvent.click(button);
    expect(cardCount()).toBe(64);
    expect(button.isConnected).toBe(true);
    expect(document.activeElement).toBe(button);
    await flush();
    expect(cardCount()).toBe(64);
    expect(screen.getByText(/Load more targets/).textContent).toContain('64 of 100');
  });

  it('starts over with a first batch when the list is swapped for one of another size', async () => {
    const { rerender } = mount(makeMachines(8, 'starter'));
    await flush();
    expect(cardCount()).toBe(8);
    rerender(
      <MemoryRouter>
        <GridView filteredMachines={makeMachines(200, 'cat')} />
      </MemoryRouter>
    );
    expect(cardCount()).toBe(6);
    await flush();
    expect(cardCount()).toBe(32);
  });

  it('keeps mounted cards when the list shrinks by one', async () => {
    const machines = makeMachines(20);
    const { rerender } = mount(machines);
    await flush();
    expect(cardCount()).toBe(20);
    rerender(
      <MemoryRouter>
        <GridView filteredMachines={machines.slice(1)} />
      </MemoryRouter>
    );
    expect(cardCount()).toBe(19);
  });

  it('restarts the batched reveal on a large change from empty', async () => {
    const { rerender } = mount([]);
    rerender(
      <MemoryRouter>
        <GridView filteredMachines={makeMachines(40)} />
      </MemoryRouter>
    );
    expect(cardCount()).toBe(6);
    await flush();
    expect(cardCount()).toBe(32);
  });
});

describe('GridView card actions', () => {
  beforeEach(() => {
    useCtfStore.setState({ activeTargetId: null, soundEnabled: false, selectedMachineId: null, reportMachineId: null });
  });

  it('keeps the hint in the more menu until it is used', () => {
    const [m] = makeMachines(1);
    mount([{ ...m, hint: 'Look at the web root' } as Machine]);
    expect(screen.queryByText('Look at the web root')).toBeNull();
    expect(screen.queryByRole('button', { name: /intel hint/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions for box0' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Peek intel hint for box0' }));
    expect(screen.getByText('Look at the web root')).toBeInTheDocument();
    expect(useCtfStore.getState().selectedMachineId).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions for box0' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hide intel hint for box0' }));
    expect(screen.queryByText('Look at the web root')).toBeNull();
  });

  it('opens the machine from the visible open button', () => {
    mount(makeMachines(1));
    fireEvent.click(screen.getByRole('button', { name: 'Open attack methodology checklist for box0' }));
    expect(useCtfStore.getState().selectedMachineId).toBe('box-0');
  });

  it('puts the other actions in a menu rendered outside the card, without selecting the card', async () => {
    mount(makeMachines(1));
    const card = document.querySelector('.cyber-card-contain') as HTMLElement;
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions for box0' }));
    const menu = screen.getByRole('menu');
    expect(card.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
    const names = screen.getAllByRole('menuitem').map((el) => el.getAttribute('aria-label'));
    expect(names).toEqual([
      'Share direct link to box0',
      'Open dedicated mission dossier for box0',
      'Open executive pentest pre-report for box0',
      'Open writeup studio for box0',
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open executive pentest pre-report for box0' }));
    expect(useCtfStore.getState().reportMachineId).toBe('box-0');
    expect(useCtfStore.getState().selectedMachineId).toBeNull();
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
